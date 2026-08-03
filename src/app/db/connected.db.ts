import { prisma } from "../lib/prisma";

export const connectedDB = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.log("❌ Database connection error:", error);
    process.exit(1);
  }
};
