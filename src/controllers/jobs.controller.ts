import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { photoProcessingQueue } from "../config/queue";
import { JobPayload, JobMode } from "../types/jobTypes";
import { getRawImagePath, paths } from "../utils/filePaths";
import { getJobStatus } from "../services/jobStatus.service";
import { processPhotoJob } from "../services/photoProcessing.service";
import { setJobStatus, getInMemoryJobStatus } from "../services/inMemoryJobStore";
import { createError } from "../middleware/errorHandler";
import fs from "fs/promises";
import path from "path";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    // Ensure directory exists
    await fs.mkdir(paths.uploads.raw, { recursive: true });
    cb(null, paths.uploads.raw);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename - will be renamed to jobId later
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `temp-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw createError("Photo file is required", 400);
    }

    const { mode, backgroundId, userSessionId } = req.body;

    if (!mode || (mode !== "stadium" && mode !== "captain")) {
      throw createError('Mode must be "stadium" or "captain"', 400);
    }

    if (!backgroundId || typeof backgroundId !== "string") {
      throw createError("backgroundId is required", 400);
    }

    const jobId = uuidv4();
    const startTime = Date.now();
    console.log(`[${jobId}] Request received at ${new Date().toISOString()}`);

    const finalImagePath = getRawImagePath(jobId);
    await fs.rename(req.file.path, finalImagePath);

    const payload: JobPayload = {
      jobId,
      mode: mode as JobMode,
      backgroundId,
      inputImagePath: finalImagePath,
      userSessionId: userSessionId || undefined,
      createdAt: new Date().toISOString(),
      startTime,
    };

    if (photoProcessingQueue) {
      // Add to queue and return immediately
      await photoProcessingQueue.add("process-photo", payload, {
        jobId,
      });

      // Return job ID immediately - frontend polls /api/jobs/:jobId
      res.status(202).json({
        jobId,
        status: "processing",
        userSessionId: userSessionId || undefined,
        message: "Job queued successfully. Poll /api/jobs/:jobId for status",
      });
    } else {
      // Direct processing fallback
      setJobStatus(jobId, "processing");
      try {
        const result = await processPhotoJob(payload);
        setJobStatus(jobId, "completed", result.resultImagePath);
        
        res.status(200).json({
          jobId,
          status: "completed",
          userSessionId: userSessionId || undefined,
          userImageUrl: `/static/outputs/${jobId}_final.jpg`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setJobStatus(jobId, "failed", undefined, errorMessage);
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
}

export async function getJobStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw createError("jobId is required", 400);
    }

    // Try queue-based status first, then in-memory store
    let status;
    if (photoProcessingQueue) {
      status = await getJobStatus(jobId);
    } else {
      status = getInMemoryJobStatus(jobId);
    }

    if (!status) {
      throw createError(`Job with id ${jobId} not found`, 404);
    }

    res.json(status);
  } catch (error) {
    next(error);
  }
}

