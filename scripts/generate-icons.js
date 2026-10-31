
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';

const sourceIcon = './public/assets/aistudio/Mars_Rover_Orbital_Badge_162da0d6.png';
const outputDir = './assets';

async function generateIcons() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating resized PNGs...');
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  
  for (const size of sizes) {
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(path.join(outputDir, `icon_${size}.png`));
  }

  console.log('Generating .ico file...');
  // png-to-ico takes an array of file paths or a single path
  // It works best with a list of PNGs of different sizes
  const pngsForIco = [
    path.join(outputDir, 'icon_16.png'),
    path.join(outputDir, 'icon_32.png'),
    path.join(outputDir, 'icon_48.png'),
    path.join(outputDir, 'icon_256.png')
  ];
  
  const icoBuffer = await pngToIco(pngsForIco);
  fs.writeFileSync(path.join(outputDir, 'marsnav-icon.ico'), icoBuffer);

  // For .icns, it's harder without a dedicated tool, but we can at least provide the 1024px PNG
  // which many tools (including Pake/Tauri) can use to generate the app bundle.
  // However, I'll try to name it .icns or just provide the 1024px version as requested.
  // Actually, I'll just copy the 1024px one to marsnav-icon.png for Pake.
  fs.copyFileSync(path.join(outputDir, 'icon_1024.png'), path.join(outputDir, 'marsnav-icon.png'));

  console.log('Icons generated successfully in ./assets');
}

generateIcons().catch(console.error);
