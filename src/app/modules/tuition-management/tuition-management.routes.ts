import { Router } from "express";
import { auth } from "../../middleware/auth";
import { TuitionManagementController } from "./tuition-management.controller";

const router = Router();

// Public / Protected: Calculate Market Standard Rates
router.get("/market-rate", TuitionManagementController.calculateMarketRate);

// Protected: Log a class session
router.post("/class-logs", auth("tutor", "admin"), TuitionManagementController.createClassLog);

// Protected: Get class logs for tutor
router.get("/class-logs", auth("tutor", "admin"), TuitionManagementController.getTutorClassLogs);

// Protected: Update tuition payment status
router.patch("/payments", auth("tutor", "admin"), TuitionManagementController.updatePaymentStatus);

// Protected: Get tuition payments for tutor
router.get("/payments", auth("tutor", "admin"), TuitionManagementController.getTutorPayments);

export const tuitionManagementRoutes = router;
