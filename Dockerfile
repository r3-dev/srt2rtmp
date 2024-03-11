
# TODO: REBUILD IMAGE FOR ALPINE
# https://pkgs.alpinelinux.org/packages

FROM ubuntu:20.04 AS base-ubuntu

RUN apt-get -qq update && apt-get -qq upgrade

ENV FFMPEG_VERSION snapshot

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Moscow

ENV LD_LIBRARY_PATH=/usr/local/lib

RUN apt-get -qq install git wget tclsh pkg-config cmake libssl-dev build-essential librtmp-dev yasm ca-certificates openssl libpcre3-dev x264 nasm libx264-dev

# Install libsrt.
RUN git clone https://github.com/Haivision/srt /tmp/build/srt

WORKDIR /tmp/build/srt
RUN ./configure
RUN make -j $(getconf _NPROCESSORS_ONLN)
RUN make install
WORKDIR /

# Install ffmpeg.
RUN mkdir -p /tmp/build/ffmpeg && \
    cd /tmp/build/ffmpeg && \
    wget -O ffmpeg-snapshot.tar.bz2 https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.bz2 && \
    tar xjvf ffmpeg-snapshot.tar.bz2

WORKDIR /tmp/build/ffmpeg/ffmpeg
RUN ./configure --enable-libsrt --enable-librtmp --enable-libx264 --enable-gpl
RUN make -j $(getconf _NPROCESSORS_ONLN)
RUN make install
WORKDIR /

###########################




FROM oven/bun:alpine AS builder
WORKDIR /app
COPY bun.lockb .
COPY package.json .
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./index.ts --compile --outfile srt2rtmp

###########################


# copy production dependencies and source code into final image
FROM base AS release
WORKDIR /app
COPY --from=builder /app/srt2rtmp /app/srt2rtmp
EXPOSE 3000/tcp
RUN chmod +x /app/srt2rtmp
CMD ["/app/srt2rtmp"]