import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { userRoutes } from "../modules/user/user.routes";
import { tuitionRoutes } from "../modules/tuition/tuition.routes";
import { settingsRoutes } from "../modules/settings/settings.routes";
import { paymentRoutes } from "../modules/payment/payment.routes";
import { messageRoutes } from "../modules/message/message.routes";
import { notificationRoutes } from "../modules/notification/notification.routes";
import { reviewRoutes } from "../modules/review/review.routes";
import { tuitionManagementRoutes } from "../modules/tuition-management/tuition-management.routes";

export const router = Router();

const moduleRoutes: Array<{ path: string; route: Router }> = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/user",
    route: userRoutes,
  },
  {
    path: "/tuitions",
    route: tuitionRoutes,
  },
  {
    path: "/settings",
    route: settingsRoutes,
  },
  {
    path: "/payments",
    route: paymentRoutes,
  },
  {
    path: "/messages",
    route: messageRoutes,
  },
  {
    path: "/notifications",
    route: notificationRoutes,
  },
  {
    path: "/reviews",
    route: reviewRoutes,
  },
  {
    path: "/tuition-management",
    route: tuitionManagementRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


