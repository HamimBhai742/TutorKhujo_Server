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
  const [tuitionTransactions, pointTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pointTransaction.findMany({
      where: {
        userId,
        amountPaid: { not: null, gt: 0 },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const mappedTuition = tuitionTransactions.map((t) => {
    const rawRef = t.reference || t.id;
    const cleanRef = rawRef.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase() || t.id.slice(0, 8).toUpperCase();
    return {
      id: t.id,
      invoiceNo: `INV-TK-${cleanRef}`,
      amount: t.amount,
      status: t.status === "Success" ? "Paid" : t.status === "Pending" ? "Processing" : "Failed",
      date: t.createdAt.toISOString().split("T")[0],
      createdAt: t.createdAt,
      method: t.method,
      description: t.type === "Tutor_Payout" ? "Monthly Tuition Disbursed" : "Tuition Fee Invoice",
      reference: t.reference || `TXN-${t.id.slice(0, 8)}`,
      trxId: t.reference || `TXN-${t.id.slice(0, 8)}`,
      type: t.type === "Tutor_Payout" ? "Tutor Payout" : "Invoice Payment",
    };
  });

  const mappedPoints = pointTransactions.map((pt) => {
    const rawRef = pt.trxId || pt.id;
    const cleanRef = rawRef.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase() || pt.id.slice(0, 8).toUpperCase();
    return {
      id: pt.id,
      invoiceNo: `INV-TK-${cleanRef}`,
      amount: pt.amountPaid || 0,
      points: pt.points,
      status: "Paid",
      date: pt.createdAt.toISOString().split("T")[0],
      createdAt: pt.createdAt,
      method: pt.method || "bKash",
      description: pt.description || `Points Recharge (${pt.points} Points)`,
      reference: pt.trxId || `TXN-${pt.id.slice(0, 8)}`,
      trxId: pt.trxId || `TXN-${pt.id.slice(0, 8)}`,
      type: "Point Purchase",
    };
  });

  const combined = [...mappedTuition, ...mappedPoints].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return combined;
};

const getInvoiceDetails = async (userId: string, userRole: string, identifier: string) => {
  // Try finding in PointTransaction first (by trxId or id)
  let pt = await prisma.pointTransaction.findFirst({
    where: {
      OR: [{ trxId: identifier }, { id: identifier }],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          role: true,
          rewardPoints: true,
        },
      },
    },
  });

  let t = null;
  if (!pt) {
    t = await prisma.transaction.findFirst({
      where: {
        OR: [{ reference: identifier }, { id: identifier }],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            role: true,
            rewardPoints: true,
          },
        },
      },
    });
  }

  const record = pt || t;
  if (!record) {
    throw new AppError("Invoice / Transaction record not found", 404);
  }

  // Authorization check (only owner or admin)
  if (userRole !== "admin" && record.userId !== userId) {
    throw new AppError("You are not authorized to view this invoice", 403);
  }

  const isPoint = Boolean(pt);
  const amount = isPoint ? (pt!.amountPaid || 0) : t!.amount;
  const rawRef = isPoint ? (pt!.trxId || pt!.id) : (t!.reference || t!.id);
  const cleanRef = rawRef.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase() || record.id.slice(0, 8).toUpperCase();
  const invoiceNumber = `INV-TK-${cleanRef}`;

  return {
    invoiceNumber,
    issueDate: record.createdAt,
    status: isPoint ? "Paid" : (t!.status === "Success" ? "Paid" : t!.status),
    type: isPoint ? "Point Purchase" : (t!.type === "Tutor_Payout" ? "Tutor Payout" : "Invoice Payment"),
    customer: {
      name: record.user.name,
      email: record.user.email,
      mobile: record.user.mobile || "N/A",
      role: record.user.role,
      rewardPoints: record.user.rewardPoints,
    },
    paymentDetails: {
      method: record.method || "bKash",
      trxId: rawRef,
      paidAt: record.createdAt,
      amount: amount,
      currency: "BDT",
    },
    items: [
      {
        description: isPoint
          ? (pt!.description || `TutorKhojo Points Recharge (${pt!.points} Points)`)
          : (t!.type === "Tutor_Payout" ? "Monthly Tuition Payout Disbursed" : "Tuition Fee Invoice"),
        points: isPoint ? pt!.points : null,
        quantity: 1,
        unitPrice: amount,
        total: amount,
      },
    ],
    subtotal: amount,
    discount: 0,
    tax: 0,
    total: amount,
    company: {
      name: "TutorKhojo Bangladesh",
      slogan: "Connecting Quality Tutors & Students Across Bangladesh",
      address: "House 42, Road 11, Banani, Dhaka-1213, Bangladesh",
      email: "support@tutorkhojo.com",
      website: "https://tutorkhojo.com",
      helpline: "+880 9613-828282",
      tradeLicense: "TRAD/DNCC/049182/2024",
    },
  };
};

export const PaymentService = {
  getAllTransactions,
  processPayout,
  getMyTransactions,
  getInvoiceDetails,
};
