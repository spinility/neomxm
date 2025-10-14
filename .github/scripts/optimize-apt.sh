#!/bin/bash
set -e

# Skip installing package docs (makes the man-db trigger much faster)
# (I disabled `/doc` and `/info` too, just in case.)
sudo tee /etc/dpkg/dpkg.cfg.d/01_nodoc > /dev/null << 'EOF'
path-exclude /usr/share/doc/*
path-exclude /usr/share/man/*
path-exclude /usr/share/info/*
EOF

# Disable automatic man-db updates which can slow down apt operations
sudo debconf-set-selections <<< "man-db man-db/auto-update boolean false"
sudo rm -f /var/lib/man-db/auto-update

echo "APT optimization configured - documentation installation disabled and man-db auto-update disabled"
