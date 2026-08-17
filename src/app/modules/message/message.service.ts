import { prisma } from "../../lib/prisma";
import { getIO, isUserOnline } from "../../lib/socket";
import { AppError } from "../../error/AppError";
import { NotificationService } from "../notification/notification.service";

const createConversation = async (
  requesterId: string,
  requesterRole: "student" | "tutor",
  otherUserId: string
) => {
  // Determine studentId / tutorId based on who is making the request
  const studentId = requesterRole === "student" ? requesterId : otherUserId;
  const tutorId = requesterRole === "tutor" ? requesterId : otherUserId;

  let conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { studentId, tutorId },
        { studentId: tutorId, tutorId: studentId },
      ],
    },
    include: {
      student: { select: { id: true, name: true, role: true, profilePic: true } },
      tutor: { select: { id: true, name: true, role: true, profilePic: true } },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        studentId,
        tutorId,
      },
      include: {
        student: { select: { id: true, name: true, role: true, profilePic: true } },
        tutor: { select: { id: true, name: true, role: true, profilePic: true } },
      },
    });
  }

  return {
    ...conversation,
    recipientId: requesterRole === "student" ? conversation.tutorId : conversation.studentId,
  };
};

const getMyConversations = async (userId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { studentId: userId },
        { tutorId: userId },
      ],
    },
    include: {
      student: { select: { id: true, name: true, role: true, profilePic: true } },
      tutor: { select: { id: true, name: true, role: true, profilePic: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Calculate unread counts in parallel
  const results = await Promise.all(
    conversations.map(async (c) => {
      const isStudent = c.studentId === userId;
      const counterParty = isStudent ? c.tutor : c.student;
      const lastMsg = c.messages[0];

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          isRead: false,
        },
      });

      const bgColors = [
        "bg-emerald-600",
        "bg-rose-600",
        "bg-indigo-600",
        "bg-amber-600",
        "bg-blue-600",
        "bg-teal-600",
      ];
      const colorIdx = (counterParty?.name || "").charCodeAt(0) % bgColors.length;

        return {
        id: c.id,
        recipientId: counterParty?.id || "",
        studentName: counterParty?.name || "User",
        role: counterParty?.role || "",
        avatarBg: counterParty?.profilePic || bgColors[colorIdx],
        lastMessage: lastMsg?.content || "No messages yet",
        time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "New",
        unreadCount,
        isBlocked: c.isBlocked,
        blockedById: c.blockedById,
      };
    })
  );

  return results;
};

const sendMessage = async (senderId: string, conversationId: string, content: string) => {
  const existingConv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      student: { select: { id: true, name: true } },
      tutor: { select: { id: true, name: true } },
    },
  });

  if (!existingConv) {
    throw new AppError("Conversation not found", 404);
  }

  if (existingConv.studentId !== senderId && existingConv.tutorId !== senderId) {
    throw new AppError("You are not authorized to send messages in this conversation", 403);
  }

  // Block enforcement
  if (existingConv.isBlocked) {
    if (existingConv.blockedById === senderId) {
      throw new AppError("You have blocked this contact. Unblock to send messages.", 400);
    } else {
      throw new AppError("You cannot send messages to this user because you have been blocked.", 403);
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
      isRead: false,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const recipientId = existingConv.studentId === senderId ? existingConv.tutorId : existingConv.studentId;
  const senderName = existingConv.studentId === senderId ? existingConv.student.name : existingConv.tutor.name;

  try {
    const io = getIO();
    const payload = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: existingConv.studentId === senderId ? "student" : "tutor",
      content: message.content,
      createdAt: message.createdAt,
      time: new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };

    io.to(recipientId).emit("incoming_message", payload);
  } catch (err) {
    console.error("Socket emit failed:", err);
  }

  // Send in-app notification ONLY IF the recipient is offline
  if (!isUserOnline(recipientId)) {
    NotificationService.sendNotification({
      userId: recipientId,
      title: `💬 New message from ${senderName}`,
      message: content.length > 80 ? content.slice(0, 77) + "..." : content,
      type: "MESSAGE",
      link: `/dashboard?tab=messages`,
    }).catch((err) => console.error("[Message] Failed to notify offline recipient of new message:", err));
  }

  return message;
};

/**
 * Gets messages for a conversation and marks unread messages from other user as read.
 * Security: verifies the requesting userId is a participant before returning any data.
 */
const getMessages = async (conversationId: string, requestingUserId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  // Authorization check — only participants can read messages
  if (conversation.studentId !== requestingUserId && conversation.tutorId !== requestingUserId) {
    throw new AppError("You are not authorized to view this conversation", 403);
  }

  // Mark all unread messages sent by the counterparty in this conversation as read
  const updateRes = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: requestingUserId },
      isRead: false,
    },
    data: { isRead: true },
  });

  const recipientId = conversation.studentId === requestingUserId ? conversation.tutorId : conversation.studentId;

  // If any unread message was updated, broadcast read event via socket
  if (updateRes.count > 0) {
    try {
      const io = getIO();
      io.to(recipientId).emit("messages_read", {
        conversationId,
        readerId: requestingUserId,
      });
    } catch (_) {}
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      reactions: {
        select: {
          id: true,
          userId: true,
          emoji: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    isBlocked: conversation.isBlocked,
    blockedById: conversation.blockedById,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.senderId === conversation.studentId ? "student" : "tutor",
      content: m.content,
      isRead: m.isRead,
      createdAt: m.createdAt,
      reactions: m.reactions || [],
      time: new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    })),
  };
};

const markConversationAsRead = async (conversationId: string, requestingUserId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (conversation.studentId !== requestingUserId && conversation.tutorId !== requestingUserId) {
    throw new AppError("You are not authorized to access this conversation", 403);
  }

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: requestingUserId },
      isRead: false,
    },
    data: { isRead: true },
  });

  const recipientId = conversation.studentId === requestingUserId ? conversation.tutorId : conversation.studentId;

  try {
    const io = getIO();
    io.to(recipientId).emit("messages_read", {
      conversationId,
      readerId: requestingUserId,
    });
  } catch (_) {}

  return { success: true };
};

const updateMessage = async (messageId: string, senderId: string, content: string) => {
  if (!content || !content.trim()) {
    throw new AppError("Message content cannot be empty", 400);
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.senderId !== senderId) {
    throw new AppError("You can only edit your own messages", 403);
  }

  // 30-minute time restriction
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  if (messageAge > THIRTY_MINUTES_MS) {
    throw new AppError("Messages can only be edited within 30 minutes of sending", 400);
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: { content: content.trim() },
  });

  const recipientId =
    message.conversation.studentId === senderId
      ? message.conversation.tutorId
      : message.conversation.studentId;

  try {
    const io = getIO();
    const payload = {
      messageId: message.id,
      conversationId: message.conversationId,
      content: updatedMessage.content,
      senderId,
    };
    io.to(recipientId).emit("message_updated", payload);
    io.to(message.conversationId).emit("message_updated", payload);
  } catch (_) {}

  return updatedMessage;
};

const deleteMessage = async (messageId: string, senderId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.senderId !== senderId) {
    throw new AppError("You can only delete your own messages", 403);
  }

  // 30-minute time restriction
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  if (messageAge > THIRTY_MINUTES_MS) {
    throw new AppError("Messages can only be deleted/unsent within 30 minutes of sending", 400);
  }

  await prisma.message.delete({
    where: { id: messageId },
  });

  const recipientId =
    message.conversation.studentId === senderId
      ? message.conversation.tutorId
      : message.conversation.studentId;

  try {
    const io = getIO();
    const payload = {
      messageId: message.id,
      conversationId: message.conversationId,
      senderId,
    };
    io.to(recipientId).emit("message_deleted", payload);
    io.to(message.conversationId).emit("message_deleted", payload);
  } catch (_) {}

  return { success: true, messageId };
};

const deleteConversation = async (conversationId: string, requestingUserId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (conversation.studentId !== requestingUserId && conversation.tutorId !== requestingUserId) {
    throw new AppError("You are not authorized to delete this conversation", 403);
  }

  const recipientId =
    conversation.studentId === requestingUserId
      ? conversation.tutorId
      : conversation.studentId;

  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  try {
    const io = getIO();
    const payload = { conversationId, deletedBy: requestingUserId };
    io.to(recipientId).emit("conversation_deleted", payload);
    io.to(conversationId).emit("conversation_deleted", payload);
  } catch (_) {}

  return { success: true, conversationId };
};

const toggleBlockConversation = async (conversationId: string, requestingUserId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (conversation.studentId !== requestingUserId && conversation.tutorId !== requestingUserId) {
    throw new AppError("You are not authorized to block/unblock this conversation", 403);
  }

  let updated;
  if (conversation.isBlocked) {
    // Only blocker can unblock
    if (conversation.blockedById && conversation.blockedById !== requestingUserId) {
      throw new AppError("You cannot unblock this conversation. Only the user who blocked can unblock.", 403);
    }
    updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { isBlocked: false, blockedById: null },
    });
  } else {
    updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { isBlocked: true, blockedById: requestingUserId },
    });
  }

  const recipientId =
    conversation.studentId === requestingUserId
      ? conversation.tutorId
      : conversation.studentId;

  try {
    const io = getIO();
    const payload = {
      conversationId,
      isBlocked: updated.isBlocked,
      blockedById: updated.blockedById,
    };
    io.to(recipientId).emit("block_status_changed", payload);
    io.to(conversationId).emit("block_status_changed", payload);
  } catch (_) {}

  return updated;
};

const reactToMessage = async (messageId: string, userId: string, emoji: string) => {
  if (!emoji || !emoji.trim()) {
    throw new AppError("Emoji is required", 400);
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.conversation.studentId !== userId && message.conversation.tutorId !== userId) {
    throw new AppError("You are not authorized to react to this message", 403);
  }

  if (message.conversation.isBlocked) {
    throw new AppError("Cannot react to messages in a blocked conversation", 400);
  }

  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId: {
        messageId,
        userId,
      },
    },
  });

  if (existing) {
    if (existing.emoji === emoji) {
      // Toggle off if same emoji
      await prisma.messageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      // Switch emoji
      await prisma.messageReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
    }
  } else {
    // Create new reaction
    await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  const updatedReactions = await prisma.messageReaction.findMany({
    where: { messageId },
    select: {
      id: true,
      userId: true,
      emoji: true,
    },
  });

  const recipientId =
    message.conversation.studentId === userId
      ? message.conversation.tutorId
      : message.conversation.studentId;

  try {
    const io = getIO();
    const payload = {
      messageId,
      conversationId: message.conversationId,
      reactions: updatedReactions,
    };
    io.to(recipientId).emit("message_reaction_updated", payload);
    io.to(userId).emit("message_reaction_updated", payload);
    io.to(message.conversationId).emit("message_reaction_updated", payload);
  } catch (_) {}

  return updatedReactions;
};

export const MessageService = {
  createConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  markConversationAsRead,
  updateMessage,
  deleteMessage,
  deleteConversation,
  toggleBlockConversation,
  reactToMessage,
};
