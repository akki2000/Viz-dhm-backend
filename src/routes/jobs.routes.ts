import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { createJob, getJobStatusHandler, upload } from "../controllers/jobs.controller";
import { createError } from "../middleware/errorHandler";

const router = Router();

// Multer error handler middleware
function handleMulterError(err: unknown, _req: Request, _res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(createError("File too large. Maximum size is 10MB", 400));
    }
    return next(createError(`Upload error: ${err.message}`, 400));
  }
  if (err instanceof Error) {
    return next(createError(err.message, 400));
  }
  next(err);
}

// POST /api/jobs - Submit new photo processing job
router.post("/", upload.single("photo"), handleMulterError, createJob);

// GET /api/jobs/:jobId - Get job status
router.get("/:jobId", getJobStatusHandler);

export default router;

