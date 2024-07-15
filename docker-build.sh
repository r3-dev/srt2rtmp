docker buildx create --use
docker buildx build --push --platform linux/arm64/v8,linux/amd64 --tag milanrodd/srt2rtmp-ffmpeg:buildx-latest . -f ffmpeg-Dockerfile