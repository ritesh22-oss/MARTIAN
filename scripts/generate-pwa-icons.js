import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'public', 'icon.svg');
const publicDir = path.join(rootDir, 'public');

async function generateIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error('SVG icon not found at', svgPath);
    return;
  }

  const sizes = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'pwa-maskable-512x512.png', size: 512, padding: true },
    { name: 'apple-touch-icon.png', size: 180 }
  ];

  for (const icon of sizes) {
    const outputPath = path.join(publicDir, icon.name);
    let sharpInstance = sharp(svgPath);

    if (icon.padding) {
      // Add padding for maskable icons
      sharpInstance = sharpInstance
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 3, g: 1, b: 5, alpha: 1 } // Match theme background
        })
        .extend({
          top: Math.floor(icon.size * 0.1),
          bottom: Math.floor(icon.size * 0.1),
          left: Math.floor(icon.size * 0.1),
          right: Math.floor(icon.size * 0.1),
          background: { r: 3, g: 1, b: 5, alpha: 1 }
        })
        .resize(icon.size, icon.size);
    } else {
      sharpInstance = sharpInstance.resize(icon.size, icon.size);
    }

    await sharpInstance.png().toFile(outputPath);
    console.log(`Generated ${icon.name}`);
  }
}

generateIcons().catch(console.error);
