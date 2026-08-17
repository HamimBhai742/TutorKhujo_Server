import { Prisma } from "@prisma/client";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { NotificationService } from "../notification/notification.service";
import { sendEmail } from "../../utils/sendEmail";
import {
  ICreateApplication,
  ICreateTuitionPost,
  ITuitionQueryFilters,
  IUpdateTuitionPost,
  TApplicationStatus,
  TPostStatus,
} from "./tuition.interface";

const isInstitutionOrQualificationMatch = (
  reqQual: string,
  tutorInst: string,
  tutorDept: string,
  tutorBio: string,
  tutorExp: string
): boolean => {
  const req = reqQual.toLowerCase().trim();
  const inst = tutorInst.toLowerCase().trim();
  const dept = tutorDept.toLowerCase().trim();
  const bio = tutorBio.toLowerCase().trim();
  const allTutorText = `${inst} ${dept} ${bio} ${tutorExp.toLowerCase()}`;

  if (!req || req === "any" || req === "open for all") return true;

  // Broad Categories
  if (req.includes("public university")) {
    const publicKeywords = [
      "public", "du", "buet", "ju", "ru", "cu", "jnu", "sust", "cuet", "ruet",
      "kuet", "butex", "mist", "iut", "bup", "dmc", "medical", "bau", "just",
      "mbstu", "nstu", "pust", "pstu", "hstu", "cou", "jkkniu", "brur", "dhaka university",
      "chittagong university", "rajshahi university", "jahangirnagar"
    ];
    return publicKeywords.some((k) => allTutorText.includes(k));
  }

  if (req.includes("engineering")) {
    const engKeywords = [
      "buet", "cuet", "ruet", "kuet", "butex", "mist", "iut", "duet",
      "aust", "aiub", "engineering", "cse", "eee", "mechanical", "civil", "textile"
    ];
    return engKeywords.some((k) => allTutorText.includes(k));
  }

  if (req.includes("medical") || req.includes("mbbs") || req.includes("bds")) {
    const medKeywords = [
      "medical", "mbbs", "bds", "dmc", "ssmc", "mmc", "cmc", "rmc",
      "suhrawardy", "doctor", "dental", "pharma", "pharmacy"
    ];
    return medKeywords.some((k) => allTutorText.includes(k));
  }

  if (req.includes("private university")) {
    const privKeywords = [
      "nsu", "north south", "brac", "aiub", "aust", "ewu", "east west",
      "uiu", "iub", "ulab", "daffodil", "diu", "green university", "uap", "stamford", "seu"
    ];
    return privKeywords.some((k) => allTutorText.includes(k));
  }

  if (
    req.includes("english medium") ||
    req.includes("cambridge") ||
    req.includes("edexcel") ||
    req.includes("o level") ||
    req.includes("a level")
  ) {
    const emKeywords = [
      "english medium", "cambridge", "edexcel", "o level", "a level", "o/a level", "igcse", "ielts"
    ];
    return emKeywords.some((k) => allTutorText.includes(k));
  }

  if (req.includes("madrasah") || req.includes("islamic")) {
    const madKeywords = [
      "madrasah", "madrasa", "islamic", "arabic", "alim", "fazil", "kamil", "quran", "dakhil"
    ];
    return madKeywords.some((k) => allTutorText.includes(k));
  }

  // Specific Institutions alias mapping
  const aliasMap: Record<string, string[]> = {
    buet: ["buet", "bangladesh university of engineering"],
    "university of dhaka": ["dhaka university", "university of dhaka", "du"],
    du: ["dhaka university", "university of dhaka", "du"],
    "jahangirnagar university": ["jahangirnagar", "ju"],
    ju: ["jahangirnagar", "ju"],
    "rajshahi university": ["rajshahi university", "ru"],
    ru: ["rajshahi university", "ru"],
    "chittagong university": ["chittagong university", "cu"],
    cu: ["chittagong university", "cu"],
    "jagannath university": ["jagannath university", "jnu"],
    jnu: ["jagannath university", "jnu"],
    sust: ["sust", "shahjalal university"],
    bup: ["bup", "professionals"],
    cuet: ["cuet", "chittagong university of engineering"],
    ruet: ["ruet", "rajshahi university of engineering"],
    kuet: ["kuet", "khulna university of engineering"],
    butex: ["butex", "textiles"],
    mist: ["mist", "military institute"],
    iut: ["iut", "islamic university of technology"],
    "dhaka medical college": ["dhaka medical", "dmc"],
    dmc: ["dhaka medical", "dmc"],
    nsu: ["north south", "nsu"],
    "north south university": ["north south", "nsu"],
    brac: ["brac", "bracu"],
    "brac university": ["brac", "bracu"],
    aust: ["aust", "ahsanullah"],
    aiub: ["aiub", "american international"],
    ewu: ["east west", "ewu"],
    "east west university": ["east west", "ewu"],
    uiu: ["united international", "uiu"],
    iub: ["independent university", "iub"],
    ulab: ["liberal arts", "ulab"],
    "dhaka college": ["dhaka college"],
    "eden college": ["eden"],
    "titumir college": ["titumir"],
    "notre dame college": ["notre dame", "ndc"],
  };

  for (const [key, aliases] of Object.entries(aliasMap)) {
    if (req.includes(key)) {
      if (aliases.some((a) => allTutorText.includes(a))) return true;
    }
  }

  // Fallback: token check
  const tokens = req.split(/[,/|() -]+/).filter((t) => t.length > 2);
  if (tokens.length > 0) {
    return tokens.some((tok) => allTutorText.includes(tok));
  }

  return allTutorText.includes(req);
};

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
      tutorQualification: payload.tutorQualification || null,
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
      tutorQualification: payload.tutorQualification,
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

  if (!post) {
    throw new AppError("Tuition post not found", 404);
  }

  if (post.status !== "Active") {
    throw new AppError("This tuition post is currently not accepting applications", 400);
  }

  if (post.studentId === tutorId) {
    throw new AppError("You cannot apply to your own tuition post", 400);
  }

  // --- Profile Matching Validations ---

  // 1. Gender Preference Validation
  if (post.genderPreference && post.genderPreference !== "Any") {
    if (!tutor.gender) {
      throw new AppError(
        `This tuition post specifically requires a ${post.genderPreference} tutor. Please update your gender in your profile to apply.`,
        400
      );
    }
    if (tutor.gender.toLowerCase() !== post.genderPreference.toLowerCase()) {
      throw new AppError(
        `Profile Mismatch: This tuition post specifically requires a ${post.genderPreference} tutor. Your profile gender is set to ${tutor.gender}.`,
        400
      );
    }
  }

  // 2. Subject Matching Validation
  if (post.subjects && post.subjects.length > 0 && tutor.subjects && tutor.subjects.length > 0) {
    const tutorSubs = tutor.subjects.map((s) => s.toLowerCase().trim());
    const postSubs = post.subjects.map((s) => s.toLowerCase().trim());

    const hasSubjectMatch = postSubs.some((ps) =>
      tutorSubs.some(
        (ts) =>
          ts.includes(ps) ||
          ps.includes(ts) ||
          (ps.includes("math") && ts.includes("math")) ||
          (ps.includes("english") && ts.includes("english")) ||
          (ps.includes("physics") && ts.includes("physics")) ||
          (ps.includes("chemistry") && ts.includes("chemistry")) ||
          (ps.includes("biology") && ts.includes("biology")) ||
          (ps.includes("ict") && ts.includes("ict")) ||
          (ps.includes("bangla") && ts.includes("bangla")) ||
          (ps.includes("accounting") && ts.includes("accounting")) ||
          (ps.includes("economics") && ts.includes("economics")) ||
          (ps.includes("science") && ts.includes("science"))
      )
    );

    if (!hasSubjectMatch) {
      throw new AppError(
        `Profile Mismatch: Your teaching subjects (${tutor.subjects.join(", ")}) do not match the required subjects for this tuition (${post.subjects.join(", ")}).`,
        400
      );
    }
  }

  // 3. Tuition Mode Matching Validation
  if (post.mode && post.mode !== "Both" && tutor.tuitionModes && tutor.tuitionModes.length > 0) {
    const tutorModesLower = tutor.tuitionModes.map((m) => m.toLowerCase().trim());
    const postModeLower = post.mode.toLowerCase().trim();
    const matchesMode = tutorModesLower.some(
      (tm) => tm === postModeLower || tm === "both" || tm.includes(postModeLower)
    );

    if (!matchesMode) {
      throw new AppError(
        `Profile Mismatch: This tuition post requires ${post.mode} tuition. Your profile is configured for ${tutor.tuitionModes.join(", ")}.`,
        400
      );
    }
  }

  // 4. Tutor Qualification / Preferred Background Matching Validation (Optional)
  if (
    post.tutorQualification &&
    post.tutorQualification.trim() &&
    post.tutorQualification.trim().toLowerCase() !== "any"
  ) {
    const isMatched = isInstitutionOrQualificationMatch(
      post.tutorQualification,
      tutor.institution || "",
      tutor.department || "",
      tutor.bio || "",
      tutor.totalYearsExp || ""
    );

    if (!isMatched) {
      throw new AppError(
        `Profile Mismatch: This tuition post specifically requires tutors with qualification/institution: "${post.tutorQualification}". Your profile (${tutor.institution || "No institution specified"}) does not match this requirement.`,
        400
      );
    }
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
          institution: true,
          department: true,
          totalYearsExp: true,
        },
      },
    },
  });

  // Notify the student that a tutor has applied to their post (in-app notification)
  NotificationService.sendNotification({
    userId: post.studentId,
    title: "New Tutor Application! 📝",
    message: `${result.tutor.name} has applied for your ${post.classLevel} tuition post. Bid: ৳${payload.salaryBid}/month.`,
    type: "NEW_APPLICATION",
    link: "/dashboard?tab=applications",
  }).catch((err) => console.error("[Notification] Failed to notify student of new application:", err));

  // Send Email notification to student
  if (post.student?.email) {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fbfb; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-color: #0F5B47; padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">TutorKhojo</h1>
          <p style="color: #a7f3d0; margin: 6px 0 0 0; font-size: 13px;">New Tutor Application Received 📝</p>
        </div>
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <p style="font-size: 15px; color: #1f2937; margin: 0 0 16px 0;">Hello <strong>${post.student.name}</strong>,</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
            A verified tutor has just applied for your tuition post for <strong>${post.classLevel}</strong> (${post.subjects.join(", ")}).
          </p>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; color: #0F5B47; font-size: 16px; font-weight: 700;">👨‍🏫 Tutor Details:</h3>
            <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Name:</strong> ${tutor.name}</p>
            ${tutor.institution ? `<p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Institution:</strong> ${tutor.institution} ${tutor.department ? `(${tutor.department})` : ""}</p>` : ""}
            ${tutor.totalYearsExp ? `<p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Experience:</strong> ${tutor.totalYearsExp}</p>` : ""}
            <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Salary Bid:</strong> <span style="color: #0F5B47; font-weight: 800; font-size: 15px;">৳${payload.salaryBid}/month</span> (Your budget: ৳${post.budget})</p>
            ${payload.proposal ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: #4b5563; font-style: italic; background: #ffffff; padding: 12px; border-radius: 8px; border-left: 3px solid #0F5B47;">"${payload.proposal}"</p>` : ""}
          </div>

          <div style="text-align: center; margin: 28px 0 10px 0;">
            <a href="${clientUrl}/dashboard?tab=applications" 
               style="display: inline-block; background-color: #0F5B47; color: #ffffff; text-decoration: none; padding: 13px 30px; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(15, 91, 71, 0.2);">
              Review Application in Dashboard →
            </a>
          </div>
        </div>
        <div style="background-color: #f3f4f6; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af;">
          © ${new Date().getFullYear()} TutorKhojo. All rights reserved.
        </div>
      </div>
    `;

    sendEmail(
      post.student.email,
      `📝 New Application: ${tutor.name} applied for your ${post.classLevel} tuition post`,
      emailHtml
    ).catch((err) => console.error("[Email] Failed to send tuition application email to student:", err));
  }

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
