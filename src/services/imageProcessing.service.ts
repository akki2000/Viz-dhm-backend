import sharp from "sharp";
import { removeGreenScreen } from "../utils/greenScreen";
import { getForegroundPath, getCompositedPath, getBackgroundPath } from "../utils/filePaths";
import { JobMode } from "../types/jobTypes";
import fs from "fs/promises";

export interface CompositeConfig {
  x: number;
  y: number;
  scale?: number;
}

// Default composite configuration - adjust based on your camera setup
const DEFAULT_COMPOSITE_CONFIG: CompositeConfig = {
  x: 0, // Center horizontally (0 = left, can be negative for centering)
  y: 0, // Position from top
  scale: 1.0, // Scale factor for foreground
};

export async function processImage(
  jobId: string,
  inputImagePath: string,
  mode: JobMode,
  backgroundId: string,
  compositeConfig: CompositeConfig = DEFAULT_COMPOSITE_CONFIG
): Promise<string> {
  const stepStart = Date.now();
  
  // Step 1: Remove green screen
  const greenScreenStart = Date.now();
  const foregroundPath = getForegroundPath(jobId);
  await removeGreenScreen(inputImagePath, foregroundPath);
  const greenScreenDuration = Date.now() - greenScreenStart;
  console.log(`[${jobId}]   Green screen removal: ${greenScreenDuration}ms`);

  // Step 2: Get background path (checks for file existence)
  const bgLoadStart = Date.now();
  const backgroundPath = await getBackgroundPath(mode, backgroundId);

  // Verify background exists (double-check, though getBackgroundPath should have found it)
  try {
    await fs.access(backgroundPath);
  } catch {
    throw new Error(`Background image not found: ${backgroundPath}`);
  }

  // Step 3: Load background and foreground
  const background = sharp(backgroundPath);
  const foreground = sharp(foregroundPath);

  // Get dimensions
  const bgMetadata = await background.metadata();
  const fgMetadata = await foreground.metadata();

  if (!bgMetadata.width || !bgMetadata.height) {
    throw new Error("Failed to get background dimensions");
  }
  if (!fgMetadata.width || !fgMetadata.height) {
    throw new Error("Failed to get foreground dimensions");
  }
  const bgLoadDuration = Date.now() - bgLoadStart;
  console.log(`[${jobId}]   Background/foreground load: ${bgLoadDuration}ms`);

  // Calculate composite position
  // If x or y is 0, center the foreground
  let x = compositeConfig.x;
  let y = compositeConfig.y;

  if (x === 0) {
    // Center horizontally
    x = Math.floor((bgMetadata.width - fgMetadata.width * (compositeConfig.scale || 1)) / 2);
  }

  if (y === 0) {
    // Position at bottom (or adjust as needed)
    y = bgMetadata.height - Math.floor(fgMetadata.height * (compositeConfig.scale || 1)) - 50; // 50px from bottom
  }

  // Scale foreground if needed
  let processedForeground = foreground;
  if (compositeConfig.scale && compositeConfig.scale !== 1.0) {
    const newWidth = Math.floor(fgMetadata.width * compositeConfig.scale);
    const newHeight = Math.floor(fgMetadata.height * compositeConfig.scale);
    processedForeground = foreground.resize(newWidth, newHeight, {
      fit: "inside",
      preserveAspectRatio: true,
    });
  }

  // Step 4: Composite foreground onto background
  const compositeStart = Date.now();
  const compositedPath = getCompositedPath(jobId);
  await background
    .composite([
      {
        input: await processedForeground.toBuffer(),
        left: Math.max(0, x),
        top: Math.max(0, y),
      },
    ])
    .png()
    .toFile(compositedPath);
  const compositeDuration = Date.now() - compositeStart;
  console.log(`[${jobId}]   Compositing: ${compositeDuration}ms`);

  const totalStepDuration = Date.now() - stepStart;
  console.log(`[${jobId}]   Total image processing: ${totalStepDuration}ms`);

  return compositedPath;
}

