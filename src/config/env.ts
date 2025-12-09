import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)),
  REDIS_URL: z.string().url().optional(),
  GEMINI_API_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url().optional(),
  EMAIL_USER: z.string().email(),
  EMAIL_PASS: z.string().min(1),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join(".")).join(", ");
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

export const env = parseEnv();

