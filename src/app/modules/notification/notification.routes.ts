import { Router } from "express";
import { auth } from "../../middleware/auth";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get(
  "/",
  auth("student", "tutor", "admin"),
  NotificationController.getMyNotifications
);

router.patch(
  "/read-all",
  auth("student", "tutor", "admin"),
  NotificationController.markAllAsRead
);

router.patch(
  "/:id/read",
  auth("student", "tutor", "admin"),
  NotificationController.markAsRead
);

router.delete(
  "/clear-all",
  auth("student", "tutor", "admin"),
  NotificationController.deleteAllNotifications
);

router.delete(
  "/:id",
  auth("student", "tutor", "admin"),
  NotificationController.deleteNotification
);


router.post(
  "/register-token",
  auth("student", "tutor", "admin"),
  NotificationController.registerDeviceToken
);

router.post(
  "/deregister-token",
  auth("student", "tutor", "admin"),
  NotificationController.deregisterDeviceToken
);

export const notificationRoutes = router;
