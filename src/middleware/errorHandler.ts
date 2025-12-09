import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: AppError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = "statusCode" in err && err.statusCode ? err.statusCode : 500;
  const message = err.message || "Internal server error";
  const details = "details" in err ? err.details : undefined;

  console.error("Error:", {
    message,
    statusCode,
    details,
    stack: err.stack,
  });

  const response: { message: string; details?: unknown } = { message };
  if (details !== undefined && details !== null) {
    response.details = details;
  }
  res.status(statusCode).json(response);
}

export function createError(message: string, statusCode: number, details?: unknown): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

