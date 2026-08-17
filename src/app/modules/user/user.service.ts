import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { IUpdateProfile, IUpdateUserStatus } from "./user.interface";

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isVerified: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
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

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isVerified: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mobile: true,
      isVerified: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return users;
};

const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mobile: true,
      isVerified: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
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

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mobile: true,
      isVerified: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const deletedUser = await prisma.user.delete({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isVerified: true,
      createdAt: true,
    },
  });

  return deletedUser;
};

const onboardTutor = async (userId: string, payload: any) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { fullName, salary, ...rest } = payload;

  const updateData: any = {
    ...rest,
    isFirstLogin: false,
    verificationStatus: "Pending",
  };

  if (fullName) {
    updateData.name = fullName;
  }
  if (salary !== undefined) {
    updateData.expectedSalary = Number(salary);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isVerified: true,
      isFirstLogin: true,
      verificationStatus: true,
      createdAt: true,
      updatedAt: true,
    },
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
      isVerified: status === "Approved" ? true : false,
    },
  });

  return updatedUser;
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
