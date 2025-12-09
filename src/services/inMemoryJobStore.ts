import { JobStatusResponse } from "../types/jobTypes";
import { getStaticImagePath } from "../utils/filePaths";

interface JobState {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  resultImagePath?: string;
  errorMessage?: string;
  createdAt: Date;
}

// In-memory store for jobs when Redis is not available
const jobStore = new Map<string, JobState>();

export function setJobStatus(
  jobId: string,
  status: JobState["status"],
  resultImagePath?: string,
  errorMessage?: string
): void {
  jobStore.set(jobId, {
    jobId,
    status,
    resultImagePath,
    errorMessage,
    createdAt: new Date(),
  });
}

export function getInMemoryJobStatus(jobId: string): JobStatusResponse | null {
  const job = jobStore.get(jobId);
  if (!job) {
    return null;
  }

  const response: JobStatusResponse = {
    jobId: job.jobId,
    status: job.status,
    errorMessage: job.errorMessage || null,
  };

  if (job.status === "completed" && job.resultImagePath) {
    response.resultImageUrl = getStaticImagePath(jobId);
  }

  return response;
}

export function getAllJobs(): JobState[] {
  return Array.from(jobStore.values());
}

// Clean up old jobs (older than 1 hour)
export function cleanupOldJobs(): void {
  const oneHourAgo = Date.now() - 3600000;
  for (const [jobId, job] of jobStore.entries()) {
    if (job.createdAt.getTime() < oneHourAgo) {
      jobStore.delete(jobId);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldJobs, 30 * 60 * 1000);

