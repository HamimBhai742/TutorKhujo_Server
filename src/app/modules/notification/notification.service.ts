import { prisma } from "../../lib/prisma";
import { getIO } from "../../lib/socket";
import { getMessaging } from "firebase-admin/messaging";

const sendNotification = async (payload: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  data?: Record<string, string>;
}) => {
  // 1. Save to Database
  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      link: payload.link || null,
    },
  });

  // 2. Real-time Delivery via Socket.io (In-App)
  try {
    const io = getIO();
    // Socket room named after userId (as joined during connection in socket.ts)
    io.to(payload.userId).emit("new_notification", notification);
  } catch (err) {
    console.error("Socket notification emission failed:", err);
  }

  // 3. Send Background Push notification via Firebase Cloud Messaging (FCM)
  try {
    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId: payload.userId },
    });

    if (deviceTokens.length > 0) {
      const tokens = deviceTokens.map((dt) => dt.token);
      
      const customData: Record<string, string> = {
        type: String(payload.type || "GENERAL"),
        link: String(payload.link || ""),
        notificationId: String(notification.id || ""),
      };

      if (payload.data) {
        Object.entries(payload.data).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            customData[k] = String(v);
          }
        });
      }

      const fcmPayload = {
        notification: {
          title: payload.title,
          body: payload.message,
        },
        data: customData,
      };

      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: fcmPayload.notification,
        data: fcmPayload.data,
      });

      // Cleanup expired tokens if FCM indicates they are invalid
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success && resp.error) {
            const code = resp.error.code;
            if (
              code === "messaging/invalid-registration-token" ||
              code === "messaging/registration-token-not-registered"
            ) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await prisma.deviceToken.deleteMany({
            where: {
              token: { in: invalidTokens },
            },
          });
          console.log(`Cleaned up ${invalidTokens.length} expired FCM device tokens.`);
        }
      }
    }
  } catch (err) {
    console.error("FCM push notification sending failed:", err);
  }

  return notification;
};

const getMyNotifications = async (userId: string) => {
  const result = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return result;
};

const markAsRead = async (userId: string, notificationId: string) => {
  const result = await prisma.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure ownership
    },
    data: {
      isRead: true,
    },
  });
  return result;
};

const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
  return result;
};

const registerDeviceToken = async (
  userId: string,
  token: string,
  platform: string
) => {
  const result = await prisma.deviceToken.upsert({
    where: { token },
    update: { userId, platform },
    create: { userId, token, platform },
  });
  return result;
};

const deregisterDeviceToken = async (userId: string, token: string) => {
  const result = await prisma.deviceToken.deleteMany({
    where: { userId, token },
  });
  return result;
};

const deleteNotification = async (userId: string, notificationId: string) => {
  const result = await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });
  return result;
};

const deleteAllNotifications = async (userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: {
      userId,
    },
  });
  return result;
};

const notifyMatchingTutors = async (tuitionPost: {
  id: string;
  subjects: string[];
  location: string;
  budget: number;
  classLevel: string;
}) => {
  try {
    const postLoc = (tuitionPost.location || "").toLowerCase();
    const locKeywords = postLoc
      .split(/[\s,]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2);

    const orConditions: any[] = [];
    if (locKeywords.length > 0) {
      locKeywords.forEach((kw) => {
        orConditions.push({ city: { contains: kw, mode: "insensitive" } });
      });
    } else if (postLoc) {
      orConditions.push({ city: { contains: postLoc, mode: "insensitive" } });
    }

    if (tuitionPost.subjects && tuitionPost.subjects.length > 0) {
      orConditions.push({
        tutorProfile: {
          subjects: { hasSome: tuitionPost.subjects },
        },
      });
    }

    // Cap at 100 matching tutors
    const matchingTutors = await prisma.user.findMany({
      where: {
        role: "tutor",
        status: "active",
        ...(orConditions.length > 0 ? { OR: orConditions } : {}),
      },
      select: {
        id: true,
        city: true,
        tutorProfile: {
          select: {
            subjects: true,
          },
        },
      },
      take: 100,
    });

    console.log(`[Notification] Found ${matchingTutors.length} matching tutors for post ${tuitionPost.id}`);

    await Promise.all(
      matchingTutors.map((tutor) => {
        const hasLocationMatch = tutor.city && postLoc.includes(tutor.city.toLowerCase());
        const matchPercent = hasLocationMatch ? 95 : 85;

        return sendNotification({
          userId: tutor.id,
          title: `🎯 ${matchPercent}% Tuition Match in ${tuitionPost.location}!`,
          message: `Class: ${tuitionPost.classLevel} • Subjects: ${tuitionPost.subjects.join(", ")} • Salary: ৳${tuitionPost.budget}/mo`,
          type: "TUITION_MATCH",
          link: `/tuition-details?id=${tuitionPost.id}`,
          data: {
            tuitionId: tuitionPost.id,
            type: "TUITION_MATCH",
          },
        }).catch((err) =>
          console.error(`[Notification] Failed to notify tutor ${tutor.id}:`, err)
        );
      })
    );
  } catch (err) {
    console.error("Error in notifyMatchingTutors:", err);
  }
};

export const NotificationService = {
  sendNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  registerDeviceToken,
  deregisterDeviceToken,
  notifyMatchingTutors,
};

