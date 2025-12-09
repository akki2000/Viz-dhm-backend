export type JobMode = "stadium" | "captain";

export interface JobPayload {
  jobId: string;
  mode: JobMode;
  backgroundId: string;
  inputImagePath: string;
  userSessionId?: string;
  createdAt: string;
  startTime?: number; // Timestamp when request was received
}

export interface JobResult {
  resultImagePath: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  resultImageUrl?: string;
  errorMessage?: string | null;
}

