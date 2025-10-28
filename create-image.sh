#!/usr/bin/env bash

# SOURCE: https://jvns.ca/blog/2021/01/23/firecracker--start-a-vm-in-less-than-a-second/ 

IMG_ID=$(docker build -q .)
CONTAINER_ID=$(docker run -td $IMG_ID /bin/bash)

MOUNTDIR=mnt
FS=rootfs.ext4
SZ=10G

mkdir $MOUNTDIR
qemu-img create -f raw $FS "$SZ"
mkfs.ext4 $FS
mount $FS $MOUNTDIR
docker cp $CONTAINER_ID:/ $MOUNTDIR
umount $MOUNTDIR
