import { Router } from "express";
import { auth } from "../../middleware/auth";
import { PointsController } from "./points.controller";

const router = Router();

// Purchase points (available for both students and tutors)
router.post(
  "/purchase",
  auth("student", "tutor", "admin"),
  PointsController.buyPackage
);

// Unlock tutor contact & direct chat (10 points)
router.post(
  "/unlock-tutor",
  auth("student", "tutor", "admin"),
  PointsController.unlockTutorContact
);

// Unlock tuition post contact (10 points)
router.post(
  "/unlock-tuition",
  auth("tutor", "student", "admin"),
  PointsController.unlockTuitionContact
);

// Get current wallet, point balance, and unlocked items
router.get(
  "/my-wallet",
  auth("student", "tutor", "admin"),
  PointsController.getMyWallet
);

export const pointsRoutes = router;
