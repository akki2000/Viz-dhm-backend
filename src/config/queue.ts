import { Queue, QueueOptions, QueueEvents } from "bullmq";
import { env } from "./env";

export let photoProcessingQueue: Queue | null = null;
export let queueEvents: QueueEvents | null = null;
export let queueOptions: QueueOptions | null = null;

// Track if we've already logged the fallback message to avoid spam
let hasLoggedFallback = false;

// Initialize queue only if Redis URL is provided
// BullMQ connects asynchronously, so errors will be handled when queue is used
if (env.REDIS_URL) {
  queueOptions = {
    connection: {
      url: env.REDIS_URL,
      // Suppress connection retry noise
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // Reduce retry attempts to fail faster
      retryStrategy: () => null, // Don't retry on connection errors
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    },
  };

  // Create queue - connection errors will be handled when we try to use it
  photoProcessingQueue = new Queue("photo-processing-queue", queueOptions);
  
  // Create QueueEvents for waiting on job completion
  queueEvents = new QueueEvents("photo-processing-queue", queueOptions);
  
  // Set up error handler to catch and suppress connection errors
  // Disable queue on first connection error to prevent spam
  photoProcessingQueue.on("error", (error) => {
    // Check if it's a connection error
    const errorAny = error as any;
    const isConnectionError = 
      error.message?.includes("ECONNREFUSED") || 
      error.message?.includes("connect") ||
      errorAny.code === "ECONNREFUSED" ||
      error.name === "AggregateError" ||
      errorAny.errors?.some((e: any) => e.code === "ECONNREFUSED");
    
    if (isConnectionError && photoProcessingQueue && !hasLoggedFallback) {
      // Log once and disable queue
      console.log("⚠️  Redis not available - falling back to direct processing mode");
      hasLoggedFallback = true;
      
      // Close the queue to stop retry attempts
      photoProcessingQueue.close().catch(() => {
        // Ignore errors when closing
      });
      
      photoProcessingQueue = null;
      queueEvents = null;
      queueOptions = null;
    } else if (!isConnectionError && !hasLoggedFallback) {
      // Only log non-connection errors (and only if we haven't already logged fallback)
      console.error("Redis error:", error.message || error);
    }
    // Otherwise, silently ignore repeated connection errors
  });

  // Also handle QueueEvents errors
  if (queueEvents) {
    queueEvents.on("error", (error) => {
      const errorAny = error as any;
      const isConnectionError = 
        error.message?.includes("ECONNREFUSED") || 
        error.message?.includes("connect") ||
        errorAny.code === "ECONNREFUSED";
      
      if (isConnectionError && !hasLoggedFallback) {
        hasLoggedFallback = true;
        if (queueEvents) {
          queueEvents.close();
          queueEvents = null;
        }
      }
    });
  }

  // Also catch unhandled promise rejections from the queue (AggregateErrors)
  process.on("unhandledRejection", (reason) => {
    // Check if it's a Redis connection error (including AggregateError)
    const isRedisError = 
      (reason && typeof reason === "object" && "code" in reason && (reason as any).code === "ECONNREFUSED") ||
      (reason && typeof reason === "object" && "name" in reason && (reason as any).name === "AggregateError") ||
      (reason && typeof reason === "object" && "errors" in reason && 
       Array.isArray((reason as any).errors) && 
       (reason as any).errors.some((e: any) => e?.code === "ECONNREFUSED" || e?.message?.includes("ECONNREFUSED"))) ||
      (reason && typeof reason === "object" && "message" in reason && 
       String((reason as any).message).includes("ECONNREFUSED"));
    
    if (isRedisError && !hasLoggedFallback) {
      console.log("⚠️  Redis not available - falling back to direct processing mode");
      hasLoggedFallback = true;
      if (photoProcessingQueue) {
        photoProcessingQueue.close().catch(() => {});
        photoProcessingQueue = null;
      }
      if (queueEvents) {
        queueEvents.close();
        queueEvents = null;
      }
      queueOptions = null;
      return; // Suppress the error - don't let it crash or log
    }
    // Let other unhandled rejections through normally
  });

  console.log("✅ Redis queue initialized (will use direct processing if Redis unavailable)");
} else {
  console.log("⚠️  Redis not configured - running in direct processing mode (no queue)");
}

