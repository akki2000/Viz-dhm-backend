import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import sharp from "sharp";
import { env } from "../config/env";
import fs from "fs/promises";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enhances the composited image using Google Gemini AI
 * Sends the image with a prompt to improve lighting, edges, and blending
 */
export async function enhanceImageWithAI(inputImagePath: string): Promise<Buffer> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Read the image file
      const imageBuffer = await fs.readFile(inputImagePath);
      
      // Convert to base64 for inline data
      const base64Image = imageBuffer.toString("base64");
      
      // Get MIME type from file extension
      const mimeType = mime.getType(inputImagePath) || "image/png";

      // Initialize Gemini AI
      const ai = new GoogleGenAI({
        apiKey: env.GEMINI_API_KEY,
      });

      const config = {
        responseModalities: ["IMAGE", "TEXT"],
      };

      const model = "gemini-2.5-flash-image";

      // Create the prompt for image enhancement
      const prompt = `Enhance this composited photo booth image: fix lighting to match the background, remove any green screen artifacts, smooth edges around the person, adjust shadows and highlights for natural blending, and improve overall photo quality to look professional and realistic.`;

      const contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ];

      // Generate content stream
      const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
      });

      // Collect image chunks from the stream
      const imageBuffers: Buffer[] = [];
      let hasImage = false;

      for await (const chunk of response) {
        // Check for inline image data (matching user's code structure)
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          if (inlineData.data) {
            hasImage = true;
            const buffer = Buffer.from(inlineData.data, "base64");
            imageBuffers.push(buffer);
          }
        }

        // Log any text responses for debugging
        if (chunk.text) {
          console.log("Gemini text response:", chunk.text);
        }
      }

      if (!hasImage || imageBuffers.length === 0) {
        throw new Error("No image data received from Gemini API");
      }

      // Combine all image buffers (in case of multiple chunks)
      // Usually there's just one, but we'll handle multiple chunks
      let resultBuffer: Buffer;
      if (imageBuffers.length === 1) {
        resultBuffer = imageBuffers[0];
      } else {
        // If multiple chunks, concatenate them
        resultBuffer = Buffer.concat(imageBuffers);
      }

      // Validate it's an image by trying to get metadata
      await sharp(resultBuffer).metadata();

      return resultBuffer;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Gemini API call attempt ${attempt} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt); // Exponential backoff
      }
    }
  }

  throw new Error(`Gemini API call failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
