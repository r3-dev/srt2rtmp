import { $, env } from "bun";

const ENCODING_PRESETS = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
] as const;

type EncodingPreset = (typeof ENCODING_PRESETS)[number];

interface IEncoderOptions {
  audioSamplingRate: number;
  videoBitrate: number;
  reconnectDelayInSeconds: number;
  inputBufferSizeInKB: number;
  bufferSize?: number;
  frameRate: number;
  preset: EncodingPreset;
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

  const srtParams = {
    recv_buffer_size: encoderOptions.inputBufferSizeInKB * 1024,
    snddropdelay: encoderOptions.reconnectDelayInSeconds * 1000 * 1000,
  };

  const srtUrlWithParams = new URL(srtUrl);
  for (const [key, value] of Object.entries(srtParams)) {
    srtUrlWithParams.searchParams.append(key, value.toString());
  }

  const args = {
    i: srtUrlWithParams.toString(),
    ar: encoderOptions.audioSamplingRate,
    cv: "libx264",
    x264opts: `nal-hrd=cbr:bframes=${encoderOptions.bframes}:keyint=${
      2 * encoderOptions.frameRate
    }:no-scenecut`,
    preset: encoderOptions.preset,
    ca: "aac",
    ba: "160k",
    bv: `${encoderOptions.videoBitrate}k`,
    bufsize: `${encoderOptions.bufferSize ?? encoderOptions.videoBitrate * 2}k`,
    filterv: `fps=${encoderOptions.frameRate}`,
    f: "flv",
  };

  const ffmpeg =
    await $`ffmpeg -re -i ${args.i} -ar ${args.ar} -c:v ${args.cv} -x264opts ${args.x264opts} -preset ${args.preset} -c:a ${args.ca} -b:a ${args.ba} -b:v ${args.bv} -bufsize ${args.bufsize} -filter:v ${args.filterv} -f ${args.f} ${rtmpUrl}`;

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

// Run in loop with 1 second delay

while (true) {
  await SendSrtToRtmp(srtUrl, rtmpUrl);
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

await SendSrtToRtmp(srtUrl, rtmpUrl);
