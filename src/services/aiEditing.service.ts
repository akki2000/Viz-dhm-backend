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
export async function enhanceImageWithAI(inputImagePath: string, mode: String): Promise<Buffer> {
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
      const stadiumStstem = `You are a photo retouching AI.

Your job is to FIX a pasted subject so it looks naturally photographed in the background.

Do NOT change the person, face, pose, clothes, or background.
Do NOT add effects, filters, blur, or stylization.

Only do the following:

Match lighting and color of the subject to the background
Remove green spill and cut-out edges, make the persons edges clean.
Add soft, natural ground shadow under the subject
Match sharpness and contrast to the background
add a subtle edge highlight shadow on the subject according to environment
change camera angle , perspective if necessary according to Subject position in the photo.
it should be at accurate distance and height according to Subject (Adult or children)
The result must look like a real photo taken at the location.`;
      const captainSystem =`You are an image editing AI.

The cricketer is always on the LEFT.
The user is always on the RIGHT.

Do not change faces or clothing.
Do not swap people.

fix lighting, color balance, shadows, and edge blending
so both people look naturally photographed together.`;
      const systemPrompt = mode === "captain" ? captainSystem : stadiumStstem;

      const config = {
        responseModalities: ["IMAGE", "TEXT"],
        temperature: 0.3,
        imageConfig: {
          aspectRatio: '4:3', 
        },
            systemInstruction: [
        {
          text:systemPrompt
        }
      ],
      };

      // const model = "gemini-3-pro-image-preview";
      const model = "gemini-2.5-flash-image";

      // Create the prompt for image enhancement
      const captain_prompt = `this is the photo i have created in in photoshop quicky by placing this guy over with the cricketer can you create a perfect image of both of them together posing for a photo like fan and celebrity. not too much close, also fix the edges and the lighting. fix the users pose accordingly like he is posing with a celebrity looking at camera, keep the same background must change the pose of the Fan to not overlap the cricketer`;

      const stadium_prompt = `analyze the photo then recreate a very realistic image of this person in real location of the background behind him in more natural and realistic way, make sure the the focus is subject, add details on subject as necessary to make it look naturally with the background, fix the lighting and color match, remove any cut our edges, add natural ground shadow under the person, make sure its a high quality photo looking very realistic as if it was taken by a professional camera.`;

      const prompt = mode === "captain" ? captain_prompt : stadium_prompt;

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

      console.log("mode", mode);

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
