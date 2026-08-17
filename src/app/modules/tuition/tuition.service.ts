import { Prisma } from "@prisma/client";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { NotificationService } from "../notification/notification.service";
import {
  ICreateApplication,
  ICreateTuitionPost,
  ITuitionQueryFilters,
  IUpdateTuitionPost,
  TApplicationStatus,
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

  // Notify matching tutors in background
  NotificationService.notifyMatchingTutors(result);

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
        _count: {
          select: { applications: true }, // Avoids N+1 query for applicant count
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
  const [totalPosts, activePosts, pausedPosts, totalApplications] = await Promise.all([
    prisma.tuitionPost.count({ where: { studentId } }),
    prisma.tuitionPost.count({ where: { studentId, status: "Active" } }),
    prisma.tuitionPost.count({ where: { studentId, status: "Paused" } }),
    prisma.tuitionApplication.count({ where: { tuitionPost: { studentId } } }),
  ]);

  return {
    totalPosts,
    activePosts,
    pausedPosts,
    totalApplications,
  };
};

const applyForTuition = async (
  tuitionPostId: string,
  tutorId: string,
  payload: ICreateApplication
) => {
  const tutor = await prisma.user.findUnique({
    where: { id: tutorId },
  });

  if (!tutor || tutor.deletedAt) {
    throw new AppError("Tutor profile not found", 404);
  }

  if (tutor.role !== "tutor") {
    throw new AppError("Only registered tutors can apply for tuition posts", 403);
  }

  if (tutor.verificationStatus !== "Approved" && !tutor.isVerified) {
    throw new AppError(
      tutor.verificationStatus === "Pending"
        ? "Your tutor profile is currently pending verification. An admin must approve your profile documents before you can submit tuition applications."
        : "Please complete your tutor profile verification and submit required documents before applying for tuition posts.",
      403
    );
  }

  const post = await prisma.tuitionPost.findUnique({
    where: { id: tuitionPostId },
  });

  if (!post) {
    throw new AppError("Tuition post not found", 404);
  }

  if (post.status !== "Active") {
    throw new AppError("This tuition post is currently not accepting applications", 400);
  }

  if (post.studentId === tutorId) {
    throw new AppError("You cannot apply to your own tuition post", 400);
  }

  const existingApplication = await prisma.tuitionApplication.findUnique({
    where: {
      tuitionPostId_tutorId: {
        tuitionPostId,
        tutorId,
      },
    },
  });

  if (existingApplication) {
    throw new AppError("You have already applied for this tuition post", 400);
  }

  const result = await prisma.tuitionApplication.create({
    data: {
      tuitionPostId,
      tutorId,
      salaryBid: payload.salaryBid,
      proposal: payload.proposal || null,
      status: "Pending",
    },
    include: {
      tuitionPost: true,
      tutor: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
        },
      },
    },
  });

  // Notify the student that a tutor has applied to their post
  NotificationService.sendNotification({
    userId: post.studentId,
    title: "New Tutor Application! 📝",
    message: `${result.tutor.name} has applied for your ${post.classLevel} tuition post. Bid: ৳${payload.salaryBid}/month.`,
    type: "NEW_APPLICATION",
    link: "/dashboard?tab=applications",
  }).catch((err) => console.error("[Notification] Failed to notify student of new application:", err));

  return result;
};

const getMyReceivedApplications = async (studentId: string) => {
  const result = await prisma.tuitionApplication.findMany({
    where: {
      tuitionPost: {
        studentId,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      tutor: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
        },
      },
      tuitionPost: {
        select: {
          id: true,
          title: true,
          classLevel: true,
          subjects: true,
          budget: true,
          location: true,
          mode: true,
          status: true,
        },
      },
    },
  });

  return result;
};

const getTutorAppliedPosts = async (tutorId: string) => {
  const applications = await prisma.tuitionApplication.findMany({
    where: {
      tutorId,
    },
    include: {
      tuitionPost: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return applications;
};

const updateApplicationStatus = async (
  applicationId: string,
  userId: string,
  userRole: string,
  status: TApplicationStatus
) => {
  const application = await prisma.tuitionApplication.findUnique({
    where: { id: applicationId },
    include: {
      tuitionPost: true,
    },
  });

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  if (
    application.tuitionPost.studentId !== userId &&
    application.tutorId !== userId &&
    userRole !== "admin"
  ) {
    throw new AppError("You are not authorized to update this application", 403);
  }

  const result = await prisma.tuitionApplication.update({
    where: { id: applicationId },
    data: { status },
    include: {
      tutor: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
        },
      },
      tuitionPost: true,
    },
  });

  // If status is "Hired", automatically pause the tuition post
  if (status === "Hired") {
    await prisma.tuitionPost.update({
      where: { id: application.tuitionPostId },
      data: { status: "Paused" },
    });
  }

  // Notify the tutor about their application status change
  const statusMessages: Record<string, { title: string; message: string }> = {
    Shortlisted: {
      title: "You've been Shortlisted! 🌟",
      message: `Great news! You have been shortlisted for the ${result.tuitionPost.classLevel} tuition post. Await the student's final decision.`,
    },
    Hired: {
      title: "Congratulations! You're Hired! 🎉",
      message: `You have been selected for the ${result.tuitionPost.classLevel} tuition post. Please contact the student to confirm your schedule.`,
    },
    Rejected: {
      title: "Application Update",
      message: `Your application for the ${result.tuitionPost.classLevel} tuition post was not selected this time. Keep applying!`,
    },
  };

  const notifContent = statusMessages[status];
  if (notifContent) {
    NotificationService.sendNotification({
      userId: application.tutorId,
      title: notifContent.title,
      message: notifContent.message,
      type: "APPLICATION_STATUS",
      link: "/dashboard?tab=overview",
    }).catch((err) => console.error("[Notification] Failed to notify tutor of status change:", err));
  }

  return result;
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
  applyForTuition,
  getMyReceivedApplications,
  getTutorAppliedPosts,
  updateApplicationStatus,
};
