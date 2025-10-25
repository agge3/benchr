FROM ubuntu:24.04
RUN apt update
RUN apt upgrade -y

# gcc and toolchains
RUN apt install -y \
	gcc g++ \
	gcc-12 g++-12 \
	gcc-11 g++-11 \
	clang \
	clang-17

RUN apt install -y \
	software-properties-common \
    build-essential \
    cmake \
	git \
	vim \
	curl

# python:
# PPA repos
RUN add-apt-repository -y ppa:deadsnakes/ppa && apt update

RUN apt install -y \
	python3.12 python3.11 python3.10 python3.9	\
	python3.12-dev python3.11-dev python3.10-dev python3.9-dev	\
	python3.12-venv python3.11-venv python3.10-venv python3.9-venv

RUN apt install -y \
	openjdk-21-jdk \
	openjdk-17-jdk \
	openjdk-11-jdk

RUN apt-get install -y \
    jc

COPY init.sh /init.sh
