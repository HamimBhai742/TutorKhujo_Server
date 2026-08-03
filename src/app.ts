import express, { Application } from "express";
import { router } from "./app/routes";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import serverFancyUI from "server-fancy-ui";
import os from "os";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(cookieParser());

const allowedOrigins = ["http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        (process.env.NODE_ENV !== "production" &&
          (origin.includes(".ngrok-free.dev") ||
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

app.use("/api/v1", router);

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
