import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { IUpdateProfile, IUpdateUserStatus } from "./user.interface";
import { NotificationService } from "../notification/notification.service";
import { calculateTutorProfileCompleteness } from "../tuition/tuition.service";
import { enqueueEmail } from "../../queues/email.queue";
import { getTutorVerificationEmailTemplate } from "../../utils/templates/tutorVerification.template";
import { getAccountRoleUpdateEmailTemplate, getAccountStatusUpdateEmailTemplate } from "../../utils/templates/accountStatus.template";
import { getAccountDeletedEmailTemplate } from "../../utils/templates/accountDeleted.template";

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

const formatUserWithTutorProfile = (user: any) => {
  if (!user) return null;
  const { tutorProfile, ...userFields } = user;
  const { id: _tutorProfileId, userId: _userId, createdAt: _tpCreatedAt, updatedAt: _tpUpdatedAt, ...tutorProfileFields } = tutorProfile || {};
  return {
    ...tutorProfileFields,
    ...userFields,
    id: userFields.id,
    tutorProfileId: _tutorProfileId,
  };
};

const getMe = async (userId: string) => {
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSelectFields,
      reviewsReceived: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              profilePic: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      applications: {
        select: { status: true },
      },
      tuitionPosts: {
        select: { status: true },
      },
    },
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
      select: {
        ...userSelectFields,
        reviewsReceived: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        applications: {
          select: { status: true },
        },
        tuitionPosts: {
          select: { status: true },
        },
      },
    });
  }

  const reviews = user.reviewsReceived || [];
  const applications = user.applications || [];
  const tuitionPosts = user.tuitionPosts || [];

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 5.0;

  const hiredCount = applications.filter((a) => a.status === "Hired").length;
  const activePostsCount = tuitionPosts.filter((p) => p.status === "Active").length;

  let badgesCount = 1;
  if (user.isVerified) badgesCount++;
  if (user.isFirstLogin === false) badgesCount++;
  if (user.profilePic) badgesCount++;
  if (user.tutorProfile?.verificationStatus === "Approved") badgesCount += 2;
  if (hiredCount > 0) badgesCount += hiredCount;

  const stats = {
    rating: avgRating,
    totalReviews,
    studentsCount: hiredCount,
    hiredCount,
    appliedCount: applications.length,
    experience: user.tutorProfile?.totalYearsExp || "1+ Yrs",
    badgesCount,
    totalPosts: tuitionPosts.length,
    activePosts: activePostsCount,
    rewardPoints: user.rewardPoints || 0,
  };

  const formatted = formatUserWithTutorProfile(user);
  return {
    ...formatted,
    reviewsReceived: reviews,
    stats,
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
    subjects, tuitionMode, tuitionModes,
    availability, totalYearsExp, experiences,
    certificateUrl, nidCardUrl, studentIdCardUrl, videoIntroUrl,
    curriculums, specializations, isPhonePrivate
  } = payload as any;

  const userUpdateData: any = {};
  if (name !== undefined || fullName !== undefined) userUpdateData.name = name || fullName;
  if (mobile !== undefined) userUpdateData.mobile = mobile;
  if (dob !== undefined) userUpdateData.dob = dob;
  if (gender !== undefined) userUpdateData.gender = gender;
  if (city !== undefined) userUpdateData.city = city;
  if (bio !== undefined) userUpdateData.bio = bio;
  if (profilePic !== undefined) userUpdateData.profilePic = profilePic;
  if (isFirstLogin !== undefined) userUpdateData.isFirstLogin = isFirstLogin;

  const tutorUpdateData: any = {};
  if (payload.institution !== undefined) tutorUpdateData.institution = payload.institution;
  if (payload.department !== undefined) tutorUpdateData.department = payload.department;
  if (payload.yearOfStudy !== undefined) tutorUpdateData.yearOfStudy = payload.yearOfStudy;
  if (qualifications !== undefined) tutorUpdateData.qualifications = qualifications;
  if (subjects !== undefined) tutorUpdateData.subjects = subjects;
  
  if (tuitionModes !== undefined) {
    tutorUpdateData.tuitionModes = Array.isArray(tuitionModes) ? tuitionModes : [tuitionModes];
  } else if (tuitionMode !== undefined) {
    tutorUpdateData.tuitionModes = Array.isArray(tuitionMode) ? tuitionMode : [tuitionMode];
  }
  
  if (expectedSalary !== undefined) tutorUpdateData.expectedSalary = expectedSalary;
  else if (salary !== undefined) tutorUpdateData.expectedSalary = salary;

  if (availability !== undefined) tutorUpdateData.availability = availability;
  if (totalYearsExp !== undefined) tutorUpdateData.totalYearsExp = totalYearsExp;
  if (experiences !== undefined) tutorUpdateData.experiences = experiences;
  if (certificateUrl !== undefined) tutorUpdateData.certificateUrl = certificateUrl;
  if (nidCardUrl !== undefined) tutorUpdateData.nidCardUrl = nidCardUrl;
  if (studentIdCardUrl !== undefined) tutorUpdateData.studentIdCardUrl = studentIdCardUrl;
  if (videoIntroUrl !== undefined) tutorUpdateData.videoIntroUrl = videoIntroUrl;
  if (curriculums !== undefined) tutorUpdateData.curriculums = curriculums;
  if (specializations !== undefined) tutorUpdateData.specializations = specializations;
  if (isPhonePrivate !== undefined) tutorUpdateData.isPhonePrivate = isPhonePrivate;

  // Auto-fill institution and department from primary qualification if present
  if (Array.isArray(qualifications) && qualifications.length > 0) {
    const primaryQual = qualifications[0];
    if (primaryQual.institution && !tutorUpdateData.institution) {
      tutorUpdateData.institution = primaryQual.institution;
    }
    if (primaryQual.subject && !tutorUpdateData.department) {
      tutorUpdateData.department = primaryQual.subject;
    }
    if (primaryQual.level && !tutorUpdateData.yearOfStudy) {
      tutorUpdateData.yearOfStudy = primaryQual.level;
    }
  }

  // If submitting documents, set status to Pending
  if (certificateUrl || nidCardUrl || studentIdCardUrl) {
    const existingProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });
    if (!existingProfile || existingProfile.verificationStatus === "None" || existingProfile.verificationStatus === "Rejected") {
      tutorUpdateData.verificationStatus = "Pending";
      tutorUpdateData.verificationSubmittedAt = new Date();

      // Enqueue notification & email for admin
      NotificationService.sendNotification({
        userId,
        title: "Verification Under Review ⏳",
        message: "Your profile verification request has been submitted. Our team will review it shortly.",
        type: "VERIFICATION_SUBMITTED",
        link: "/profile",
      }).catch((err: any) => console.error("[Notification] Verification submitted notif failed:", err));
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

  return formatUserWithTutorProfile(updatedUser);
};

const getAllUsers = async (query: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where: any = { deletedAt: null };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { mobile: { contains: query.search, mode: "insensitive" } },
      { city: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.role && query.role !== "all") {
    where.role = query.role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        ...userSelectFields,
        tutorProfile: {
          select: {
            verificationStatus: true,
            totalYearsExp: true,
            expectedSalary: true,
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  const formattedUsers = users.map((u: any) => {
    const { tutorProfile, ...userFields } = u;
    return {
      ...userFields,
      verificationStatus: tutorProfile?.verificationStatus || "None",
      totalYearsExp: tutorProfile?.totalYearsExp || null,
      expectedSalary: tutorProfile?.expectedSalary || null,
    };
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: formattedUsers,
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

  return formatUserWithTutorProfile(user);
};

const updateUserStatus = async (
  userId: string,
  payload: { status: "active" | "blocked" | "inactive" }
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.deletedAt) {
    throw new AppError("User not found", 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: payload.status },
    select: userSelectFields,
  });

  // If status changed to blocked or active, notify user via notification and email
  if (payload.status !== user.status) {
    const isBlocked = payload.status === "blocked";
    NotificationService.sendNotification({
      userId,
      title: isBlocked ? "Account Suspended ⚠️" : "Account Reactivated ✅",
      message: isBlocked
        ? "Your account has been suspended by the administrator. Contact support for assistance."
        : "Your account status has been restored. You can now use the platform normally.",
      type: "STATUS_UPDATE",
      link: "/dashboard",
    }).catch((err: any) => console.error("[Notification] Status update notification failed:", err));

    const emailHtml = getAccountStatusUpdateEmailTemplate(user.name, payload.status);
    enqueueEmail(user.email, isBlocked ? "Account Suspended ⚠️" : "Account Reactivated", emailHtml)
      .catch((err) => console.error("[Email] Status update email failed:", err));
  }

  return formatUserWithTutorProfile(updatedUser);
};

const onboardTutor = async (userId: string, payload: any) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const {
    gender,
    city,
    bio,
    institution,
    department,
    yearOfStudy,
    qualifications,
    subjects,
    tuitionModes,
    expectedSalary,
    availability,
    totalYearsExp,
    experiences,
    certificateUrl,
    nidCardUrl,
    studentIdCardUrl,
    videoIntroUrl,
    curriculums,
    specializations,
    isPhonePrivate
  } = payload;

  const userUpdateData: any = { isFirstLogin: false };
  if (gender) userUpdateData.gender = gender;
  if (city) userUpdateData.city = city;
  if (bio) userUpdateData.bio = bio;

  const tutorUpdateData: any = {
    institution,
    department,
    yearOfStudy,
    qualifications: qualifications || [],
    subjects: subjects || [],
    tuitionModes: tuitionModes || [],
    expectedSalary: expectedSalary ? Number(expectedSalary) : null,
    availability,
    totalYearsExp,
    experiences: experiences || [],
    certificateUrl,
    nidCardUrl,
    studentIdCardUrl,
    videoIntroUrl,
    curriculums: curriculums || [],
    specializations: specializations || [],
    isPhonePrivate: isPhonePrivate ?? true,
    verificationStatus: certificateUrl || nidCardUrl || studentIdCardUrl ? "Pending" : "None",
    verificationSubmittedAt: certificateUrl || nidCardUrl || studentIdCardUrl ? new Date() : null,
  };

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

  return formatUserWithTutorProfile(updatedUser);
};

const getAdminStats = async () => {
  const [
    totalUsers,
    totalTutors,
    totalStudents,
    pendingVerifications,
    totalTuitions,
    activeTuitions,
    hiredTuitions,
    totalApplications,
    pendingApplications,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "tutor", deletedAt: null } }),
    prisma.user.count({ where: { role: "student", deletedAt: null } }),
    prisma.user.count({ where: { role: "tutor", tutorProfile: { verificationStatus: "Pending" } } }),
    prisma.tuitionPost.count(),
    prisma.tuitionPost.count({ where: { status: "Active" } }),
    prisma.tuitionPost.count({ where: { status: "Closed" } }),
    prisma.tuitionApplication.count(),
    prisma.tuitionApplication.count({ where: { status: "Pending" } }),
  ]);

  return {
    totalUsers,
    totalTutors,
    totalStudents,
    pendingVerifications,
    totalTuitions,
    activeTuitions,
    hiredTuitions,
    totalApplications,
    pendingApplications,
  };
};

const getPendingVerifications = async () => {
  const tutors = await prisma.user.findMany({
    where: {
      role: "tutor",
      deletedAt: null,
      tutorProfile: {
        verificationStatus: "Pending",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      city: true,
      profilePic: true,
      tutorProfile: {
        select: {
          institution: true,
          department: true,
          yearOfStudy: true,
          certificateUrl: true,
          nidCardUrl: true,
          studentIdCardUrl: true,
          verificationStatus: true,
          verificationSubmittedAt: true,
        },
      },
      createdAt: true,
    },
    orderBy: {
      tutorProfile: {
        verificationSubmittedAt: "desc",
      },
    },
  });

  return tutors.map((t) => {
    const profile = t.tutorProfile;
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      mobile: t.mobile,
      city: t.city,
      profilePic: t.profilePic,
      institution: profile?.institution || "N/A",
      department: profile?.department || "N/A",
      yearOfStudy: profile?.yearOfStudy || "N/A",
      certificateUrl: profile?.certificateUrl || null,
      nidCardUrl: profile?.nidCardUrl || null,
      studentIdCardUrl: profile?.studentIdCardUrl || null,
      verificationStatus: profile?.verificationStatus || "Pending",
      verificationSubmittedAt: profile?.verificationSubmittedAt || t.createdAt,
      createdAt: t.createdAt,
    };
  });
};

const updateVerificationStatus = async (
  userId: string,
  payload: {
    status: "Approved" | "Rejected";
    rejectionReason?: string;
  }
) => {
  const { status, rejectionReason } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tutorProfile: true },
  });

  if (!user || user.role !== "tutor" || user.deletedAt) {
    throw new AppError("Tutor not found", 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isVerified: status === "Approved",
      tutorProfile: {
        update: {
          verificationStatus: status,
          verificationRejectionReason: status === "Rejected" ? rejectionReason : null,
        },
      },
    },
    select: userSelectFields,
  });

  // Create in-app notification & send email via BullMQ
  const notifPayload = status === "Approved"
    ? {
        title: "Profile Verified! ✅",
        message: "Congratulations! Your tutor profile has been verified. You can now apply for all tuition posts.",
        link: "/dashboard",
      }
    : {
        title: "Verification Needs Attention ⚠️",
        message: `Your verification request was rejected. Reason: ${rejectionReason || "Documents provided were insufficient or unclear."} Please re-upload valid documents in your profile.`,
        link: "/profile",
      };

  NotificationService.sendNotification({
    userId,
    title: notifPayload.title,
    message: notifPayload.message,
    type: "VERIFICATION_STATUS",
    link: notifPayload.link,
  }).catch((err: any) => console.error("[Notification] Failed to notify tutor of verification status:", err));

  // Enqueue verification email status update via BullMQ
  const emailHtml = getTutorVerificationEmailTemplate(user.name, status);
  enqueueEmail(user.email, status === "Approved" ? "Tutor Profile Verified! ✅" : "Tutor Verification Update", emailHtml)
    .catch((err) => console.error("[Email] Failed to enqueue verification status email:", err));

  return formatUserWithTutorProfile(updatedUser);
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
      status: "inactive",
      deletedAt: new Date(),
    },
  });

  // Enqueue goodbye email via BullMQ
  enqueueEmail(user.email, "Account Deletion Confirmation", getAccountDeletedEmailTemplate(user.name))
    .catch((err: any) => console.error("[Email] Account deletion email failed:", err));

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
    select: userSelectFields,
    orderBy: [
      { tutorProfile: { isTutorOfTheMonth: "desc" } },
      { tutorProfile: { isPriorityListed: "desc" } },
      { tutorProfile: { verificationStatus: "desc" } },
      { createdAt: "desc" },
    ],
  });

  return tutors.map(t => formatUserWithTutorProfile(t));
};

const getPublicTutorById = async (id: string) => {
  const tutor = await prisma.user.findFirst({
    where: {
      OR: [
        { id },
        { tutorProfile: { id } }
      ],
      role: "tutor",
      status: "active",
      deletedAt: null,
    },
    select: userSelectFields,
  });

  if (!tutor) {
    throw new AppError("Tutor not found", 404);
  }

  return formatUserWithTutorProfile(tutor);
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
