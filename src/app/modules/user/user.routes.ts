import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.get("/me", auth("user", "admin"), UserController.getMe);

router.patch(
  "/me",
  auth("user", "admin"),
  validateRequest(UserValidation.updateProfileValidationSchema),
  UserController.updateMe
);

router.get("/", auth("admin"), UserController.getAllUsers);

router.get("/:id", auth("admin"), UserController.getUserById);

router.patch(
  "/:id/status",
  auth("admin"),
  validateRequest(UserValidation.updateUserStatusValidationSchema),
  UserController.updateUserStatus
);

export const userRoutes = router;
