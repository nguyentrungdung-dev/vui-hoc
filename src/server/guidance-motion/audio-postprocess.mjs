// Portable Node implementation for the future app path. No Python/FFmpeg and no time-stretch.
export const audioVersion = "pcm-quiet-v2";
export function decodeWav(buffer) {
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  )
    throw Error("Expected WAV");
  let format, data;
  for (let at = 12; at + 8 <= buffer.length;) {
    const id = buffer.toString("ascii", at, at + 4),
      size = buffer.readUInt32LE(at + 4);
    if (at + 8 + size > buffer.length) throw Error("Truncated WAV");
    if (id === "fmt ")
      format = {
        codec: buffer.readUInt16LE(at + 8),
        channels: buffer.readUInt16LE(at + 10),
        rate: buffer.readUInt32LE(at + 12),
        bits: buffer.readUInt16LE(at + 22),
      };
    if (id === "data") data = buffer.subarray(at + 8, at + 8 + size);
    at += 8 + size + (size % 2);
  }
  if (
    !format ||
    format.codec !== 1 ||
    format.channels !== 1 ||
    format.rate !== 24000 ||
    format.bits !== 16 ||
    !data ||
    data.length % 2
  )
    throw Error("Expected PCM16 mono 24kHz");
  return { pcm: data, rate: 24000 };
}
export function encodeWav(pcm) {
  const b = Buffer.alloc(44 + pcm.length);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24);
  b.writeUInt32LE(48000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(pcm.length, 40);
  pcm.copy(b, 44);
  return b;
}
export function detectQuiet(pcm, { db = -42, minSeconds = 0.25 } = {}) {
  const threshold = 32768 * Math.pow(10, db / 20),
    intervals = [];
  let begin = null;
  const count = pcm.length / 2;
  for (let i = 0; i < count; i++) {
    if (Math.abs(pcm.readInt16LE(i * 2)) <= threshold) {
      if (begin === null) begin = i;
    } else if (begin !== null) {
      if ((i - begin) / 24000 >= minSeconds)
        intervals.push([begin / 24000, i / 24000]);
      begin = null;
    }
  }
  if (begin !== null && (count - begin) / 24000 >= minSeconds)
    intervals.push([begin / 24000, count / 24000]);
  return intervals;
}
export function trimQuiet(wav) {
  const { pcm, rate } = decodeWav(wav),
    duration = pcm.length / 2 / rate,
    intervals = detectQuiet(pcm),
    cuts = [];
  for (const [start, end] of intervals) {
    if (start <= 0.12) {
      if (end - start > 1.0) cuts.push([start + 0.1, end]);
    } else if (end >= duration - 0.15) {
      if (end - start > 1.8) cuts.push([start + 0.6, end]);
    } else if (end - start > 2.5) cuts.push([start + 0.45, end - 0.45]);
  }
  const parts = [];
  let cursor = 0;
  for (const [a, b] of cuts) {
    const start = Math.max(cursor, Math.round(a * rate) * 2),
      end = Math.min(pcm.length, Math.round(b * rate) * 2);
    if (end > start) {
      parts.push(pcm.subarray(cursor, start));
      cursor = end;
    }
  }
  parts.push(pcm.subarray(cursor));
  const output = Buffer.concat(parts);
  return {
    wav: encodeWav(output),
    rawSeconds: duration,
    seconds: output.length / 2 / rate,
    cuts,
    intervals,
  };
}
export function assembleLesson(
  wavs,
  { targetSeconds = 50, maxSeconds = 55, maxAddedHold = 2 } = {},
) {
  const clean = wavs.map(trimQuiet);
  let seconds = clean.reduce((n, c) => n + c.seconds, 0);
  if (seconds > maxSeconds)
    throw Error(
      "Narration is too long; shorten the script, do not accelerate voice",
    );
  let missing = Math.max(0, Math.round((targetSeconds - seconds) * 24000));
  if (missing > Math.floor(maxAddedHold * 24000) * clean.length)
    throw Error("Narration too short for natural observation holds");
  const holds = clean.map(() => 0);
  for (let i = 0; i < clean.length; i++) {
    const n = Math.min(
      Math.floor(maxAddedHold * 24000),
      Math.round(missing / (clean.length - i)),
    );
    holds[i] = n;
    missing -= n;
  }
  let cursor = 0;
  const clips = clean.map((c, i) => {
    const { pcm } = decodeWav(c.wav);
    const padded = Buffer.concat([pcm, Buffer.alloc(holds[i] * 2)]);
    const seconds = padded.length / 48000;
    const result = {
      ...c,
      wav: encodeWav(padded),
      seconds,
      start: cursor,
      end: cursor + seconds,
      observationHoldSeconds: holds[i] / 24000,
    };
    cursor += seconds;
    return result;
  });
  return {
    version: audioVersion,
    duration: cursor,
    rawDuration: clean.reduce((n, c) => n + c.rawSeconds, 0),
    removedSilenceSeconds: clean.reduce(
      (n, c) => n + c.rawSeconds - c.seconds,
      0,
    ),
    clips,
    wav: encodeWav(Buffer.concat(clips.map((c) => decodeWav(c.wav).pcm))),
  };
}
