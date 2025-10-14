package skabandclient

import (
	"bufio"
	"context"
	"crypto/ed25519"
	crand "crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math/rand/v2"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/richardlehane/crock32"
	"golang.org/x/net/http2"
)

// SkabandClient provides HTTP client functionality for skaband server
type SkabandClient struct {
	addr      string
	publicKey string
	client    *http.Client
}

func DialAndServe(ctx context.Context, hostURL, sessionID, clientPubKey string, sessionSecret string, h http.Handler) (err error) {
	// Connect to the server.
	var conn net.Conn
	if strings.HasPrefix(hostURL, "https://") {
		u, err := url.Parse(hostURL)
		if err != nil {
			return err
		}
		port := u.Port()
		if port == "" {
			port = "443"
		}
		dialer := tls.Dialer{}
		conn, err = dialer.DialContext(ctx, "tcp4", u.Host+":"+port)
	} else if strings.HasPrefix(hostURL, "http://") {
		dialer := net.Dialer{}
		conn, err = dialer.DialContext(ctx, "tcp4", strings.TrimPrefix(hostURL, "http://"))
	} else {
		return fmt.Errorf("skabandclient.Dial: bad url, needs to be http or https: %s", hostURL)
	}
	if err != nil {
		return fmt.Errorf("skabandclient: %w", err)
	}
	if conn == nil {
		return fmt.Errorf("skabandclient: nil connection")
	}
	defer conn.Close()

	// "Upgrade" our connection, like a WebSocket does.
	req, err := http.NewRequest("POST", hostURL+"/attach", nil)
	if err != nil {
		return fmt.Errorf("skabandclient.Dial: /attach: %w", err)
	}
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "ska")
	req.Header.Set("Session-ID", sessionID)
	req.Header.Set("Public-Key", clientPubKey)
	req.Header.Set("Session-Secret", sessionSecret)

	if err := req.Write(conn); err != nil {
		return fmt.Errorf("skabandclient.Dial: write upgrade request: %w", err)
	}
	reader := bufio.NewReader(conn)
	resp, err := http.ReadResponse(reader, req)
	if err != nil {
		if resp != nil {
			b, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("skabandclient.Dial: read upgrade response: %w: %s", err, b)
		} else {
			return fmt.Errorf("skabandclient.Dial: read upgrade response: %w", err)
		}
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusSwitchingProtocols {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("skabandclient.Dial: unexpected status code: %d: %s", resp.StatusCode, b)
	}
	if !strings.Contains(resp.Header.Get("Upgrade"), "ska") {
		return errors.New("skabandclient.Dial: server did not upgrade to ska protocol")
	}
	if buf := reader.Buffered(); buf > 0 {
		peek, _ := reader.Peek(buf)
		return fmt.Errorf("skabandclient.Dial: buffered read after upgrade response: %d: %q", buf, string(peek))
	}

	// Send Magic.
	const magic = "skaband\n"
	if _, err := conn.Write([]byte(magic)); err != nil {
		return fmt.Errorf("skabandclient.Dial: failed to send upgrade init message: %w", err)
	}

	// We have a TCP connection to the server and have been through the upgrade dance.
	// Now we can run an HTTP server over that connection ("inverting" the HTTP flow).
	// Skaband is expected to heartbeat within 60 seconds.
	lastHeartbeat := time.Now()
	mu := sync.Mutex{}
	go func() {
		for {
			time.Sleep(5 * time.Second)
			mu.Lock()
			if time.Since(lastHeartbeat) > 60*time.Second {
				mu.Unlock()
				conn.Close()
				slog.Info("skaband heartbeat timeout")
				return
			}
			mu.Unlock()
		}
	}()
	server := &http2.Server{}
	h2 := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/skabandheartbeat" {
			w.WriteHeader(http.StatusOK)
			mu.Lock()
			defer mu.Unlock()
			lastHeartbeat = time.Now()
		}
		h.ServeHTTP(w, r)
	})
	server.ServeConn(conn, &http2.ServeConnOpts{
		Handler: h2,
	})

	return nil
}

func decodePrivKey(privData []byte) (ed25519.PrivateKey, error) {
	privBlock, _ := pem.Decode(privData)
	if privBlock == nil || privBlock.Type != "PRIVATE KEY" {
		return nil, fmt.Errorf("no valid private key block found")
	}
	parsedPriv, err := x509.ParsePKCS8PrivateKey(privBlock.Bytes)
	if err != nil {
		return nil, err
	}
	return parsedPriv.(ed25519.PrivateKey), nil
}

func encodePrivateKey(privKey ed25519.PrivateKey) ([]byte, error) {
	privBytes, err := x509.MarshalPKCS8PrivateKey(privKey)
	if err != nil {
		return nil, err
	}
	return pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privBytes}), nil
}

func LoadOrCreatePrivateKey(path string) (ed25519.PrivateKey, error) {
	privData, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		_, privKey, err := ed25519.GenerateKey(crand.Reader)
		if err != nil {
			return nil, err
		}
		b, err := encodePrivateKey(privKey)
		if err != nil {
			return nil, err
		}
		if err := os.WriteFile(path, b, 0o600); err != nil {
			return nil, err
		}
		return privKey, nil
	} else if err != nil {
		return nil, fmt.Errorf("read key failed: %w", err)
	}
	key, err := decodePrivKey(privData)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	return key, nil
}

// Login connects to skaband and authenticates the user.
// If skabandAddr is empty, it returns the public key without contacting a server.
// It is the caller's responsibility to set the API URL and key in this case.
func Login(stdout io.Writer, privKey ed25519.PrivateKey, skabandAddr, sessionID, model string) (pubKey, apiURL, oaiModelName, apiKey string, err error) {
	sig := ed25519.Sign(privKey, []byte(sessionID))
	pubKey = hex.EncodeToString(privKey.Public().(ed25519.PublicKey))
	if skabandAddr == "" {
		return pubKey, "", "", "", nil
	}

	req, err := http.NewRequest("POST", skabandAddr+"/authclient", nil)
	if err != nil {
		return "", "", "", "", err
	}
	req.Header.Set("Public-Key", pubKey)
	req.Header.Set("Session-ID", sessionID)
	req.Header.Set("Session-ID-Sig", hex.EncodeToString(sig))
	req.Header.Set("X-Model", model)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", "", "", fmt.Errorf("skaband login: %w", err)
	}
	apiURL = resp.Header.Get("X-API-URL")
	apiKey = resp.Header.Get("X-API-Key")
	oaiModelName = resp.Header.Get("X-OAI-Model")
	defer resp.Body.Close()
	_, err = io.Copy(stdout, resp.Body)
	if err != nil {
		return "", "", "", "", fmt.Errorf("skaband login: %w", err)
	}
	if resp.StatusCode != 200 {
		return "", "", "", "", fmt.Errorf("skaband login failed: %d", resp.StatusCode)
	}
	if apiURL == "" {
		return "", "", "", "", fmt.Errorf("skaband returned no api url")
	}
	if apiKey == "" {
		return "", "", "", "", fmt.Errorf("skaband returned no api key")
	}
	return pubKey, apiURL, oaiModelName, apiKey, nil
}

func DefaultKeyPath(skabandAddr string) string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}
	cacheDir := filepath.Join(homeDir, ".cache", "sketch")
	if skabandAddr != "https://sketch.dev" { // main server gets "root" cache dir, for backwards compatibility
		h := sha256.Sum256([]byte(skabandAddr))
		cacheDir = filepath.Join(cacheDir, hex.EncodeToString(h[:8]))
	}
	os.MkdirAll(cacheDir, 0o777)
	return filepath.Join(cacheDir, "sketch.ed25519")
}

func LocalhostToDockerInternal(skabandURL string) (string, error) {
	u, err := url.Parse(skabandURL)
	if err != nil {
		return "", fmt.Errorf("localhostToDockerInternal: %w", err)
	}
	switch u.Hostname() {
	case "localhost", "127.0.0.1":
		host := "host.docker.internal"
		if port := u.Port(); port != "" {
			host += ":" + port
		}
		u.Host = host
		return u.String(), nil
	}
	return skabandURL, nil
}

// NewSessionID generates a new 10-byte random Session ID.
func NewSessionID() string {
	u1, u2 := rand.Uint64(), rand.Uint64N(1<<16)
	s := crock32.Encode(u1) + crock32.Encode(uint64(u2))
	if len(s) < 16 {
		s += strings.Repeat("0", 16-len(s))
	}
	return s[0:4] + "-" + s[4:8] + "-" + s[8:12] + "-" + s[12:16]
}

// Regex pattern for SessionID format: xxxx-xxxx-xxxx-xxxx
// Where x is a valid Crockford Base32 character (0-9, A-H, J-N, P-Z)
// Case-insensitive match
var sessionIdRegexp = regexp.MustCompile(
	"^[0-9A-HJ-NP-Za-hj-np-z]{4}-[0-9A-HJ-NP-Za-hj-np-z]{4}-[0-9A-HJ-NP-Za-hj-np-z]{4}-[0-9A-HJ-NP-Za-hj-np-z]{4}")

func ValidateSessionID(sessionID string) bool {
	return sessionIdRegexp.MatchString(sessionID)
}

// Addr returns the skaband server address
func (c *SkabandClient) Addr() string {
	if c == nil {
		return ""
	}
	return c.addr
}

// NewSkabandClient creates a new skaband client
func NewSkabandClient(addr, publicKey string) *SkabandClient {
	// Apply localhost-to-docker-internal transformation if needed
	if _, err := os.Stat("/.dockerenv"); err == nil { // inDocker
		if newAddr, err := LocalhostToDockerInternal(addr); err == nil {
			addr = newAddr
		}
	}

	return &SkabandClient{
		addr:      addr,
		publicKey: publicKey,
		client:    &http.Client{Timeout: 30 * time.Second},
	}
}

// DialAndServeLoop is a redial loop around DialAndServe.
func (c *SkabandClient) DialAndServeLoop(ctx context.Context, sessionID string, sessionSecret string, srv http.Handler, connectFn func(connected bool)) {
	skabandAddr := c.addr
	clientPubKey := c.publicKey

	if _, err := os.Stat("/.dockerenv"); err == nil { // inDocker
		if addr, err := LocalhostToDockerInternal(skabandAddr); err == nil {
			skabandAddr = addr
		}
	}

	var skabandConnected atomic.Bool
	skabandHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/skabandinit" {
			b, err := io.ReadAll(r.Body)
			if err != nil {
				fmt.Printf("skabandinit failed: %v\n", err)
				return
			}
			m := map[string]string{}
			if err := json.Unmarshal(b, &m); err != nil {
				fmt.Printf("skabandinit failed: %v\n", err)
				return
			}
			skabandConnected.Store(true)
			if connectFn != nil {
				connectFn(true)
			}
			return
		}
		srv.ServeHTTP(w, r)
	})

	var lastErrLog time.Time
	for {
		if err := DialAndServe(ctx, skabandAddr, sessionID, clientPubKey, sessionSecret, skabandHandler); err != nil {
			// NOTE: *just* backoff the logging. Backing off dialing
			// is bad UX. Doing so saves negligible CPU and doing so
			// without hurting UX requires interrupting the backoff with
			// wake-from-sleep and network-up events from the OS,
			// which are a pain to plumb.
			if time.Since(lastErrLog) > 1*time.Minute {
				slog.DebugContext(ctx, "skaband connection failed", "err", err)
				lastErrLog = time.Now()
			}
		}
		if skabandConnected.CompareAndSwap(true, false) {
			if connectFn != nil {
				connectFn(false)
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
}
