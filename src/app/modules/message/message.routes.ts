import { Router } from "express";
import { auth } from "../../middleware/auth";
import { MessageController } from "./message.controller";

const router = Router();

router.post("/conversations", auth("student", "tutor"), MessageController.createConversation);
router.get("/conversations", auth("student", "tutor"), MessageController.getMyConversations);
router.post("/", auth("student", "tutor"), MessageController.sendMessage);
router.patch("/read/:conversationId", auth("student", "tutor"), MessageController.markAsRead);
router.get("/:conversationId", auth("student", "tutor"), MessageController.getMessages);

export const messageRoutes = router;
