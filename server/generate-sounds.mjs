import { writeFileSync } from "node:fs";
const cues = {
  turn: [660, 990],
  card: [350, 525],
  money: [880, 1108, 1320],
  deal: [523, 659, 784],
  victory: [523, 659, 784, 1046],
};
for (const [name, notes] of Object.entries(cues)) {
  const rate = 22050,
    duration = name === "victory" ? 1.1 : 0.36,
    count = Math.floor(rate * duration),
    buffer = Buffer.alloc(44 + count * 2);
  buffer.write("RIFF");
  buffer.writeUInt32LE(36 + count * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    let sample = 0;
    notes.forEach((f, j) => {
      const local = t - j * 0.055;
      if (local >= 0)
        sample +=
          Math.sin(2 * Math.PI * f * local) *
          Math.exp(-7 * local) *
          Math.min(1, local * 100);
    });
    buffer.writeInt16LE(Math.round((sample * 6500) / notes.length), 44 + i * 2);
  }
  writeFileSync(
    new URL(`../public/sounds/${name}.wav`, import.meta.url),
    buffer,
  );
}
