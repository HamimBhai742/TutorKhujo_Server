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

const seedTransactions = async () => {
  try {
    const transactionCount = await prisma.transaction.count();
    if (transactionCount === 0) {
      const students = await prisma.user.findMany({ where: { role: "student" } });
      const tutors = await prisma.user.findMany({ where: { role: "tutor" } });

      if (students.length > 0) {
        await prisma.transaction.createMany({
          data: [
            {
              userId: students[0].id,
              amount: 5000,
              type: "Invoice_Payment",
              status: "Success",
              method: "bKash",
              reference: "BK-TXN-982341",
            },
            {
              userId: students[0].id,
              amount: 8000,
              type: "Invoice_Payment",
              status: "Failed",
              method: "Card",
              reference: "CRD-TXN-55412",
            },
          ],
        });
      }

      if (tutors.length > 0) {
        await prisma.transaction.createMany({
          data: [
            {
              userId: tutors[0].id,
              amount: 4500,
              type: "Tutor_Payout",
              status: "Success",
              method: "Bank Transfer",
              reference: "DBBL-OUT-10023",
            },
            {
              userId: tutors[0].id,
              amount: 5000,
              type: "Tutor_Payout",
              status: "Pending",
              method: "bKash",
              reference: "BK-PAY-771239",
            },
          ],
        });
      }

      console.log("💳 Transactions seeded successfully!");
    }
  } catch (error: any) {
    console.error("❌ Failed to seed Transactions:", error.message || error);
  }
};

export const connectedDB = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
    await seedAdmin();
    await seedTransactions();
    await connectRedis();
    initEmailWorker();
  } catch (error) {
    console.log("❌ Database connection error:", error);
    process.exit(1);
  }
};

