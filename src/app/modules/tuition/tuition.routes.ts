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

// Protected: Get student's received applications
router.get(
  "/my-applications",
  auth("student", "admin"),
  TuitionController.getMyReceivedApplications
);

// Protected: Get tutor's applied posts
router.get(
  "/tutor/my-applied",
  auth("tutor", "admin"),
  TuitionController.getTutorAppliedPosts
);

// Protected: Get smart matched jobs for tutor
router.get(
  "/matched-jobs",
  auth("tutor", "admin"),
  TuitionController.getMatchedJobs
);

// Protected: Update application status (Shortlisted / Hired / Rejected)
router.patch(
  "/applications/:applicationId/status",
  auth("student", "tutor", "admin"),
  validateRequest(TuitionValidation.updateApplicationStatusValidationSchema),
  TuitionController.updateApplicationStatus
);

// Public: Browse all tuition posts (with filters & search)
router.get("/", TuitionController.getAllTuitionPosts);

// Protected: Create a tuition post
router.post(
  "/",
  auth("student", "admin"),
  validateRequest(TuitionValidation.createTuitionPostValidationSchema),
  TuitionController.createTuitionPost
);

// Protected: Apply for a tuition post (Tutor)
router.post(
  "/:id/apply",
  auth("tutor", "admin"),
  validateRequest(TuitionValidation.applyTuitionValidationSchema),
  TuitionController.applyForTuition
);

// Public: Get specific tuition post details
router.get("/:id", TuitionController.getTuitionPostById);

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
