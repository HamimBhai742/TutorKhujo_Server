import { prisma } from "../lib/prisma";
import { connectRedis } from "../lib/redis";
import { initEmailWorker } from "../workers/email.worker";
import bcrypt from "bcrypt";
import config from "../../config";

const seedAdmin = async () => {
  const adminEmail = config.admin.email;

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: adminEmail,
      },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(
        config.admin.password,
        Number(config.password_salt) || 10
      );


      await prisma.user.create({
        data: {
          name: "Admin",
          email: adminEmail,
          password: hashedPassword,
          mobile: "01700000000",
          role: "admin",
          status: "active",
          isVerified: true,
          isFirstLogin: false,
        },
      });
      console.log("👑 Admin user seeded successfully!");
    } else {
      console.log("👑 Admin user already exists.");
    }
  } catch (error: any) {
    console.error("❌ Failed to seed Admin user:", error.message || error);
  }
};

export const connectedDB = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
    await seedAdmin();
    await connectRedis();
    initEmailWorker();
  } catch (error) {
    console.log("❌ Database connection error:", error);
    process.exit(1);
  }
};

