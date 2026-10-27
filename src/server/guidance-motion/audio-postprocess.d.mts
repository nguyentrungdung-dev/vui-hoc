export function decodeWav(buffer: Buffer): { pcm: Buffer; rate: number };
export function encodeWav(pcm: Buffer): Buffer;
export function trimQuiet(wav: Buffer): {
  wav: Buffer;
  rawSeconds: number;
  seconds: number;
  cuts: number[][];
  intervals: number[][];
};
export function assembleLesson(
  wavs: Buffer[],
  options?: {
    targetSeconds?: number;
    maxSeconds?: number;
    maxAddedHold?: number;
  },
): {
  version: string;
  duration: number;
  rawDuration: number;
  removedSilenceSeconds: number;
  wav: Buffer;
  clips: {
    wav: Buffer;
    rawSeconds: number;
    seconds: number;
    start: number;
    end: number;
    observationHoldSeconds: number;
  }[];
};
