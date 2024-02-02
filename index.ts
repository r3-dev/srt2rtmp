import { $, env } from "bun";

interface IEncoderOptions {
  audioBitrate?: number;
  videoBitrate?: number;
  bufferSize?: number;
  frameRate?: number;
}

async function SendSrtToRtmp(
  srtUrl: string,
  rtmpUrl: string,
  autoInstall = true,
  encoderOptions: IEncoderOptions = {
    audioBitrate: 44100,
    videoBitrate: 8000,
    bufferSize: 16000,
    frameRate: 48,
  }
) {
  if (!srtUrl) throw new Error("SRT URL is required");
  if (!rtmpUrl) throw new Error("RTMP URL is required");

  const ffmpeg =
    await $`ffmpeg -i ${srtUrl} -ar ${encoderOptions.audioBitrate} -c:v libx264 -b:v ${encoderOptions.videoBitrate}k -bufsize ${encoderOptions.bufferSize}k  -r ${encoderOptions.frameRate} -f flv "${rtmpUrl}"`;

  if (ffmpeg.stderr !== null) {
    const error = ffmpeg.stderr.toString();

    if (error.includes("command not found: ffmpeg")) {
      if (!autoInstall) {
        throw new Error("ffmpeg is not installed");
      }

      console.log("Installing ffmpeg...");

      switch (env.OS) {
        case "darwin":
          // macOS
          await $`brew install ffmpeg`;
          break;
        case "linux":
          // Linux
          await $`sudo apt-get install ffmpeg`;
          break;
        case "windows":
          // Windows
          await $`choco install ffmpeg`;
          break;
      }

      return SendSrtToRtmp(srtUrl, rtmpUrl, false);
    }
  }

  for (const line of ffmpeg.stdout.toString()) {
    console.log(line);
  }
}

const srtUrl = env.SRT_URL;
const rtmpUrl = env.RTMP_URL;

await SendSrtToRtmp(srtUrl, rtmpUrl);
