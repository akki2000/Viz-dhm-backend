import { photoProcessingQueue } from "../config/queue";
import { JobStatusResponse } from "../types/jobTypes";
import { getStaticImageUrl } from "../utils/filePaths";

export async function getJobStatus(jobId: string): Promise<JobStatusResponse | null> {
  if (!photoProcessingQueue) {
    return null; // Queue not available, will fall back to in-memory store
  }

  try {
    const job = await photoProcessingQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    // Map BullMQ job state to our status
    const state = await job.getState();
    let status: JobStatusResponse["status"];

    switch (state) {
      case "waiting":
      case "delayed":
        status = "queued";
        break;
      case "active":
        status = "processing";
        break;
      case "completed":
        status = "completed";
        break;
      case "failed":
        status = "failed";
        break;
      default:
        status = "queued";
    }

    const response: JobStatusResponse = {
      jobId,
      status,
      errorMessage: null,
    };

    // If completed, get result image path
    if (status === "completed") {
      const returnValue = job.returnvalue as { resultImagePath?: string } | undefined;
      if (returnValue?.resultImagePath) {
        response.resultImageUrl = getStaticImageUrl(jobId);
      }
    }

    // If failed, get error message
    if (status === "failed") {
      const failedReason = job.failedReason || "Unknown error";
      response.errorMessage = failedReason;
    }

    return response;
  } catch (error) {
    console.error(`Error getting job status for ${jobId}:`, error);
    throw error;
  }
}

