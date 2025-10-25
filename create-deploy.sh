#!/usr/bin/env bash

MOUNTDIR=mnt
FS=deploy.ext4
SZ=1M

mkdir $MOUNTDIR
qemu-img create -f raw $FS "$SZ"
mkfs.ext4 $FS
mount $FS $MOUNTDIR
cp agent.py execute.sh config.json vm_config.json env.py serializer.py $MOUNTDIR
umount $MOUNTDIR
