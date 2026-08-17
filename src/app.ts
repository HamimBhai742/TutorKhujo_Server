import express, { Application } from "express";
import { router } from "./app/routes";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { maintenanceModeMiddleware } from "./app/middleware/maintenanceMode";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import serverFancyUI from "server-fancy-ui";
import os from "os";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

const app: Application = express();

// ==============================================================
// Security Headers (HSTS, X-Frame-Options, XSS-Protection, etc.)
// ==============================================================
app.use(helmet());

// ==============================================================
// Request Logging
// ==============================================================
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(morganFormat));

// ==============================================================
// Body Parsers — with 10kb size limit to prevent DoS
// ==============================================================
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(cookieParser());

// ==============================================================
// CORS
// ==============================================================
const allowedOrigins = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        (process.env.NODE_ENV !== "production" &&
          (origin.includes("localhost:") ||
            origin.includes(".ngrok-free.dev") ||
            origin.startsWith("http://10.") ||
            origin.startsWith("http://192.168.")));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ==============================================================
// Rate Limiting — Global: 200 req per 15 minutes per IP
// ==============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
  skip: (req) => req.path === "/api/v1/health", // don't rate-limit health checks
});

// Strict Rate Limiter — Auth routes: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

app.use(globalLimiter);

// ==============================================================
// Maintenance Mode — returns 503 for all routes when enabled
// ==============================================================
app.use(maintenanceModeMiddleware);

// ==============================================================
// Routes
// ==============================================================
app.use("/api/v1", router);
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/forgot-password", authLimiter);
app.use("/api/v1/auth/verify-otp", authLimiter);
app.use("/api/v1/auth/resend-otp", authLimiter);

app.get(
  "/",
  serverFancyUI({
    ui: "root",
    brandName: "Tutor Khujo",
    brandSub: "Trusted Platform for Tutoring",
    orbLabel: "Tutor Khujo<br />Backend",
    pageTitle: "Tutor Khujo",
  }),
);

app.get("/api/v1/health", (req, res, next) => {
  serverFancyUI({
    ui: "health",
    status: "SYSTEM OPERATIONAL",
    uptime: `${Math.floor(process.uptime())}s`,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    cpu: `${os.loadavg()[0].toFixed(2)}`,
  })(req, res, next);
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
