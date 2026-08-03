import { Worker, Job } from "bullmq";
import config from "../../config";
import { sendEmail } from "../utils/sendEmail";

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
  // Use default
}

export const emailWorker = new Worker(
  "email-sender",
  async (job: Job) => {
    const { to, subject, html } = job.data;
    console.log(`⏳ Processing email job ${job.id} for: ${to}`);
    await sendEmail(to, subject, html);
  },
  {
    connection: connectionConfig,
    concurrency: 50, // Concurrency of 50 concurrent jobs
    limiter: {
      max: 100, // Limit to max 100 emails sent per 1 second to avoid hitting SMTP limits
      duration: 1000,
    },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`✅ Email job ${job.id} completed successfully.`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`❌ Email job ${job?.id} failed with error:`, err.message);
});
