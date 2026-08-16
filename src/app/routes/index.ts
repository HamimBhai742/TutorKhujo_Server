import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { userRoutes } from "../modules/user/user.routes";
import { tuitionRoutes } from "../modules/tuition/tuition.routes";

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
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


