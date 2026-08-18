import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

// Public: Get all tutors with optional filters
router.get("/tutors", UserController.getAllPublicTutors);

// Public: Get single tutor by ID
router.get("/tutors/:id", UserController.getPublicTutorById);

router.get("/me", auth("student", "tutor", "admin"), UserController.getMe);

router.patch(
  "/me",
  auth("student", "tutor", "admin"),
  validateRequest(UserValidation.updateProfileValidationSchema),
  UserController.updateMe
);

router.patch(
  "/me/onboard",
  auth("student", "tutor", "admin"),
  validateRequest(UserValidation.onboardTutorValidationSchema),
  UserController.onboardTutor
);

router.get("/admin-stats", auth("admin"), UserController.getAdminStats);

router.get("/verifications", auth("admin"), UserController.getPendingVerifications);

router.patch(
  "/:id/verify",
  auth("admin"),
  validateRequest(UserValidation.updateVerificationValidationSchema),
  UserController.updateVerificationStatus
);

router.get("/", auth("admin"), UserController.getAllUsers);

router.get("/:id", auth("admin"), UserController.getUserById);

router.patch(
  "/:id/status",
  auth("admin"),
  validateRequest(UserValidation.updateUserStatusValidationSchema),
  UserController.updateUserStatus
);

router.delete("/:id", auth("admin"), UserController.deleteUser);

export const userRoutes = router;
