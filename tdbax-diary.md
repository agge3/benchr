```bash
MYUSER="admin"
useradd -m "$MY_USER"
usermod -aG sudo admin


apt install -y 
    neovim
    curl
    build-essential
    gcc
    g++
    cmake
    git
```

first vps didnt have kvm support (nested virtualizer), so pivoted to DO instead,
which has nested virtualizer. could have used metal, but pricey

couldnt build linux kernel on macos (need x86). had a server, but without kvm
enabled. DO wouldnt allow enough cores for compile of linux kernel. home vpn
wouldnt connect to dev station because of shakey ssh to compile on dev machine.
deployed multiple cloud vps until finally a build machine. built linux kernel on
build machine, with perf tied to kernel (kernel needs correct perf), export
kernel into repo (bad practice, but we dont have a build machine!)

repo split because of www hosting, caused split db and a ton of errors. solution: symlink first and then fix later

## dep
