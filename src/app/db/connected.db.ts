import { prisma } from "../lib/prisma";
import { connectRedis } from "../lib/redis";

export const connectedDB = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
    await connectRedis();
  } catch (error) {
    console.log("❌ Database connection error:", error);
    process.exit(1);
  }
};
