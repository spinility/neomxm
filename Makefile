# Makefile for building sketch with embedded assets
#
# Two-layer architecture:
# 1. Linux binary ("innie") - runs in container, embeds webui assets
# 2. Native binary ("outie") - runs on user's machine, embeds innie

# Allow overriding some env vars, used by GoReleaser
BUILT_BY ?= make
SKETCH_VERSION ?=
GOOS ?= $(shell go env GOOS)
GOARCH ?= $(shell go env GOARCH)

export BUILT_BY
export SKETCH_VERSION
export GOOS
export GOARCH
export LDFLAGS := -X main.builtBy=$(BUILT_BY) -X main.release=$(SKETCH_VERSION)

.PHONY: all clean outie innie webui

all: outie

outie: innie
	./build/outie.sh

innie: webui
	./build/innie.sh

webui:
	./build/webui.sh

clean:
	./build/clean.sh
