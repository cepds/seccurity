import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceDir = path.join(appDir, ".photo-import", "casamento-carlos-3-001", "Casamento Carlos");
const outputRoot = path.join(appDir, "public", "assets");

const collections = {
  hero: [
    { source: "IMG_7997.jpg", output: "main.webp", width: 1920 },
    { source: "IMG_8076.jpg", output: "portrait.webp", width: 1600 },
  ],
  highlights: [
    { source: "IMG_7914.jpg", output: "hands.webp", width: 1440 },
    { source: "IMG_7921.jpg", output: "embrace.webp", width: 1440 },
    { source: "IMG_7997.jpg", output: "kiss.webp", width: 1440 },
    { source: "IMG_8019.jpg", output: "gesture.webp", width: 1440 },
  ],
  timeline: [
    { source: "IMG_7917.jpg", output: "chapter-01.webp", width: 1440 },
    { source: "IMG_7943.jpg", output: "chapter-02.webp", width: 1440 },
    { source: "IMG_8062.jpg", output: "chapter-03.webp", width: 1440 },
    { source: "IMG_8076.jpg", output: "chapter-04.webp", width: 1440 },
  ],
  gallery: [
    { source: "IMG_7917.jpg", output: "frame-01.webp", width: 1280 },
    { source: "IMG_7921.jpg", output: "frame-02.webp", width: 1280 },
    { source: "IMG_7997.jpg", output: "frame-03.webp", width: 1280 },
    { source: "IMG_8019.jpg", output: "frame-04.webp", width: 1280 },
    { source: "IMG_8076.jpg", output: "frame-05.webp", width: 1280 },
    { source: "IMG_8087.jpg", output: "frame-06.webp", width: 1280 },
  ],
  memories: [
    { source: "IMG_7914.jpg", output: "memory-01.webp", width: 1280 },
    { source: "IMG_8019.jpg", output: "memory-02.webp", width: 1280 },
    { source: "IMG_8076.jpg", output: "memory-03.webp", width: 1280 },
  ],
};

mkdirSync(outputRoot, { recursive: true });

for (const collectionName of Object.keys(collections)) {
  const collectionDir = path.join(outputRoot, collectionName);
  rmSync(collectionDir, { recursive: true, force: true });
  mkdirSync(collectionDir, { recursive: true });

  for (const entry of collections[collectionName]) {
    const input = path.join(sourceDir, entry.source);
    const output = path.join(collectionDir, entry.output);

    await sharp(input)
      .rotate()
      .resize({
        width: entry.width,
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
        effort: 5,
      })
      .toFile(output);
  }
}

rmSync(path.join(outputRoot, "photos"), { recursive: true, force: true });
rmSync(path.join(outputRoot, "assets"), { recursive: true, force: true });
