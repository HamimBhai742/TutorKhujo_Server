import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { MessageService } from "./message.service";

const createConversation = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { otherUserId, tutorId, studentId, receiverId, recipientId } = req.body;

  // Resolve target user ID regardless of how the frontend sends it
  let targetUserId = otherUserId || receiverId || recipientId;
  if (!targetUserId) {
    if (user.role === "student") {
      targetUserId = tutorId;
    } else if (user.role === "tutor") {
      targetUserId = studentId;
    } else {
      targetUserId = tutorId || studentId;
    }
  }

  if (!targetUserId) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Target user ID is required to start a conversation",
      data: null,
    });
  }

  const result = await MessageService.createConversation(
    user.id,
    user.role as "student" | "tutor",
    targetUserId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Conversation created successfully",
    data: result,
  });
});

const getMyConversations = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await MessageService.getMyConversations(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Conversations retrieved successfully",
    data: result,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { conversationId, content } = req.body;
  const result = await MessageService.sendMessage(user.id, conversationId, content);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { conversationId } = req.params;
  // Pass userId for authorization — service verifies user is a conversation participant
  const result = await MessageService.getMessages(conversationId, user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Messages retrieved successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { conversationId } = req.params;
  const result = await MessageService.markConversationAsRead(conversationId, user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Conversation marked as read",
    data: result,
  });
});

export const MessageController = {
  createConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  markAsRead,
};
