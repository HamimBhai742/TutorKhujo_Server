import { Worker, Job } from "bullmq";
import { sendEmail } from "../utils/sendEmail";
import { isRedisAvailable, getRedisConnectionConfig } from "../lib/redis";

export let emailWorker: Worker | null = null;

export const initEmailWorker = () => {
  if (!isRedisAvailable) {
    return;
  }

  try {
    emailWorker = new Worker(
      "email-sender",
      async (job: Job) => {
        const { to, subject, html } = job.data;
        console.log(`⏳ Processing email job ${job.id} for: ${to}`);
        await sendEmail(to, subject, html);
      },
      {
        connection: getRedisConnectionConfig(),
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
  } catch (error: any) {
    console.error("❌ Failed to start Email Worker:", error.message || error);
  }
};
