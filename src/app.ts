import express from "express";
import cors from "cors";
import path from "path";
import { errorHandler } from "./middleware/errorHandler";
import jobsRouter from "./routes/jobs.routes";
import emailRouter from "./routes/email.routes";
import { env } from "./config/env";

const app = express();

// CORS configuration
const allowedOrigins = [
  "https://vizinfy.primuscreo.com",
  "http://vizinfy.primuscreo.com", // Include HTTP for development
  env.FRONTEND_URL, // Allow additional frontend URL from env
].filter(Boolean) as string[]; // Remove undefined values

console.log("CORS Configuration:");
console.log("Allowed origins:", allowedOrigins.join(", "));

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS: Blocked request from origin: ${origin}`);
        console.warn(`CORS: Allowed origins are: ${allowedOrigins.join(", ")}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow cookies/credentials if needed
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    exposedHeaders: ["Content-Type", "Content-Length"],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Request logging middleware (for debugging)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/static", express.static(uploadsPath));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Queue status endpoint
app.get("/health/queue", async (_req, res) => {
  try {
    const { photoProcessingQueue } = await import("./config/queue");
    
    if (!photoProcessingQueue) {
      return res.json({
        queueEnabled: false,
        mode: "direct-processing",
        message: "Redis not configured - using direct processing mode",
      });
    }

    // Get queue metrics
    const waiting = await photoProcessingQueue.getWaitingCount();
    const active = await photoProcessingQueue.getActiveCount();
    const completed = await photoProcessingQueue.getCompletedCount();
    const failed = await photoProcessingQueue.getFailedCount();

    return res.json({
      queueEnabled: true,
      mode: "queue-based",
      redis: "connected",
      metrics: {
        waiting,
        active,
        completed,
        failed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      queueEnabled: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// API routes
app.use("/api/jobs", jobsRouter);
app.use("/api/email", emailRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;

