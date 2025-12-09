import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

/**
 * Simple chroma-key green screen removal
 * Converts green pixels to transparent
 */
export async function removeGreenScreen(inputPath: string, outputPath: string): Promise<void> {
  // Read image and get raw RGBA buffer
  const image = sharp(inputPath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = new Uint8ClampedArray(data);

  // Green screen color thresholds (adjustable)
  // Typical green screen RGB values are around (0, 177, 64) or similar
  const greenThreshold = {
    rMin: 0,
    rMax: 100,
    gMin: 120,
    gMax: 255,
    bMin: 0,
    bMax: 120,
  };

  // Process each pixel
  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = channels === 4 ? pixels[i + 3] : 255;

    // Check if pixel is in green range
    const isGreen =
      r >= greenThreshold.rMin &&
      r <= greenThreshold.rMax &&
      g >= greenThreshold.gMin &&
      g <= greenThreshold.gMax &&
      b >= greenThreshold.bMin &&
      b <= greenThreshold.bMax;

    if (isGreen) {
      // Make pixel transparent
      if (channels === 4) {
        pixels[i + 3] = 0;
      }
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Write processed image
  await sharp(pixels, {
    raw: {
      width,
      height,
      channels: channels === 4 ? 4 : 4, // Always output RGBA
    },
  })
    .png()
    .toFile(outputPath);
}

