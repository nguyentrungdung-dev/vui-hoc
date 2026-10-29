// Regenerate tab / home-screen icons from the single approved product mark.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
const source = await readFile(
  new URL("../public/brand/vui-hoc-logo.svg", import.meta.url),
);
await writeFile(new URL("../src/app/icon.svg", import.meta.url), source);
await writeFile(
  new URL("../src/app/apple-icon.png", import.meta.url),
  await sharp(source).resize(180, 180).png().toBuffer(),
);
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()),
);
const directory = Buffer.alloc(6 + 16 * sizes.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
images.forEach((bytes, index) => {
  const cursor = 6 + 16 * index;
  directory[cursor] = directory[cursor + 1] = sizes[index];
  directory.writeUInt16LE(1, cursor + 4);
  directory.writeUInt16LE(32, cursor + 6);
  directory.writeUInt32LE(bytes.length, cursor + 8);
  directory.writeUInt32LE(offset, cursor + 12);
  offset += bytes.length;
});
await writeFile(
  new URL("../src/app/favicon.ico", import.meta.url),
  Buffer.concat([directory, ...images]),
);
console.log(
  "Generated SVG, ICO (16/32/48), and Apple icon from the approved Vui học logo.",
);
