//go:build innie

package embedded

import (
	"embed"
	"io/fs"
)

//go:embed webui-dist
var webUIAssets embed.FS

// LinuxBinary returns the embedded linux binary.
func LinuxBinary(arch string) []byte {
	return nil
}

// WebUIFS returns the embedded webui filesystem for direct serving
func WebUIFS() fs.FS {
	// TODO: can we avoid this fs.Sub somehow?
	webuiFS, _ := fs.Sub(webUIAssets, "webui-dist")
	return webuiFS
}
