import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { userRoutes } from "../modules/user/user.routes";
import { tuitionRoutes } from "../modules/tuition/tuition.routes";
import { settingsRoutes } from "../modules/settings/settings.routes";
import { paymentRoutes } from "../modules/payment/payment.routes";

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
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


