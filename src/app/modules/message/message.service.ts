import { prisma } from "../../lib/prisma";
import { getIO } from "../../lib/socket";

const createConversation = async (studentId: string, tutorId: string) => {
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

  return conversation;
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

  return conversations.map((c) => {
    const isStudent = c.studentId === userId;
    const counterParty = isStudent ? c.tutor : c.student;
    const lastMsg = c.messages[0];

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
      studentName: counterParty?.name || "User",
      avatarBg: counterParty?.profilePic || bgColors[colorIdx],
      lastMessage: lastMsg?.content || "No messages yet",
      time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "New",
      unreadCount: 0,
    };
  });
};

const sendMessage = async (senderId: string, conversationId: string, content: string) => {
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
    },
  });

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
    include: {
      student: true,
      tutor: true,
    },
  });

  const recipientId = conversation.studentId === senderId ? conversation.tutorId : conversation.studentId;

  try {
    const io = getIO();
    const payload = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: conversation.studentId === senderId ? "student" : "tutor",
      content: message.content,
      time: new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };

    io.to(recipientId).emit("incoming_message", payload);
  } catch (err) {
    console.error("Socket emit failed:", err);
  }

  return message;
};

const getMessages = async (conversationId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((m) => ({
    id: m.id,
    sender: m.senderId === conversation.studentId ? "student" : "tutor",
    content: m.content,
    time: new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  }));
};

export const MessageService = {
  createConversation,
  getMyConversations,
  sendMessage,
  getMessages,
};
