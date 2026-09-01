import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { IBuyPackagePayload } from "./points.interface";
import { NotificationService } from "../notification/notification.service";

const PACKAGE_RATES: Record<number, number> = {
  99: 100,
  199: 200,
  299: 300,
  399: 400,
  499: 500,
};

const buyPackage = async (userId: string, payload: IBuyPackagePayload) => {
  const points = PACKAGE_RATES[payload.packagePrice];
  if (!points) {
    throw new AppError("Invalid point package selected. Valid packages are ৳99, ৳199, ৳299, ৳399, ৳499", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const generatedTrxId = payload.trxId || `TXN-TK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        rewardPoints: { increment: points },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rewardPoints: true,
      },
    });

    const pointTransaction = await tx.pointTransaction.create({
      data: {
        userId,
        points: points,
        type: "PACKAGE_PURCHASE",
        amountPaid: payload.packagePrice,
        method: payload.method || "bKash",
        trxId: generatedTrxId,
        description: `Purchased ${points} Points Pack for ৳${payload.packagePrice}`,
      },
    });

    return { updatedUser, pointTransaction };
  });

  NotificationService.sendNotification({
    userId,
    title: "Points Added Successfully! ⚡",
    message: `You have successfully recharged ${points} Points for ৳${payload.packagePrice}. Your new balance is ${result.updatedUser.rewardPoints} Points.`,
    type: "POINTS_RECHARGED",
    link: "/dashboard",
  }).catch((err) => console.error("[Notification] Failed to notify user of point purchase:", err));

  return {
    success: true,
    pointsAdded: points,
    totalPoints: result.updatedUser.rewardPoints,
    transaction: result.pointTransaction,
  };
};

const unlockTutorContact = async (studentId: string, tutorId: string) => {
  if (studentId === tutorId) {
    throw new AppError("You cannot unlock your own contact", 400);
  }

  const [student, tutor] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId, deletedAt: null } }),
    prisma.user.findUnique({
      where: { id: tutorId, role: "tutor", deletedAt: null },
      include: { tutorProfile: true },
    }),
  ]);

  if (!student) throw new AppError("Student account not found", 404);
  if (!tutor) throw new AppError("Tutor profile not found", 404);

  // Check if already unlocked
  const existingUnlock = await prisma.contactUnlock.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: studentId,
        targetType: "TUTOR_PROFILE",
        targetId: tutorId,
      },
    },
  });

  if (existingUnlock) {
    return {
      alreadyUnlocked: true,
      pointsRemaining: student.rewardPoints,
      tutorContact: {
        id: tutor.id,
        name: tutor.name,
        mobile: tutor.mobile || "Contact via TutorKhojo Chat",
        email: tutor.email,
        city: tutor.city || "Dhaka",
        institution: tutor.tutorProfile?.institution,
        department: tutor.tutorProfile?.department,
      },
    };
  }

  // Cost is 10 points
  const UNLOCK_COST = 10;
  if (student.rewardPoints < UNLOCK_COST) {
    throw new AppError(
      `Insufficient points. You need at least ${UNLOCK_COST} points to unlock this tutor's contact number and direct chat. Your current balance is ${student.rewardPoints} points.`,
      400
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedStudent = await tx.user.update({
      where: { id: studentId },
      data: {
        rewardPoints: { decrement: UNLOCK_COST },
      },
      select: {
        rewardPoints: true,
      },
    });

    const unlockRecord = await tx.contactUnlock.create({
      data: {
        userId: studentId,
        targetType: "TUTOR_PROFILE",
        targetId: tutorId,
        pointsSpent: UNLOCK_COST,
      },
    });

    await tx.pointTransaction.create({
      data: {
        userId: studentId,
        points: -UNLOCK_COST,
        type: "TUTOR_UNLOCK",
        description: `Unlocked contact details for Tutor: ${tutor.name}`,
      },
    });

    return { updatedStudent, unlockRecord };
  });

  return {
    alreadyUnlocked: false,
    unlocked: true,
    pointsSpent: UNLOCK_COST,
    pointsRemaining: result.updatedStudent.rewardPoints,
    tutorContact: {
      id: tutor.id,
      name: tutor.name,
      mobile: tutor.mobile || "Contact via TutorKhojo Chat",
      email: tutor.email,
      city: tutor.city || "Dhaka",
      institution: tutor.tutorProfile?.institution,
      department: tutor.tutorProfile?.department,
    },
  };
};

const unlockTuitionContact = async (tutorId: string, tuitionPostId: string) => {
  const [tutor, post] = await Promise.all([
    prisma.user.findUnique({ where: { id: tutorId, role: "tutor", deletedAt: null } }),
    prisma.tuitionPost.findUnique({
      where: { id: tuitionPostId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
            city: true,
          },
        },
      },
    }),
  ]);

  if (!tutor) throw new AppError("Tutor account not found", 404);
  if (!post) throw new AppError("Tuition post not found", 404);

  // Check if already unlocked
  const existingUnlock = await prisma.contactUnlock.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: tutorId,
        targetType: "TUITION_POST",
        targetId: tuitionPostId,
      },
    },
  });

  if (existingUnlock) {
    return {
      alreadyUnlocked: true,
      pointsRemaining: tutor.rewardPoints,
      studentContact: {
        name: post.student.name,
        mobile: post.student.mobile || "Contact via Chat",
        email: post.student.email,
        location: post.location,
      },
    };
  }

  // Cost is 10 points
  const UNLOCK_COST = 10;
  if (tutor.rewardPoints < UNLOCK_COST) {
    throw new AppError(
      `Insufficient points. You need at least ${UNLOCK_COST} points to unlock guardian/student contact details. Your current balance is ${tutor.rewardPoints} points.`,
      400
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTutor = await tx.user.update({
      where: { id: tutorId },
      data: {
        rewardPoints: { decrement: UNLOCK_COST },
      },
      select: {
        rewardPoints: true,
      },
    });

    const unlockRecord = await tx.contactUnlock.create({
      data: {
        userId: tutorId,
        targetType: "TUITION_POST",
        targetId: tuitionPostId,
        pointsSpent: UNLOCK_COST,
      },
    });

    await tx.pointTransaction.create({
      data: {
        userId: tutorId,
        points: -UNLOCK_COST,
        type: "TUITION_CONTACT_UNLOCK",
        description: `Unlocked student contact for Tuition Post #${post.id.slice(0, 8)} (${post.classLevel})`,
      },
    });

    return { updatedTutor, unlockRecord };
  });

  return {
    alreadyUnlocked: false,
    unlocked: true,
    pointsSpent: UNLOCK_COST,
    pointsRemaining: result.updatedTutor.rewardPoints,
    studentContact: {
      name: post.student.name,
      mobile: post.student.mobile || "Contact via Chat",
      email: post.student.email,
      location: post.location,
    },
  };
};

const getMyWallet = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rewardPoints: true,
    },
  });

  if (!user) throw new AppError("User not found", 404);

  const [unlocks, transactions] = await Promise.all([
    prisma.contactUnlock.findMany({
      where: { userId },
      select: {
        targetType: true,
        targetId: true,
        createdAt: true,
      },
    }),
    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const unlockedTutorIds = unlocks
    .filter((u) => u.targetType === "TUTOR_PROFILE")
    .map((u) => u.targetId);

  const unlockedTuitionIds = unlocks
    .filter((u) => u.targetType === "TUITION_POST")
    .map((u) => u.targetId);

  return {
    points: user.rewardPoints,
    unlockedTutorIds,
    unlockedTuitionIds,
    transactions,
  };
};

export const PointsService = {
  buyPackage,
  unlockTutorContact,
  unlockTuitionContact,
  getMyWallet,
};
