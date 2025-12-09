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

    // Validate mode
    if (!mode || (mode !== "stadium" && mode !== "captain")) {
      throw createError('Mode must be "stadium" or "captain"', 400);
    }

    // Validate backgroundId
    if (!backgroundId || typeof backgroundId !== "string") {
      throw createError("backgroundId is required", 400);
    }

    // Generate job ID
    const jobId = uuidv4();
    
    // Start timer for request processing
    const startTime = Date.now();
    console.log(`[${jobId}] Request received at ${new Date().toISOString()}`);

    // Move uploaded file to final location with jobId
    const finalImagePath = getRawImagePath(jobId);
    await fs.rename(req.file.path, finalImagePath);

    // Create job payload
    const payload: JobPayload = {
      jobId,
      mode: mode as JobMode,
      backgroundId,
      inputImagePath: finalImagePath,
      userSessionId: userSessionId || undefined,
      createdAt: new Date().toISOString(),
      startTime, // Include start time for timing calculations
    };

    // Process the job and wait for completion before responding
    let result;
    let errorMessage: string | undefined;

    try {
      if (photoProcessingQueue) {
        // Use queue-based processing and wait for completion
        const job = await photoProcessingQueue.add("process-photo", payload, {
          jobId, // Use jobId as the BullMQ job ID for easy lookup
        });

        // Wait for job to complete by polling job state
        let jobState = await job.getState();
        let attempts = 0;
        const maxAttempts = 300; // 5 minutes max (300 * 1 second intervals)
        
        while (jobState !== "completed" && jobState !== "failed" && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
          jobState = await job.getState();
          attempts++;
        }

        if (jobState === "completed") {
          // Refresh job to get latest returnvalue
          const completedJob = await photoProcessingQueue.getJob(job.id!);
          const returnValue = completedJob?.returnvalue as { resultImagePath?: string } | undefined;
          if (returnValue?.resultImagePath) {
            result = { resultImagePath: returnValue.resultImagePath };
          } else {
            // Fallback: construct path from jobId (standard path)
            result = { resultImagePath: `uploads/outputs/${jobId}_final.jpg` };
          }
        } else if (jobState === "failed") {
          // Refresh job to get latest failedReason
          const failedJob = await photoProcessingQueue.getJob(job.id!);
          const failedReason = failedJob?.failedReason || "Job processing failed";
          throw new Error(failedReason);
        } else {
          throw new Error(`Job processing timed out after ${maxAttempts} seconds`);
        }
      } else {
        // Process directly without queue (no Redis)
        setJobStatus(jobId, "processing");
        result = await processPhotoJob(payload);
        setJobStatus(jobId, "completed", result.resultImagePath);
      }

      // Job completed successfully
      const resultImageUrl = `/static/outputs/${jobId}_final.jpg`;

      res.status(200).json({
        jobId,
        status: "completed",
        userSessionId: userSessionId || undefined,
        userImageUrl: resultImageUrl,
      });
    } catch (error) {
      // Job failed
      finalStatus = "failed";
      errorMessage = error instanceof Error ? error.message : String(error);
      
      if (!photoProcessingQueue) {
        setJobStatus(jobId, "failed", undefined, errorMessage);
      }

      res.status(500).json({
        jobId,
        status: "failed",
        userSessionId: userSessionId || undefined,
        errorMessage: errorMessage,
      });
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

