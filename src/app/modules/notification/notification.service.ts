import { prisma } from "../../lib/prisma";
import { getIO } from "../../lib/socket";
import { getMessaging } from "firebase-admin/messaging";

const sendNotification = async (payload: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
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
      
      const fcmPayload = {
        notification: {
          title: payload.title,
          body: payload.message,
        },
        data: {
          type: payload.type,
          link: payload.link || "",
          notificationId: notification.id,
        },
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

const notifyMatchingTutors = async (tuitionPost: {
  id: string;
  subjects: string[];
  location: string;
  budget: number;
  classLevel: string;
}) => {
  try {
    // Query tutors matching any of the subjects
    const matchingTutors = await prisma.user.findMany({
      where: {
        role: "tutor",
        status: "active",
        subjects: {
          hasSome: tuitionPost.subjects,
        },
      },
      select: {
        id: true,
      },
    });

    console.log(`Found ${matchingTutors.length} matching tutors for tuition post ${tuitionPost.id}`);

    // Send notifications to each matching tutor
    for (const tutor of matchingTutors) {
      await sendNotification({
        userId: tutor.id,
        title: "New Tuition Match! 🎓",
        message: `A new tuition request for ${tuitionPost.subjects.join(", ")} is available in ${tuitionPost.location}. Budget: ৳${tuitionPost.budget}/mo`,
        type: "TUITION_MATCH",
        link: `/tuition-jobs`,
      });
    }
  } catch (err) {
    console.error("Error in notifyMatchingTutors:", err);
  }
};

export const NotificationService = {
  sendNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  registerDeviceToken,
  deregisterDeviceToken,
  notifyMatchingTutors,
};
