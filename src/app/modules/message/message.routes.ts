import { Router } from "express";
import { auth } from "../../middleware/auth";
import { MessageController } from "./message.controller";

const router = Router();

router.post("/conversations", auth("student", "tutor"), MessageController.createConversation);
router.get("/conversations", auth("student", "tutor"), MessageController.getMyConversations);
router.delete("/conversations/:conversationId", auth("student", "tutor"), MessageController.deleteConversation);
router.patch("/conversations/block/:conversationId", auth("student", "tutor"), MessageController.toggleBlockConversation);
router.post("/", auth("student", "tutor"), MessageController.sendMessage);
router.patch("/read/:conversationId", auth("student", "tutor"), MessageController.markAsRead);
router.get("/:conversationId", auth("student", "tutor"), MessageController.getMessages);
router.patch("/:messageId", auth("student", "tutor"), MessageController.updateMessage);
router.delete("/:messageId", auth("student", "tutor"), MessageController.deleteMessage);

export const messageRoutes = router;
