import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { prepareDesktopIcons } from "./prepare-desktop-icons.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "assets/brand/rtnote-icon.svg");
const adaptiveForegroundSourcePath = path.join(projectRoot, "apps/mobile/assets/adaptive-icon-foreground.svg");
const adaptiveTransparentSourcePath = path.join(projectRoot, "apps/mobile/assets/adaptive-icon-transparent.svg");
const source = await readFile(sourcePath);
const adaptiveForegroundSource = await readFile(adaptiveForegroundSourcePath);
const adaptiveTransparentSource = await readFile(adaptiveTransparentSourcePath);

await copyFile(sourcePath, path.join(projectRoot, "apps/web/public/favicon.svg"));

const pngTargets = [
  ["apps/web/public/pwa-192x192.png", 192, { preserveAlpha: true }],
  ["apps/web/public/pwa-512x512.png", 512, { preserveAlpha: true }],
  ["apps/web/public/maskable-icon-512x512.png", 512, { background: "#f26b1d" }],
  ["apps/web/public/apple-touch-icon.png", 180, { background: "#f26b1d" }],
  ["apps/mobile/assets/icon.png", 512, { background: "#f26b1d" }],
  ["apps/ios/EdgeEver/Resources/Assets.xcassets/AppIcon.appiconset/icon.png", 1024, { background: "#f26b1d" }],
  ["apps/extension/public/icons/icon-16.png", 16, { preserveAlpha: true }],
  ["apps/extension/public/icons/icon-32.png", 32, { preserveAlpha: true }],
  ["apps/extension/public/icons/icon-48.png", 48, { preserveAlpha: true }],
  ["apps/extension/public/icons/icon-128.png", 128, { preserveAlpha: true }],
];

const renderPng = async (input, destination, size, { preserveAlpha = false, background = "#f26b1d" } = {}) => {
  const outputPath = path.join(projectRoot, destination);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const pipeline = sharp(input, { density: 384 }).resize(size, size, {
    fit: "contain",
    kernel: sharp.kernel.lanczos3,
  });
  if (!preserveAlpha) {
    pipeline.flatten({ background }).removeAlpha();
  }
  await pipeline.png({ compressionLevel: 9 }).toFile(outputPath);
};

for (const [destination, size, options] of pngTargets) {
  await renderPng(source, destination, size, options);
}

await renderPng(adaptiveForegroundSource, "apps/mobile/assets/adaptive-icon-foreground.png", 1024, {
  preserveAlpha: true,
});
await renderPng(adaptiveTransparentSource, "apps/mobile/assets/adaptive-icon-transparent.png", 1024, {
  preserveAlpha: true,
});

await prepareDesktopIcons();
console.log("[prepare-brand-icons] updated shared brand icons");
