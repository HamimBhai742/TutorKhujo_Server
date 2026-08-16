import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { TuitionController } from "./tuition.controller";
import { TuitionValidation } from "./tuition.validation";

const router = Router();

// Protected: Get current user's posts
router.get(
  "/my-posts",
  auth("student", "tutor", "admin"),
  TuitionController.getMyTuitionPosts
);

// Protected: Get dashboard stats
router.get(
  "/stats",
  auth("student", "admin"),
  TuitionController.getStudentDashboardStats
);

// Public: Browse all tuition posts (with filters & search)
router.get("/", TuitionController.getAllTuitionPosts);

// Public: Get specific tuition post details
router.get("/:id", TuitionController.getTuitionPostById);

// Protected: Create a tuition post
router.post(
  "/",
  auth("student", "admin"),
  validateRequest(TuitionValidation.createTuitionPostValidationSchema),
  TuitionController.createTuitionPost
);

// Protected: Update a tuition post
router.patch(
  "/:id",
  auth("student", "admin"),
  validateRequest(TuitionValidation.updateTuitionPostValidationSchema),
  TuitionController.updateTuitionPost
);

// Protected: Update post status (Pause / Resume / Close)
router.patch(
  "/:id/status",
  auth("student", "admin"),
  validateRequest(TuitionValidation.updatePostStatusValidationSchema),
  TuitionController.updatePostStatus
);

// Protected: Delete post
router.delete(
  "/:id",
  auth("student", "admin"),
  TuitionController.deleteTuitionPost
);

export const tuitionRoutes = router;
