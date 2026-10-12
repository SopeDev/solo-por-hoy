// Renders the PNG app icons from their SVG sources: `node scripts/icons.mjs`.
import sharp from "sharp";

const icons = [
  ["icon-source.svg", "icon-192.png", 192],
  ["icon-source.svg", "icon-512.png", 512],
  ["icon-maskable-source.svg", "icon-maskable-512.png", 512],
  ["icon-maskable-source.svg", "apple-touch-icon.png", 180],
  ["badge-source.svg", "badge-96.png", 96],
];

for (const [source, output, size] of icons) {
  await sharp(`public/icons/${source}`, { density: 300 }).resize(size, size).png().toFile(`public/icons/${output}`);
}
