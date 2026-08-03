import { Queue } from "bullmq";
import config from "../../config";

let connectionConfig: { host: string; port: number; password?: string } = {
  host: "127.0.0.1",
  port: 6379,
};

try {
  if (config.redis_url) {
    const redisUrl = new URL(config.redis_url);
    connectionConfig = {
      host: redisUrl.hostname || "127.0.0.1",
      port: Number(redisUrl.port) || 6379,
      password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
    };
  }
} catch (e) {
  console.warn("⚠️ Failed to parse REDIS_URL, using default localhost connection options.");
}

export const emailQueue = new Queue("email-sender", {
  connection: connectionConfig,
});

export const enqueueEmail = async (to: string, subject: string, html: string) => {
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
};
