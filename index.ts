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
    preset: "ultrafast",
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

  const { stdout, stderr, exitCode, } = await $`ffmpeg -re -i ${args.i} -ar ${args.ar} -c:v ${args.cv} -x264opts ${args.x264opts} -preset ${args.preset} -c:a ${args.ca} -b:a ${args.ba} -b:v ${args.bv} -bufsize ${args.bufsize} -filter:v ${args.filterv} -f ${args.f} ${rtmpUrl}`
  .nothrow()
  .quiet()

  if (exitCode !== 0) {
    console.log(`Non-zero exit code ${exitCode}`);
  }


  console.log(stdout.toString());
  console.log(stderr.toString());

  Bun.sleep(1000);
    
  return SendSrtToRtmp(srtUrl, rtmpUrl);
}

const srtUrl = env.SRT_URL;
const rtmpUrl = env.RTMP_URL;

// Run in loop with 1 second delay

Bun.serve({
  fetch(req: Request): Response | Promise<Response> {
    return new Response("Hello World!");
  },
  port: process.env.PORT,
});

new Promise(() => SendSrtToRtmp(srtUrl, rtmpUrl));
