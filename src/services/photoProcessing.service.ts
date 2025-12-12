import { JobPayload, JobResult } from "../types/jobTypes";
import { processImage } from "./imageProcessing.service";
import { enhanceImageWithAI } from "./aiEditing.service";
import { getFinalImagePath } from "../utils/filePaths";
import fs from "fs/promises";

/**
 * Process a photo job directly (without queue)
 * This is used when Redis is not available
 */
export async function processPhotoJob(payload: JobPayload): Promise<JobResult> {
  const { jobId, inputImagePath, mode, backgroundId, startTime } = payload;
  
  const requestStartTime = startTime || Date.now();
  const processingStartTime = Date.now();
  const timeSinceRequest = processingStartTime - requestStartTime;

  console.log(`Processing job ${jobId} directly (no queue)...`);
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
    const enhancedBuffer = await enhanceImageWithAI(compositedPath, mode);
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
}

