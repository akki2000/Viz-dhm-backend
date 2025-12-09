import path from "path";
import fs from "fs/promises";
import { JobMode } from "../types/jobTypes";

const rootDir = process.cwd();

export const paths = {
  uploads: {
    raw: path.join(rootDir, "uploads", "raw"),
    foregrounds: path.join(rootDir, "uploads", "foregrounds"),
    outputs: path.join(rootDir, "uploads", "outputs"),
  },
  assets: {
    backgrounds: {
      stadium: path.join(rootDir, "assets", "backgrounds", "stadium"),
      captains: path.join(rootDir, "assets", "backgrounds", "captains"),
    },
  },
} as const;

export async function getBackgroundPath(mode: JobMode, backgroundId: string): Promise<string> {
  const baseDir = mode === "stadium" ? paths.assets.backgrounds.stadium : paths.assets.backgrounds.captains;
  // Assume backgroundId is the filename without extension, try common extensions
  const extensions = [".jpg", ".jpeg", ".png"];
  for (const ext of extensions) {
    const fullPath = path.join(baseDir, `${backgroundId}${ext}`);
    try {
      await fs.access(fullPath);
      return fullPath; // File exists, return this path
    } catch {
      // File doesn't exist, try next extension
      continue;
    }
  }
  // If no file found, return the default .jpg path (will cause error in service)
  return path.join(baseDir, `${backgroundId}.jpg`);
}

export function getRawImagePath(jobId: string): string {
  return path.join(paths.uploads.raw, `${jobId}.jpg`);
}

export function getForegroundPath(jobId: string): string {
  return path.join(paths.uploads.foregrounds, `${jobId}.png`);
}

export function getCompositedPath(jobId: string): string {
  return path.join(paths.uploads.outputs, `${jobId}_composited.png`);
}

export function getFinalImagePath(jobId: string): string {
  return path.join(paths.uploads.outputs, `${jobId}_final.jpg`);
}

export function getStaticImageUrl(jobId: string): string {
  return `/static/outputs/${jobId}_final.jpg`;
}

export function getStaticImagePath(jobId: string): string {
  return `/static/outputs/${jobId}_final.jpg`;
}

