import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

router.post(
  "/",
  auth("student", "tutor", "admin"),
  validateRequest(ReviewValidation.createReviewValidationSchema),
  ReviewController.createReview
);

router.get("/tutor/:tutorId", ReviewController.getTutorReviews);
router.get("/stats/:tutorId", ReviewController.getTutorStats);

export const reviewRoutes = router;
