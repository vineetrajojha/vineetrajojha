import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Luminance map for ASCII art (from darkest to lightest)
// Using dense to sparse characters
const ASCII_CHARS = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];

const DEFAULT_WIDTH = 45; // Width in characters

async function imageToAscii(imagePath: string, outputPath: string, invert: boolean = false) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Invalid image dimensions.");
    }

    // Characters are typically about 2x as tall as they are wide.
    const aspectRatio = metadata.width / metadata.height;
    const height = Math.round(DEFAULT_WIDTH / aspectRatio * 0.55); // 0.55 compensates for font aspect ratio

    // Resize and convert to grayscale
    const processedImage = image.resize(DEFAULT_WIDTH, height, {
      fit: 'fill',
      kernel: sharp.kernel.nearest
    }).grayscale();

    // Get raw pixel data (1 byte per pixel for grayscale)
    const { data, info } = await processedImage.raw().toBuffer({ resolveWithObject: true });

    let asciiArt = "";

    for (let y = 0; y < info.height; y++) {
      let row = "";
      for (let x = 0; x < info.width; x++) {
        const offset = y * info.width + x;
        let luminance = data[offset];
        
        // Map 0-255 to 0-(ASCII_CHARS.length - 1)
        if (invert) {
            luminance = 255 - luminance;
        }

        const charIndex = Math.floor((luminance / 255) * (ASCII_CHARS.length - 1));
        row += ASCII_CHARS[charIndex];
      }
      asciiArt += row + "\n";
    }

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(outputPath, asciiArt, 'utf8');
    console.log(`Generated ASCII art at ${outputPath}`);
  } catch (error) {
    console.error(`Error processing image ${imagePath}:`, error);
  }
}

async function main() {
  const avatarPath = path.join(process.cwd(), 'assets', 'avatar.png');
  const darkOutputPath = path.join(process.cwd(), 'assets', 'ascii-dark.txt');
  const lightOutputPath = path.join(process.cwd(), 'assets', 'ascii-light.txt');

  // Verify avatar exists
  try {
    await fs.access(avatarPath);
  } catch {
    console.error(`Avatar image not found at ${avatarPath}. Please add an avatar.png to the assets folder.`);
    return;
  }

  // Generate for dark theme (usually background is dark, so lighter pixels should be brighter characters)
  // Our ASCII_CHARS map goes from dark to light. 
  // If we have a white background on the terminal, we want dense chars for dark pixels.
  
  console.log("Generating ASCII art for Dark theme...");
  // In a dark theme terminal, dark pixels in the image should be sparse characters, light pixels should be dense characters.
  await imageToAscii(avatarPath, darkOutputPath, false); 
  
  console.log("Generating ASCII art for Light theme...");
  // In a light theme terminal, dark pixels should be dense characters, light pixels should be sparse characters.
  await imageToAscii(avatarPath, lightOutputPath, true);
}

main();
