//go:build outie

package embedded

import (
	"embed"
	_ "embed"
	"io/fs"
)

//go:embed sketch-linux/sketch-linux-amd64
var sketchLinuxBinaryAmd64 []byte

//go:embed sketch-linux/sketch-linux-arm64
var sketchLinuxBinaryArm64 []byte

// LinuxBinary returns the embedded linux binary.
func LinuxBinary(arch string) []byte {
	switch arch {
	case "amd64", "x86_64":
		return sketchLinuxBinaryAmd64
	case "arm64", "aarch64":
		return sketchLinuxBinaryArm64
	}
	return nil
}

//go:embed webui-dist
var webUIAssets embed.FS

// WebUIFS returns the embedded webui filesystem for direct serving
func WebUIFS() fs.FS {
	// TODO: can we avoid this fs.Sub somehow?
	webuiFS, _ := fs.Sub(webUIAssets, "webui-dist")
	return webuiFS
}
