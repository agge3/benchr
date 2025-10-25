#!/usr/bin/env bash

set -x

#SOCK="${1:"fc3.vsock"}"
SOCK="fc.vsock"
rm -rvf /run/firecracker.socket
rm -rvf "$SOCK"
kill -9 $(pgrep firecracker)
CFG="config.json"
./firecracker --config-file "$CFG"
