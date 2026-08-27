import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ChatbotService } from "./chatbot.service";

const askChatbot = catchAsync(async (req: Request, res: Response) => {
  const { message, history } = req.body;
  const result = await ChatbotService.askChatbot(message, history);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chatbot reply generated successfully",
    data: result,
  });
});

export const ChatbotController = {
  askChatbot,
};
