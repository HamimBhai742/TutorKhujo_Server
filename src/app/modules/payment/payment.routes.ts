import { Router } from "express";
import { auth } from "../../middleware/auth";
import { PaymentController } from "./payment.controller";

const router = Router();

router.get("/", auth("admin"), PaymentController.getAllTransactions);

router.patch("/:id/payout", auth("admin"), PaymentController.processPayout);

export const paymentRoutes = router;
