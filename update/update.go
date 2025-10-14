package update

import (
	"context"
	"crypto/ed25519"
	"crypto/x509"
	_ "embed"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"runtime"
	"strings"
	"sync"

	"github.com/Masterminds/semver/v3"
	"github.com/fynelabs/selfupdate"
)

//go:embed ed25519.pem
var publicKeyPEM string

// publicKey returns the parsed Ed25519 public key for signature verification
var publicKey = sync.OnceValue(func() ed25519.PublicKey {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		panic("failed to decode PEM block containing public key")
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		panic(fmt.Sprintf("failed to parse public key: %v", err))
	}
	key, ok := pub.(ed25519.PublicKey)
	if !ok {
		panic(fmt.Sprintf("not an ed25519 public key: %T", pub))
	}
	return key
})

// Do updates sketch in-place.
func Do(ctx context.Context, currentVersion, binaryPath string) error {
	fmt.Printf("Current version: %s. Checking for updates...\n", currentVersion)

	currentVer, err := semver.NewVersion(currentVersion)
	if err != nil {
		return fmt.Errorf("could not parse current version %q as semver: %w", currentVersion, err)
	}

	source := &ghSource{currentVer: currentVer}
	if err := source.initialize(ctx); err != nil {
		return err
	}

	if !source.latestVer.GreaterThan(currentVer) {
		fmt.Printf("%s is up to date.\n", currentVersion)
		return nil
	}
	fmt.Printf("Updating to %s...\n", source.latestVer)

	if err := selfupdate.ManualUpdate(source, publicKey()); err != nil {
		return fmt.Errorf("failed to perform update: %w", err)
	}
	fmt.Printf("Updated to %s.\n", source.latestVer)
	return nil
}

// ghSource implements selfupdate.Source for sketch GitHub releases
type ghSource struct {
	currentVer *semver.Version
	latestVer  *semver.Version
	asset      ghAsset
	signature  [64]byte
}

// ghRelease represents a GitHub release
type ghRelease struct {
	TagName string    `json:"tag_name"`
	Assets  []ghAsset `json:"assets"`
}

// ghAsset represents a release asset
type ghAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

// initialize fetches the latest release information if not already done
func (gs *ghSource) initialize(ctx context.Context) error {
	url := "https://api.github.com/repos/boldsoftware/sketch/releases/latest"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch release info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	var release ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return fmt.Errorf("failed to decode release info: %w", err)
	}

	gs.latestVer, err = semver.NewVersion(release.TagName)
	if err != nil {
		return fmt.Errorf("invalid latest version %q: %w", release.TagName, err)
	}

	// Find the appropriate asset for current platform
	gs.asset, err = gs.assetForPlatform(release, runtime.GOOS, runtime.GOARCH)
	if err != nil {
		return fmt.Errorf("failed to find asset for current platform: %w", err)
	}

	// Download and parse the signature
	if err := gs.downloadSignature(ctx); err != nil {
		return fmt.Errorf("failed to download signature: %w", err)
	}
	return nil
}

// assetForPlatform finds the appropriate asset for the given platform
func (gs *ghSource) assetForPlatform(release ghRelease, goos, goarch string) (ghAsset, error) {
	for _, asset := range release.Assets {
		if strings.HasSuffix(asset.Name, goos+"_"+goarch) {
			return asset, nil
		}
	}
	return ghAsset{}, fmt.Errorf("no asset found for platform %s/%s", goos, goarch)
}

// downloadSignature downloads and parses the signature file
func (gs *ghSource) downloadSignature(ctx context.Context) error {
	sigURL := gs.asset.BrowserDownloadURL + ".ed25519"
	req, err := http.NewRequestWithContext(ctx, "GET", sigURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create signature request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to download signature: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code for signature: %d", resp.StatusCode)
	}
	_, err = io.ReadFull(resp.Body, gs.signature[:])
	if err != nil {
		return fmt.Errorf("failed to read signature data: %w", err)
	}
	return nil
}

// Get downloads the binary for the specified version
func (gs *ghSource) Get(v *selfupdate.Version) (io.ReadCloser, int64, error) {
	req, err := http.NewRequest("GET", gs.asset.BrowserDownloadURL, nil)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create download request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to download binary: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, 0, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	return resp.Body, gs.asset.Size, nil
}

// GetSignature returns the signature for the binary
func (gs *ghSource) GetSignature() ([64]byte, error) {
	return gs.signature, nil
}

// LatestVersion returns the latest version available
func (gs *ghSource) LatestVersion() (*selfupdate.Version, error) {
	return &selfupdate.Version{Number: gs.latestVer.String()}, nil
}
