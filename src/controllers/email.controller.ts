import { Request, Response, NextFunction } from "express";
import { sendImageEmail } from "../services/email.service";
import { createError } from "../middleware/errorHandler";
import { z } from "zod";

// Validation schema for email request
const emailRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  jobId: z.string().min(1, "jobId is required"),
  userImageUrl: z.string().min(1, "userImageUrl is required"),
});

export async function sendEmailHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = emailRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ");
      throw createError(`Validation error: ${errors}`, 400);
    }

    const { email, jobId, userImageUrl } = validationResult.data;

    // Send email with image attachment
    await sendImageEmail({
      to: email,
      jobId,
      userImageUrl,
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      jobId,
      recipientEmail: email,
    });
  } catch (error) {
    next(error);
  }
}

