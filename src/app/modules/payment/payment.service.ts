import { prisma } from "../../lib/prisma";
import { AppError } from "../../error/AppError";

const getAllTransactions = async () => {
  const transactions = await prisma.transaction.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Map to the layout structure expected by the frontend AdminTransaction interface
  return transactions.map((t) => ({
    id: t.id,
    userName: t.user.name,
    userRole: t.user.role,
    amount: t.amount,
    type: t.type === "Invoice_Payment" ? "Invoice Payment" : "Tutor Payout",
    status: t.status === "Success" ? "Success" : t.status === "Failed" ? "Failed" : "Pending",
    date: t.createdAt.toISOString().split("T")[0],
    method: t.method,
    reference: t.reference,
  }));
};

const processPayout = async (transactionId: string) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  if (transaction.type !== "Tutor_Payout") {
    throw new AppError("Only tutor payouts can be processed", 400);
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: "Success",
    },
    include: {
      user: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  });

  return {
    id: updatedTransaction.id,
    userName: updatedTransaction.user.name,
    userRole: updatedTransaction.user.role,
    amount: updatedTransaction.amount,
    type: "Tutor Payout",
    status: "Success",
    date: updatedTransaction.updatedAt.toISOString().split("T")[0],
    method: updatedTransaction.method,
    reference: updatedTransaction.reference,
  };
};

const getMyTransactions = async (userId: string) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return transactions.map((t) => ({
    id: t.id,
    amount: t.amount,
    status: t.status === "Success" ? "Paid" : t.status === "Pending" ? "Processing" : "Failed",
    date: t.createdAt.toISOString().split("T")[0],
    method: t.method,
    description: t.type === "Tutor_Payout" ? "Monthly Tuition Disbursed" : "Tuition Fee Invoice",
    reference: t.reference,
  }));
};

export const PaymentService = {
  getAllTransactions,
  processPayout,
  getMyTransactions,
};
