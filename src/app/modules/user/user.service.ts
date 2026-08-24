import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { IUpdateProfile, IUpdateUserStatus } from "./user.interface";
import { NotificationService } from "../notification/notification.service";
import { calculateTutorProfileCompleteness } from "../tuition/tuition.service";
import { enqueueEmail } from "../../queues/email.queue";
import { getTutorVerificationEmailTemplate } from "../../utils/templates/tutorVerification.template";
import { getAccountRoleUpdateEmailTemplate, getAccountStatusUpdateEmailTemplate } from "../../utils/templates/accountStatus.template";

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
  referralCode: true,
  rewardPoints: true,
  createdAt: true,
  updatedAt: true,
  tutorProfile: true,
};

const getMe = async (userId: string) => {
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelectFields,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Generate referral code if missing
  if (!user.referralCode) {
    const code = `TK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    user = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: userSelectFields,
    });
  }

  const { tutorProfile, ...userFields } = user as any;
  return {
    ...userFields,
    ...(tutorProfile || {}),
  };
};

const updateMe = async (userId: string, payload: IUpdateProfile) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const {
    name, fullName, mobile, dob, gender, city, bio, profilePic, isFirstLogin,
    salary, expectedSalary, qualifications,
    ...rest
  } = payload as any;

  const userUpdateData: any = {};
  if (fullName) userUpdateData.name = fullName;
  else if (name) userUpdateData.name = name;

  if (mobile !== undefined) userUpdateData.mobile = mobile;
  if (dob !== undefined) userUpdateData.dob = dob;
  if (gender !== undefined) userUpdateData.gender = gender;
  if (city !== undefined) userUpdateData.city = city;
  if (bio !== undefined) userUpdateData.bio = bio;
  if (profilePic !== undefined) userUpdateData.profilePic = profilePic;
  if (isFirstLogin !== undefined) userUpdateData.isFirstLogin = isFirstLogin;

  const tutorUpdateData: any = {};
  
  const tutorFieldsList = [
    "subjects", "tuitionModes", "availability", "totalYearsExp", "experiences",
    "certificateUrl", "nidCardUrl", "studentIdCardUrl", "videoIntroUrl", "curriculums",
    "specializations", "verificationStatus", "verificationSubmittedAt", "verificationRejectionReason",
    "isPriorityListed", "isTutorOfTheMonth", "isPhonePrivate"
  ];

  tutorFieldsList.forEach(field => {
    if (rest[field] !== undefined) {
      tutorUpdateData[field] = rest[field];
    }
  });

  if (salary !== undefined && salary !== null && !isNaN(Number(salary))) {
    tutorUpdateData.expectedSalary = Number(salary);
  } else if (expectedSalary !== undefined && expectedSalary !== null && !isNaN(Number(expectedSalary))) {
    tutorUpdateData.expectedSalary = Number(expectedSalary);
  }

  if (qualifications !== undefined) {
    tutorUpdateData.qualifications = qualifications;
    if (Array.isArray(qualifications) && qualifications.length > 0) {
      const primary = qualifications[0];
      if (primary?.institution) tutorUpdateData.institution = primary.institution;
      if (primary?.subject) tutorUpdateData.department = primary.subject;
      if (primary?.level) tutorUpdateData.yearOfStudy = primary.level;
    }
  } else {
    if (rest.institution !== undefined) tutorUpdateData.institution = rest.institution;
    if (rest.department !== undefined) tutorUpdateData.department = rest.department;
    if (rest.yearOfStudy !== undefined) tutorUpdateData.yearOfStudy = rest.yearOfStudy;
  }

  const existingProfile = await prisma.tutorProfile.findUnique({
    where: { userId },
  });

  if (tutorUpdateData.nidCardUrl || tutorUpdateData.studentIdCardUrl) {
    const currentStatus = existingProfile?.verificationStatus || "None";
    if (currentStatus === "None" || currentStatus === "Rejected") {
      tutorUpdateData.verificationStatus = "Pending";
      tutorUpdateData.verificationSubmittedAt = new Date();
    }
  }

  const tempTutor = {
    ...user,
    ...userUpdateData,
    ...(existingProfile || {}),
    ...tutorUpdateData
  };
  const completeness = calculateTutorProfileCompleteness(tempTutor);
  if (completeness >= 100) {
    tutorUpdateData.isPriorityListed = true;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...userUpdateData,
      tutorProfile: {
        upsert: {
          update: tutorUpdateData,
          create: tutorUpdateData,
        }
      }
    },
    select: userSelectFields,
  });

  const { tutorProfile, ...userFields } = updatedUser as any;
  return {
    ...userFields,
    ...(tutorProfile || {}),
  };
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
        tutorProfile: {
          select: {
            verificationStatus: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  const mappedUsers = users.map(u => {
    const { tutorProfile, ...userFields } = u;
    return {
      ...userFields,
      verificationStatus: tutorProfile?.verificationStatus || "None",
    };
  });

  return {
    data: mappedUsers,
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

  const userUpdateData: any = {};
  if (payload.status !== undefined) userUpdateData.status = payload.status;
  if (payload.role !== undefined) userUpdateData.role = payload.role;
  if (payload.isVerified !== undefined) userUpdateData.isVerified = payload.isVerified;

  const tutorUpdateData: any = {};
  if (payload.isVerified !== undefined) {
    tutorUpdateData.verificationStatus = payload.isVerified ? "Approved" : "None";
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...userUpdateData,
      ...(payload.isVerified !== undefined ? {
        tutorProfile: {
          upsert: {
            update: tutorUpdateData,
            create: tutorUpdateData,
          }
        }
      } : {})
    },
    select: userSelectFields,
  });

  // Notify user if role is updated
  if (payload.role !== undefined && payload.role !== user.role) {
    NotificationService.sendNotification({
      userId,
      title: "Account Role Updated 🔄",
      message: `Your account role has been updated to ${payload.role}.`,
      type: "ROLE_UPDATE",
      link: "/dashboard",
    }).catch((err) => console.error("[Notification] Role update notification failed:", err));

    const emailHtml = getAccountRoleUpdateEmailTemplate(user.name, payload.role);
    enqueueEmail(user.email, "Account Role Updated 🔄", emailHtml)
      .catch((err) => console.error("[Email] Role update email failed:", err));
  }

  // Notify user if status is updated
  if (payload.status !== undefined && payload.status !== user.status) {
    const isBlocked = payload.status === "blocked";
    NotificationService.sendNotification({
      userId,
      title: isBlocked ? "Account Suspended ⚠️" : "Account Reactivated ✅",
      message: isBlocked 
        ? "Your account has been blocked/suspended. Please check your email for details."
        : "Your account status has been restored. You can now use the platform normally.",
      type: "STATUS_UPDATE",
      link: "/dashboard",
    }).catch((err) => console.error("[Notification] Status update notification failed:", err));

    const emailHtml = getAccountStatusUpdateEmailTemplate(user.name, payload.status);
    enqueueEmail(user.email, isBlocked ? "Account Suspended ⚠️" : "Account Reactivated", emailHtml)
      .catch((err) => console.error("[Email] Status update email failed:", err));
  }

  const { tutorProfile, ...userFields } = updatedUser as any;
  return {
    ...userFields,
    ...(tutorProfile || {}),
  };
};

const onboardTutor = async (userId: string, payload: any) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { fullName, salary, expectedSalary, qualifications, ...rest } = payload;

  const userUpdateData: any = {
    role: "tutor",
    isFirstLogin: false,
    isVerified: true,
  };
  if (fullName) {
    userUpdateData.name = fullName;
  }
  ["mobile", "dob", "gender", "city", "bio", "profilePic"].forEach(field => {
    if (rest[field] !== undefined) {
      userUpdateData[field] = rest[field];
    }
  });

  const tutorUpdateData: any = {
    verificationStatus: "Approved",
  };

  const tutorFieldsList = [
    "subjects", "tuitionModes", "availability", "totalYearsExp", "experiences",
    "certificateUrl", "nidCardUrl", "studentIdCardUrl", "videoIntroUrl", "curriculums",
    "specializations", "isPhonePrivate"
  ];
  tutorFieldsList.forEach(field => {
    if (rest[field] !== undefined) {
      tutorUpdateData[field] = rest[field];
    }
  });

  if (salary !== undefined && salary !== null && !isNaN(Number(salary))) {
    tutorUpdateData.expectedSalary = Number(salary);
  } else if (expectedSalary !== undefined && expectedSalary !== null && !isNaN(Number(expectedSalary))) {
    tutorUpdateData.expectedSalary = Number(expectedSalary);
  }

  if (qualifications !== undefined) {
    tutorUpdateData.qualifications = qualifications;
    if (Array.isArray(qualifications) && qualifications.length > 0) {
      const primary = qualifications[0];
      if (primary?.institution) tutorUpdateData.institution = primary.institution;
      if (primary?.subject) tutorUpdateData.department = primary.subject;
      if (primary?.level) tutorUpdateData.yearOfStudy = primary.level;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...userUpdateData,
      tutorProfile: {
        upsert: {
          update: tutorUpdateData,
          create: tutorUpdateData,
        }
      }
    },
    select: userSelectFields,
  });

  const { tutorProfile, ...userFields } = updatedUser as any;
  return {
    ...userFields,
    ...(tutorProfile || {}),
  };
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
    prisma.user.count({ where: { role: "tutor", tutorProfile: { verificationStatus: "Pending" } } }),
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
      tutorProfile: {
        verificationStatus: {
          not: "None",
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      tutorProfile: {
        select: {
          institution: true,
          department: true,
          yearOfStudy: true,
          subjects: true,
          certificateUrl: true,
          nidCardUrl: true,
          verificationStatus: true,
        }
      }
    },
  });

  return tutors.map((t) => {
    const profile = t.tutorProfile;
    return {
      id: t.id,
      tutorName: t.name,
      email: t.email,
      institution: profile?.institution || "N/A",
      department: profile?.department || "N/A",
      yearOfStudy: profile?.yearOfStudy || "N/A",
      subjects: profile?.subjects || [],
      certificateUrl: profile?.certificateUrl || "transcript.pdf",
      nidCardUrl: profile?.nidCardUrl || "nid.jpg",
      status: profile?.verificationStatus || "None",
      submissionDate: t.createdAt.toISOString().split("T")[0],
    };
  });
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
      isVerified: status === "Approved" ? true : user.isVerified,
      tutorProfile: {
        update: {
          verificationStatus: status,
        }
      }
    },
    select: userSelectFields,
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

  // Enqueue verification email status update via BullMQ
  const emailHtml = getTutorVerificationEmailTemplate(user.name, status);
  enqueueEmail(user.email, status === "Approved" ? "Tutor Profile Verified! ✅" : "Tutor Verification Update", emailHtml)
    .catch((err) => console.error("[Email] Failed to enqueue verification status email:", err));

  const { tutorProfile, ...userFields } = updatedUser as any;
  return {
    ...userFields,
    ...(tutorProfile || {}),
  };
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

const getAllPublicTutors = async (query?: { search?: string; subject?: string; location?: string }) => {
  const where: any = {
    role: "tutor",
    status: "active",
    deletedAt: null,
  };

  if (query?.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { city: { contains: query.search, mode: "insensitive" } },
      { tutorProfile: { institution: { contains: query.search, mode: "insensitive" } } },
      { tutorProfile: { department: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  if (query?.location && query.location !== "Dhaka" && query.location !== "All") {
    where.city = { contains: query.location, mode: "insensitive" };
  }

  if (query?.subject) {
    where.tutorProfile = {
      ...where.tutorProfile,
      subjects: { has: query.subject }
    };
  }

  const tutors = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      gender: true,
      city: true,
      bio: true,
      profilePic: true,
      isVerified: true,
      tutorProfile: true,
      reviewsReceived: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          student: {
            select: {
              name: true,
            },
          },
        },
      },
      createdAt: true,
    },
    orderBy: [
      { tutorProfile: { isTutorOfTheMonth: "desc" } },
      { tutorProfile: { isPriorityListed: "desc" } },
      { tutorProfile: { verificationStatus: "desc" } },
      { createdAt: "desc" },
    ],
  });

  return tutors.map(t => {
    const { tutorProfile, ...userFields } = t;
    return {
      ...userFields,
      ...(tutorProfile || {}),
    };
  });
};

const getPublicTutorById = async (id: string) => {
  const tutor = await prisma.user.findFirst({
    where: {
      id,
      role: "tutor",
      status: "active",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      gender: true,
      city: true,
      bio: true,
      profilePic: true,
      isVerified: true,
      tutorProfile: true,
      reviewsReceived: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          student: {
            select: {
              name: true,
            },
          },
        },
      },
      createdAt: true,
    },
  });

  if (!tutor) {
    throw new AppError("Tutor not found", 404);
  }

  const { tutorProfile, ...userFields } = tutor;
  return {
    ...userFields,
    ...(tutorProfile || {}),
  };
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
  getAllPublicTutors,
  getPublicTutorById,
  updateUserStatus,
  deleteUser,
};
