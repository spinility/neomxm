#!/bin/bash
# Wrapper to run sketch-neomxm from /app root

cd /app/sketch-neomxm || exit 1
exec ./sketch "$@"
