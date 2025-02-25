#################################
# bun builder
#################################

FROM oven/bun AS bun-builder
WORKDIR /app
COPY bun.lockb .
COPY package.json .
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./index.ts --compile --outfile srt2rtmp

FROM ubuntu:22.04 AS ffmpeg-base
LABEL MAINTAINER="Eyevinn Technology <info@eyevinn.se>" 
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get -y update
RUN apt-get install -y autoconf
RUN apt-get install -y --force-yes automake
RUN apt-get install -y --force-yes build-essential
RUN apt-get install -y --force-yes pkg-config
RUN apt-get install -y --force-yes libtool
RUN apt-get install -y --force-yes wget
RUN apt-get install -y --force-yes yasm
RUN apt-get install -y --force-yes libx264-dev
RUN mkdir /root/source
RUN mkdir /root/source/ffmpeg
RUN cd /root/source/ffmpeg && \
  wget -O fdk-aac.tar.gz https://github.com/mstorsjo/fdk-aac/tarball/master && \
  tar xzvf fdk-aac.tar.gz && \
  cd mstorsjo-fdk-aac* && \
  autoreconf -fiv && \
  ./configure --disable-shared && \
  make && \
  make install && \
  make distclean
RUN apt-get install -y --force-yes git
RUN apt-get install -y --force-yes cmake
RUN apt-get install -y --force-yes python2.7
RUN mkdir -p /root/source/ffmpeg/libaom && \
  cd /root/source/ffmpeg/libaom && \
  git clone https://aomedia.googlesource.com/aom && \
  cmake ./aom && \
  make && \
  make install
RUN apt-get install -y --force-yes python3 python3-pip ninja-build
RUN pip3 install meson
RUN apt-get install -y --force-yes nasm
RUN cd /root/source/ffmpeg && \
  git clone https://code.videolan.org/videolan/dav1d.git && \
  cd dav1d && \
  meson build --buildtype release && \
  ninja -C build && \
  ninja -C build install && \
  ldconfig
RUN apt-get install -y --force-yes libvpx-dev
RUN apt-get install -y --force-yes libssl-dev
RUN apt-get install -y --force-yes tclsh
RUN cd /root/source/ffmpeg && \
  git clone https://github.com/Haivision/srt.git && \
  cd srt && \
  ./configure && \
  make && make install && \
  ldconfig
RUN apt-get install -y --force-yes libx265-dev libnuma-dev
RUN apt-get install -y --force-yes libfreetype6-dev
RUN apt-get install -y --force-yes libopus-dev
RUN apt-get install -y --force-yes openssl
RUN apt-get install -y --force-yes libssl-dev
RUN apt-get install -y --force-yes libmp3lame-dev
RUN cd /root/source/ffmpeg && \
  wget http://ffmpeg.org/releases/ffmpeg-6.0.tar.bz2 && \
  tar xjvf ffmpeg-6.0.tar.bz2 && \
  cd ffmpeg-6.0 && \
  ./configure \
    --pkg-config-flags="--static" \
    --enable-gpl \
    --enable-libfdk-aac \
    --enable-libx264 \
    --enable-libaom \
    --enable-libdav1d \
    --enable-libvpx \
    --enable-libsrt \
    --enable-libx265 \
    --enable-libfreetype \
    --enable-libopus \
    --enable-libmp3lame \
    --enable-version3 \
    --enable-openssl \
    --enable-nonfree && \
  make && \
  make install && \
  make distclean && \
  hash -r

#################################
# prodduction stage
#################################
FROM milanrodd/srt2rtmp-ffmpeg:buildx-latest AS release
COPY --from=bun-builder /app/srt2rtmp /app/
EXPOSE 3000/tcp
RUN chmod +x /app/srt2rtmp
ENTRYPOINT ["/app/srt2rtmp"]