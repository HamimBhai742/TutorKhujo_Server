import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

import { AppError } from "../../error/AppError";
import { upload } from "../../utils/fileUpload";

const router = Router();

// File & Photo Upload & Delete Endpoints (Cloudflare R2)
router.post(
  "/upload",
  auth("student", "tutor", "admin"),
  upload.single("file"),
  UserController.uploadFile
);

router.delete(
  "/upload",
  auth("student", "tutor", "admin"),
  UserController.deleteFile
);

router.delete(
  "/file",
  auth("student", "tutor", "admin"),
  UserController.deleteFile
);

// Public: Get leaderboard tutors with dynamic performance ranks
router.get("/leaderboard", UserController.getLeaderboardTutors);

// Public: Get all tutors with optional filters
router.get("/tutors", UserController.getAllPublicTutors);

// Public: Get single tutor by ID
router.get("/tutors/:id", UserController.getPublicTutorById);

router.get("/me", auth("student", "tutor", "admin"), UserController.getMe);

router.patch(
  "/me",
  auth("student", "tutor", "admin"),
  upload.single("file"),
  (req, res, next) => {
    if (req.body.data) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch (err) {
        return next(new AppError("Invalid JSON inside the 'data' field", 400));
      }
    }
    next();
  },
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
