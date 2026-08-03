import { prisma } from "../lib/prisma";
import { connectRedis } from "../lib/redis";
import { initEmailWorker } from "../workers/email.worker";

export const connectedDB = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
    await connectRedis();
    initEmailWorker();
  } catch (error) {
    console.log("❌ Database connection error:", error);
    process.exit(1);
  }
};
