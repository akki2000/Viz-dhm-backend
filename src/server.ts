import app from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  console.log(`Health check: http://localhost:${env.PORT}/health`);
  console.log(`API endpoint: http://localhost:${env.PORT}/api/jobs`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

