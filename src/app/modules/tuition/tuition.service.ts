import { Prisma } from "@prisma/client";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import {
  ICreateTuitionPost,
  ITuitionQueryFilters,
  IUpdateTuitionPost,
  TPostStatus,
} from "./tuition.interface";

const createTuitionPost = async (
  studentId: string,
  payload: ICreateTuitionPost
) => {
  const result = await prisma.tuitionPost.create({
    data: {
      studentId,
      title: payload.title || payload.classLevel,
      classLevel: payload.classLevel,
      subjects: payload.subjects,
      budget: payload.budget,
      mode: payload.mode || "Home",
      frequency: payload.frequency || "3 Days / Week",
      location: payload.location,
      genderPreference: payload.genderPreference || "Any",
      extraNotes: payload.extraNotes || null,
      status: "Active",
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
        },
      },
    },
  });

  return result;
};

const getMyTuitionPosts = async (studentId: string) => {
  const result = await prisma.tuitionPost.findMany({
    where: {
      studentId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return result;
};

const getAllTuitionPosts = async (filters: ITuitionQueryFilters) => {
  const {
    searchTerm,
    classLevel,
    subject,
    mode,
    location,
    status,
    minBudget,
    maxBudget,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const andConditions: Prisma.TuitionPostWhereInput[] = [];

  // Default to Active posts if not specified by public query
  if (status) {
    andConditions.push({ status: status as any });
  }

  if (searchTerm) {
    andConditions.push({
      OR: [
        { classLevel: { contains: searchTerm, mode: "insensitive" } },
        { location: { contains: searchTerm, mode: "insensitive" } },
        { title: { contains: searchTerm, mode: "insensitive" } },
        { subjects: { has: searchTerm } },
      ],
    });
  }

  if (classLevel && classLevel !== "All") {
    andConditions.push({
      classLevel: { contains: classLevel, mode: "insensitive" },
    });
  }

  if (location && location !== "All Dhaka" && location !== "All") {
    andConditions.push({
      location: { contains: location, mode: "insensitive" },
    });
  }

  if (mode && mode !== "All") {
    andConditions.push({
      mode: mode as any,
    });
  }

  if (subject && subject !== "All") {
    andConditions.push({
      subjects: { has: subject },
    });
  }

  if (minBudget !== undefined || maxBudget !== undefined) {
    const budgetCondition: Prisma.IntFilter = {};
    if (minBudget !== undefined) budgetCondition.gte = Number(minBudget);
    if (maxBudget !== undefined) budgetCondition.lte = Number(maxBudget);
    andConditions.push({ budget: budgetCondition });
  }

  const whereCondition: Prisma.TuitionPostWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [result, total] = await Promise.all([
    prisma.tuitionPost.findMany({
      where: whereCondition,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.tuitionPost.count({
      where: whereCondition,
    }),
  ]);

  return {
    metaData: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
    data: result,
  };
};

const getTuitionPostById = async (id: string) => {
  const result = await prisma.tuitionPost.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
        },
      },
    },
  });

  if (!result) {
    throw new AppError("Tuition post not found", 404);
  }

  return result;
};

const updateTuitionPost = async (
  id: string,
  userId: string,
  userRole: string,
  payload: IUpdateTuitionPost
) => {
  const existingPost = await prisma.tuitionPost.findUnique({
    where: { id },
  });

  if (!existingPost) {
    throw new AppError("Tuition post not found", 404);
  }

  // Ensure owner or admin
  if (existingPost.studentId !== userId && userRole !== "admin") {
    throw new AppError("You are not authorized to update this tuition post", 403);
  }

  const result = await prisma.tuitionPost.update({
    where: { id },
    data: {
      title: payload.title !== undefined ? payload.title : payload.classLevel !== undefined ? payload.classLevel : undefined,
      classLevel: payload.classLevel,
      subjects: payload.subjects,
      budget: payload.budget,
      mode: payload.mode,
      frequency: payload.frequency,
      location: payload.location,
      status: payload.status,
      genderPreference: payload.genderPreference,
      extraNotes: payload.extraNotes,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return result;
};

const updatePostStatus = async (
  id: string,
  userId: string,
  userRole: string,
  status: TPostStatus
) => {
  const existingPost = await prisma.tuitionPost.findUnique({
    where: { id },
  });

  if (!existingPost) {
    throw new AppError("Tuition post not found", 404);
  }

  if (existingPost.studentId !== userId && userRole !== "admin") {
    throw new AppError("You are not authorized to update this status", 403);
  }

  const result = await prisma.tuitionPost.update({
    where: { id },
    data: { status },
  });

  return result;
};

const deleteTuitionPost = async (
  id: string,
  userId: string,
  userRole: string
) => {
  const existingPost = await prisma.tuitionPost.findUnique({
    where: { id },
  });

  if (!existingPost) {
    throw new AppError("Tuition post not found", 404);
  }

  if (existingPost.studentId !== userId && userRole !== "admin") {
    throw new AppError("You are not authorized to delete this tuition post", 403);
  }

  await prisma.tuitionPost.delete({
    where: { id },
  });

  return { message: "Tuition post deleted successfully" };
};

const getStudentDashboardStats = async (studentId: string) => {
  const [totalPosts, activePosts, pausedPosts] = await Promise.all([
    prisma.tuitionPost.count({ where: { studentId } }),
    prisma.tuitionPost.count({ where: { studentId, status: "Active" } }),
    prisma.tuitionPost.count({ where: { studentId, status: "Paused" } }),
  ]);

  return {
    totalPosts,
    activePosts,
    pausedPosts,
  };
};

export const TuitionService = {
  createTuitionPost,
  getMyTuitionPosts,
  getAllTuitionPosts,
  getTuitionPostById,
  updateTuitionPost,
  updatePostStatus,
  deleteTuitionPost,
  getStudentDashboardStats,
};
