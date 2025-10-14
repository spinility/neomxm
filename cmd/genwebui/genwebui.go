package main

import (
	"flag"
	"log"
	"os"

	"sketch.dev/webui"
)

func main() {
	flag.Parse()
	if flag.NArg() != 1 {
		log.Fatalf("expected exactly 1 arg (destination directory), got %v", flag.NArg())
	}
	dest := flag.Arg(0)
	if dest == "" {
		log.Fatalf("expected destination directory, got %q", dest)
	}
	// TODO: make webui.Build write directly to dest instead of writing to a temp dir and copying to dest
	fsys, err := webui.Build()
	if err != nil {
		log.Fatal(err)
	}
	err = os.CopyFS(dest, fsys)
	if err != nil {
		log.Fatal(err)
	}
}
