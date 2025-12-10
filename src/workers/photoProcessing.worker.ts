import { Worker, Job } from "bullmq";
import { queueOptions, photoProcessingQueue } from "../config/queue";
import { JobPayload, JobResult } from "../types/jobTypes";
import { processImage } from "../services/imageProcessing.service";
import { enhanceImageWithAI } from "../services/aiEditing.service";
import { getFinalImagePath } from "../utils/filePaths";
import fs from "fs/promises";

// Check if Redis is available
if (!photoProcessingQueue || !queueOptions) {
  console.log("⚠️  Redis not configured - worker not needed in direct processing mode");
  console.log("   Jobs will be processed directly in the API server");
  process.exit(0);
}

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "2", 10);

// Track if we've already logged connection errors to avoid spam
let hasLoggedConnectionError = false;

const worker = new Worker(
  "photo-processing-queue",
  async (job: Job<JobPayload>) => {
    const { jobId, inputImagePath, mode, backgroundId, startTime } = job.data;
    
    const requestStartTime = startTime || Date.now();
    const processingStartTime = Date.now();
    const timeSinceRequest = processingStartTime - requestStartTime;

    console.log(`Processing job ${jobId}...`);
    if (timeSinceRequest > 0) {
      console.log(`[${jobId}] Time from request to processing start: ${timeSinceRequest}ms`);
    }

    try {
      // Step 1: Process image (green screen removal + compositing)
      const step1Start = Date.now();
      console.log(`[${jobId}] Step 1: Processing image...`);
      const compositedPath = await processImage(jobId, inputImagePath, mode, backgroundId);
      const step1Duration = Date.now() - step1Start;
      console.log(`[${jobId}] Step 1 completed in ${step1Duration}ms`);

      // Step 2: Enhance with AI
      const step2Start = Date.now();
      console.log(`[${jobId}] Step 2: Enhancing with AI...`);
      const enhancedBuffer = await enhanceImageWithAI(compositedPath);
      const step2Duration = Date.now() - step2Start;
      console.log(`[${jobId}] Step 2 completed in ${step2Duration}ms`);

      // Step 3: Save final image
      const step3Start = Date.now();
      console.log(`[${jobId}] Step 3: Saving final image...`);
      const finalImagePath = getFinalImagePath(jobId);
      await fs.writeFile(finalImagePath, enhancedBuffer);
      const step3Duration = Date.now() - step3Start;
      console.log(`[${jobId}] Step 3 completed in ${step3Duration}ms`);

      const result: JobResult = {
        resultImagePath: finalImagePath,
      };

      // Calculate total time
      const totalProcessingTime = Date.now() - processingStartTime;
      const totalRequestTime = Date.now() - requestStartTime;
      
      console.log(`[${jobId}] ✅ Processing completed successfully`);
      console.log(`[${jobId}] ⏱️  Timing Summary:`);
      console.log(`[${jobId}]    - Step 1 (Image Processing): ${step1Duration}ms`);
      console.log(`[${jobId}]    - Step 2 (AI Enhancement): ${step2Duration}ms`);
      console.log(`[${jobId}]    - Step 3 (Save Final): ${step3Duration}ms`);
      console.log(`[${jobId}]    - Total Processing Time: ${totalProcessingTime}ms (${(totalProcessingTime / 1000).toFixed(2)}s)`);
      console.log(`[${jobId}]    - Total Request Time: ${totalRequestTime}ms (${(totalRequestTime / 1000).toFixed(2)}s)`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const totalTime = Date.now() - requestStartTime;
      console.error(`[${jobId}] ❌ Processing failed after ${totalTime}ms:`, errorMessage);
      throw error;
    }
  },
  {
    ...queueOptions,
    concurrency: WORKER_CONCURRENCY,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  // Check if it's a connection error
  const errorAny = err as any;
  const isConnectionError = 
    err.message?.includes("ECONNREFUSED") || 
    err.message?.includes("connect") ||
    errorAny.code === "ECONNREFUSED" ||
    err.name === "AggregateError" ||
    errorAny.errors?.some((e: any) => e.code === "ECONNREFUSED");
  
  if (isConnectionError) {
    if (!hasLoggedConnectionError) {
      console.error("❌ Redis connection failed - worker cannot operate without Redis");
      console.error("   Please start Redis (e.g., Docker: docker run -d -p 6379:6379 redis)");
      console.error("   Or run the server without the worker (it will process jobs directly)");
      hasLoggedConnectionError = true;
    }
    // Exit gracefully after logging the error
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    // Log non-connection errors normally
    console.error("Worker error:", err);
  }
});

console.log(`Photo processing worker started with concurrency: ${WORKER_CONCURRENCY}`);
console.log("Waiting for jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing worker...");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing worker...");
  await worker.close();
  process.exit(0);
});

