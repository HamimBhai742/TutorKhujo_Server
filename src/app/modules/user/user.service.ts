import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { IUpdateProfile, IUpdateUserStatus } from "./user.interface";
import { NotificationService } from "../notification/notification.service";

const userSelectFields = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  status: true,
  isVerified: true,
  isFirstLogin: true,
  gender: true,
  dob: true,
  city: true,
  bio: true,
  profilePic: true,
  institution: true,
  department: true,
  yearOfStudy: true,
  qualifications: true,
  subjects: true,
  tuitionModes: true,
  expectedSalary: true,
  availability: true,
  totalYearsExp: true,
  experiences: true,
  certificateUrl: true,
  nidCardUrl: true,
  verificationStatus: true,
  createdAt: true,
  updatedAt: true,
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelectFields,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const updateMe = async (userId: string, payload: IUpdateProfile) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { fullName, salary, expectedSalary, qualifications, ...rest } = payload as any;

  const updateData: any = { ...rest };

  if (fullName) {
    updateData.name = fullName;
  }
  if (salary !== undefined && salary !== null && !isNaN(Number(salary))) {
    updateData.expectedSalary = Number(salary);
  } else if (expectedSalary !== undefined && expectedSalary !== null && !isNaN(Number(expectedSalary))) {
    updateData.expectedSalary = Number(expectedSalary);
  }

  if (qualifications !== undefined) {
    updateData.qualifications = qualifications;
    if (Array.isArray(qualifications) && qualifications.length > 0) {
      const primary = qualifications[0];
      if (primary?.institution) updateData.institution = primary.institution;
      if (primary?.subject) updateData.department = primary.subject;
      if (primary?.level) updateData.yearOfStudy = primary.level;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: userSelectFields,
  });

  return updatedUser;
};

const getAllUsers = async (query: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100); // max 100 per request
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { deletedAt: null };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.role) {
    where.role = query.role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        mobile: true,
        isVerified: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelectFields,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const updateUserStatus = async (
  userId: string,
  payload: IUpdateUserStatus
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updateData: any = { ...payload };
  if (payload.isVerified !== undefined) {
    updateData.verificationStatus = payload.isVerified ? "Approved" : "None";
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: userSelectFields,
  });

  return updatedUser;
};

const onboardTutor = async (userId: string, payload: any) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { fullName, salary, expectedSalary, qualifications, ...rest } = payload;

  const updateData: any = {
    ...rest,
    role: "tutor",
    isFirstLogin: false,
    isVerified: true,
    verificationStatus: "Approved",
  };

  if (fullName) {
    updateData.name = fullName;
  }
  if (salary !== undefined && salary !== null && !isNaN(Number(salary))) {
    updateData.expectedSalary = Number(salary);
  } else if (expectedSalary !== undefined && expectedSalary !== null && !isNaN(Number(expectedSalary))) {
    updateData.expectedSalary = Number(expectedSalary);
  }

  if (qualifications !== undefined) {
    updateData.qualifications = qualifications;
    if (Array.isArray(qualifications) && qualifications.length > 0) {
      const primary = qualifications[0];
      if (primary?.institution) updateData.institution = primary.institution;
      if (primary?.subject) updateData.department = primary.subject;
      if (primary?.level) updateData.yearOfStudy = primary.level;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: userSelectFields,
  });

  return updatedUser;
};

const getAdminStats = async () => {
  const [
    totalUsers,
    totalTutors,
    totalStudents,
    pendingVerifications,
    totalTuitions,
    activeTuitions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "tutor" } }),
    prisma.user.count({ where: { role: "student" } }),
    prisma.user.count({ where: { verificationStatus: "Pending" } }),
    prisma.tuitionPost.count(),
    prisma.tuitionPost.count({ where: { status: "Active" } }),
  ]);

  const transactions = await prisma.transaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      type: "Invoice_Payment",
      status: "Success",
    },
  });

  return {
    totalUsers,
    totalTutors,
    totalStudents,
    pendingVerifications,
    totalTuitions,
    activeTuitions,
    totalRevenue: transactions._sum.amount || 0,
  };
};

const getPendingVerifications = async () => {
  const tutors = await prisma.user.findMany({
    where: {
      role: "tutor",
      deletedAt: null,
      verificationStatus: {
        not: "None",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      institution: true,
      department: true,
      yearOfStudy: true,
      subjects: true,
      certificateUrl: true,
      nidCardUrl: true,
      verificationStatus: true,
      createdAt: true,
    },
  });

  return tutors.map((t) => ({
    id: t.id,
    tutorName: t.name,
    email: t.email,
    institution: t.institution || "N/A",
    department: t.department || "N/A",
    yearOfStudy: t.yearOfStudy || "N/A",
    subjects: t.subjects,
    certificateUrl: t.certificateUrl || "transcript.pdf",
    nidCardUrl: t.nidCardUrl || "nid.jpg",
    status: t.verificationStatus,
    submissionDate: t.createdAt.toISOString().split("T")[0],
  }));
};

const updateVerificationStatus = async (
  userId: string,
  status: "Approved" | "Rejected"
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      verificationStatus: status,
      isVerified: status === "Approved" ? true : user.isVerified,
    },
  });

  // Notify the tutor about their verification decision
  const notifPayload =
    status === "Approved"
      ? {
          title: "Tutor Verification Approved! ✅",
          message: "Congratulations! Your tutor profile has been verified by our team. You can now apply for tuitions across the platform.",
          link: "/dashboard",
        }
      : {
          title: "Verification Not Approved",
          message: "Your tutor verification was reviewed but not approved. Please re-submit valid documents or contact support for assistance.",
          link: "/tutor-onboarding",
        };

  NotificationService.sendNotification({
    userId,
    title: notifPayload.title,
    message: notifPayload.message,
    type: "VERIFICATION_STATUS",
    link: notifPayload.link,
  }).catch((err) => console.error("[Notification] Failed to notify tutor of verification status:", err));

  return updatedUser;
};

const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new AppError("User not found", 404);
  }

  // Soft delete — mark deletedAt timestamp and set status inactive
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      status: "inactive",
    },
  });

  return { message: "User deleted successfully" };
};

export const UserService = {
  getMe,
  updateMe,
  onboardTutor,
  getAdminStats,
  getPendingVerifications,
  updateVerificationStatus,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
};
