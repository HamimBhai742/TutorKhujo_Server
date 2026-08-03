import { Queue } from "bullmq";
import { sendEmail } from "../utils/sendEmail";
import { isRedisAvailable, getRedisConnectionConfig } from "../lib/redis";

let emailQueue: Queue | null = null;

export const enqueueEmail = async (to: string, subject: string, html: string) => {
  if (!isRedisAvailable) {
    console.log(`ℹ️ [FALLBACK] Sending email directly to: ${to} (Redis offline)`);
    try {
      await sendEmail(to, subject, html);
    } catch (sendError: any) {
      console.error(`❌ Direct email sending failed: ${sendError.message}`);
    }
    return;
  }

  try {
    if (!emailQueue) {
      emailQueue = new Queue("email-sender", {
        connection: getRedisConnectionConfig(),
      });
    }

    await emailQueue.add(
      "send-email-job",
      { to, subject, html },
      {
        attempts: 5, // Retry up to 5 times on failure
        backoff: {
          type: "exponential",
          delay: 5000, // Wait 5s before first retry, then 10s, 20s, etc.
        },
        removeOnComplete: true, // Auto-remove completed jobs to save Redis memory
        removeOnFail: {
          age: 24 * 3600, // Keep failed jobs for up to 24 hours for debugging
          count: 1000,
        },
      }
    );
  } catch (error: any) {
    console.warn(
      `⚠️ BullMQ failed to queue email (Redis offline: ${error.message}). Falling back to direct email sending...`
    );
    try {
      await sendEmail(to, subject, html);
    } catch (sendError: any) {
      console.error(`❌ Direct email sending also failed: ${sendError.message}`);
    }
  }
};
