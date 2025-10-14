package dockerimg

import (
	"crypto/sha256"
	_ "embed" // Using underscore import to keep embed package for go:embed directive
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// DefaultImage is intended to ONLY be used by the pushdockerimg.go script.
func DefaultImage() (name, dockerfile, tag string) {
	return dockerImgName, dockerfileBase, dockerfileBaseHash()
}

const (
	dockerImgRepo = "boldsoftware/sketch"
	dockerImgName = "ghcr.io/" + dockerImgRepo
)

func dockerfileBaseHash() string {
	h := sha256.New()
	io.WriteString(h, dockerfileBase)
	return hex.EncodeToString(h.Sum(nil))[:32]
}

//go:embed Dockerfile.base
var dockerfileBaseData []byte

// dockerfileBase is the content of the base Dockerfile
var dockerfileBase = string(dockerfileBaseData)

func readPublishedTags() ([]string, error) {
	req, err := http.NewRequest("GET", "https://ghcr.io/token?service=ghcr.io&scope=repository:"+dockerImgRepo+":pull", nil)
	if err != nil {
		return nil, fmt.Errorf("token: %w", err)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token: %w", err)
	}
	body, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil || res.StatusCode != 200 {
		return nil, fmt.Errorf("token: %d: %s: %w", res.StatusCode, body, err)
	}
	var tokenBody struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(body, &tokenBody); err != nil {
		return nil, fmt.Errorf("token: %w: %s", err, body)
	}

	req, err = http.NewRequest("GET", "https://ghcr.io/v2/"+dockerImgRepo+"/tags/list", nil)
	if err != nil {
		return nil, fmt.Errorf("tags: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+tokenBody.Token)
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tags: %w", err)
	}
	body, err = io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil || res.StatusCode != 200 {
		return nil, fmt.Errorf("tags: %d: %s: %w", res.StatusCode, body, err)
	}
	var tags struct {
		Tags []string `json:"tags"`
	}
	if err := json.Unmarshal(body, &tags); err != nil {
		return nil, fmt.Errorf("tags: %w: %s", err, body)
	}
	return tags.Tags, nil
}

func checkTagExists(tag string) error {
	tags, err := readPublishedTags()
	if err != nil {
		return fmt.Errorf("check tag exists: %w", err)
	}
	for _, t := range tags {
		if t == tag {
			return nil // found it
		}
	}
	return fmt.Errorf("check tag exists: %q not found in %v", tag, tags)
}
