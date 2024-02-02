import { $, env } from "bun";

const presets = {
  ultrafast: "ultrafast",
  superfast: "superfast",
  veryfast: "veryfast",
  faster: "faster",
  fast: "fast",
  medium: "medium",
  slow: "slow",
  slower: "slower",
  veryslow: "veryslow",
} as const;

interface IEncoderOptions {
  audioSamplingRate: number;
  videoBitrate: number;
  reconnectDelayInSeconds: number;
  inputBufferSizeInKB: number;
  bufferSize?: number;
  frameRate: number;
  preset: (typeof presets)[keyof typeof presets];
  bframes: number;
}

async function SendSrtToRtmp(
  srtUrl: string,
  rtmpUrl: string,
  autoInstall = true,
  encoderOptions: IEncoderOptions = {
    audioSamplingRate: 44100,
    videoBitrate: 8000,
    inputBufferSizeInKB: 1024,
    reconnectDelayInSeconds: 2,
    frameRate: 48,
    preset: "superfast",
    bframes: 2,
  }
) {
  if (!srtUrl) throw new Error("SRT URL is required");
  if (!rtmpUrl) throw new Error("RTMP URL is required");

  const ffmpeg = await $`ffmpeg -re -i ${
    srtUrl +
    "&recv_buffer_size=" +
    encoderOptions.inputBufferSizeInKB * 1024 +
    "&snddropdelay=" +
    encoderOptions.reconnectDelayInSeconds * 1000 * 1000
  } -ar ${
    encoderOptions.audioSamplingRate
  } -c:v libx264 -x264opts nal-hrd=cbr:bframes=${
    encoderOptions.bframes
  }:keyint=${2 * encoderOptions.frameRate}:no-scenecut -preset ${
    encoderOptions.preset
  } -c:a aac -b:a 160k -b:v ${encoderOptions.videoBitrate}k -bufsize ${
    encoderOptions.bufferSize ?? encoderOptions.videoBitrate * 2
  }k -filter:v fps=${encoderOptions.frameRate} -f flv "${rtmpUrl}"`;

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
