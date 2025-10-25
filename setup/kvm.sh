#!/usr/bin/env bash
lsmod | grep kvm

modprobe kvm
modprobe kvm_intel
modprobe kvm_amd

getent group kvm
