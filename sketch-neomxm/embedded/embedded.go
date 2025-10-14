//go:build !innie && !outie

// Package embedded provides access to embedded assets for the sketch binary.
// The native binary (outie) embeds only the linux binary.
// The linux binary (innie) embeds only the webui assets.
package embedded

import (
	"io/fs"
)

// LinuxBinary returns the embedded linux binary.
func LinuxBinary(arch string) []byte {
	return nil
}

// WebUIFS returns the embedded webui filesystem for direct serving
func WebUIFS() fs.FS {
	return nil
}
