import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

/**
 * Maintenance Mode Middleware.
 * Checks the AdminSettings.maintenanceMode flag in DB (cached for 30s).
 * Returns 503 for all non-admin routes when maintenance mode is enabled.
 */
let cachedMaintenanceMode: boolean | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export const maintenanceModeMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip maintenance check for admin routes and health check
  if (req.path.startsWith("/api/v1/admin") || req.path === "/api/v1/health") {
    return next();
  }

  const now = Date.now();

  // Use cached value if still fresh
  if (cachedMaintenanceMode !== null && now < cacheExpiry) {
    if (cachedMaintenanceMode) {
      return res.status(503).json({
        success: false,
        message: "TutorKhujo is currently under maintenance. Please check back soon.",
      });
    }
    return next();
  }

  // Refresh cache from DB
  try {
    const settings = await prisma.adminSettings.findUnique({
      where: { id: "singleton" },
      select: { maintenanceMode: true },
    });

    cachedMaintenanceMode = settings?.maintenanceMode ?? false;
    cacheExpiry = now + CACHE_TTL_MS;

    if (cachedMaintenanceMode) {
      return res.status(503).json({
        success: false,
        message: "TutorKhujo is currently under maintenance. Please check back soon.",
      });
    }
  } catch {
    // If DB check fails, allow request through — don't block on maintenance check errors
    cachedMaintenanceMode = false;
    cacheExpiry = now + CACHE_TTL_MS;
  }

  next();
};
