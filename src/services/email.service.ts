import nodemailer from "nodemailer";
import path from "path";
import fs from "fs/promises";
import { env } from "../config/env";
import { getFinalImagePath } from "../utils/filePaths";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Gmail SMTP server
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export interface SendEmailOptions {
  to: string;
  jobId: string;
  userImageUrl: string;
}

export async function sendImageEmail(options: SendEmailOptions): Promise<void> {
  const { to, jobId, userImageUrl } = options;

  // Resolve the actual file path from the URL
  // userImageUrl is like "/static/outputs/jobId_final.jpg"
  // We need to get the actual file path
  const imagePath = getFinalImagePath(jobId);

  // Check if file exists
  try {
    await fs.access(imagePath);
  } catch (error) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  // Get the filename for the attachment
  const filename = path.basename(imagePath);
  
  // Generate a unique Content-ID for the image attachment
  const imageCid = `image-${jobId}@photobooth`;
  
  // Determine the download URL - use userImageUrl if it's a full URL, otherwise use CID
  // If userImageUrl is a relative path and FRONTEND_URL is available, construct full URL
  let downloadUrl: string;
  if (userImageUrl.startsWith('http://') || userImageUrl.startsWith('https://')) {
    downloadUrl = userImageUrl;
  } else if (env.FRONTEND_URL) {
    // Construct full URL from relative path
    const baseUrl = env.FRONTEND_URL.replace(/\/$/, ''); // Remove trailing slash
    const relativePath = userImageUrl.startsWith('/') ? userImageUrl : `/${userImageUrl}`;
    downloadUrl = `${baseUrl}${relativePath}`;
  } else {
    // Fallback to CID if no hosted URL available
    downloadUrl = `cid:${imageCid}`;
  }

  // Email configuration
  const mailOptions = {
    from: `"IND vs SA" <${env.EMAIL_USER}>`,
    to: to,
    subject: "Your AI-Generated Photo",
    html: `
        <div style="margin:0; padding:0; background:#f5f5f5; width:100%; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5; padding:20px 0;">
            <tr>
              <td align="center">

                <!-- Main container -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" 
                      style="background:#ffffff; border-radius:10px; overflow:hidden;">

                  <!-- Banner -->
                  <tr>
                    <td>
                      <img src="https://primuscreo.com/banner.jpg" 
                          alt="Photo Booth Banner" 
                          width="600" 
                          style="display:block; width:100%; max-width:600px; height:auto;">
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 40px; text-align:center;">

                      <!-- Heading -->
                      <h2 style="margin:0; font-size:24px; color:#081856; font-weight:700;">
                        Your AI-Generated Photo Is Ready!
                      </h2>

                      <!-- Subtext -->
                      <p style="margin:15px 0 25px; font-size:16px; color:#444444; line-height:1.6;">
                        Thank you for visiting the <strong>India vs South Africa</strong> Photo Booth. <br>
                        Your personalized AI-generated image is attached below.
                      </p>

                      <!-- CTA Button -->
                      <a href="${downloadUrl}" 
                        style="
                          background:#EE623E; 
                          color:#ffffff; 
                          text-decoration:none; 
                          padding:14px 28px; 
                          font-size:16px; 
                          border-radius:6px;
                          display:inline-block;
                          font-weight:bold;
                        ">
                        Download Image
                      </a>

                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding: 0 40px;">
                      <hr style="border:none; border-top:1px solid #e6e6e6; margin:30px 0;">
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 0 40px 30px; text-align:center;">
                      <p style="margin:0; font-size:12px; color:#999999;">
                        Powered by PrimusCreo • Photo Booth Experience<br>
                        © ${new Date().getFullYear()} All Rights Reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </div>
    `,
    attachments: [
      {
        filename: filename,
        path: imagePath,
        cid: imageCid, // Content-ID for inline attachment
        contentDisposition: "attachment" as const, // Ensure it's downloadable
      },
    ],
  };

  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}. Message ID: ${info?.messageId || 'N/A'}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to send email: ${error.message}`
        : "Failed to send email"
    );
  }
}

