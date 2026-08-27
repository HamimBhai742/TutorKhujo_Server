import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { ChatbotController } from "./chatbot.controller";
import { ChatbotValidation } from "./chatbot.validation";

const router = Router();

router.post(
  "/chat",
  validateRequest(ChatbotValidation.chatValidationSchema),
  ChatbotController.askChatbot
);

export const chatbotRoutes = router;
