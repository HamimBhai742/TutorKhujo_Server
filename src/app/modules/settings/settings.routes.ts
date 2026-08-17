import { Router } from "express";
import { auth } from "../../middleware/auth";
import { SettingsController } from "./settings.controller";

const router = Router();

router.get("/", SettingsController.getSettings);

router.patch("/", auth("admin"), SettingsController.updateSettings);

export const settingsRoutes = router;
