import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import config from "../../config";
import { isRedisAvailable, redisClient } from "./redis";
import { createAdapter } from "@socket.io/redis-adapter";

let io: SocketServer | null = null;
const userSockets = new Map<string, string>(); // userId -> socketId

// Same allowed origins as app.ts for consistency
const allowedSocketOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

export const initSocket = async (httpServer: HttpServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isAllowed =
          allowedSocketOrigins.includes(origin) ||
          origin.endsWith(".vercel.app") ||
          (process.env.NODE_ENV !== "production" &&
            (origin.includes("localhost:") ||
              origin.includes(".ngrok-free.dev") ||
              origin.startsWith("http://10.") ||
              origin.startsWith("http://192.168.")));

        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error("Socket origin not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // ============================================================
  // Redis Adapter — enables multi-instance horizontal scaling.
  // Socket events are broadcast across all server instances.
  // Falls back to in-memory (single-instance) when Redis is offline.
  // ============================================================
  if (isRedisAvailable && redisClient) {
    try {
      const pubClient = redisClient.duplicate();
      const subClient = redisClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log("Socket.io: Redis adapter initialized (multi-instance mode)");
    } catch (err) {
      console.warn("Socket.io: Redis adapter failed, falling back to in-memory adapter", err);
    }
  } else {
    console.log("Socket.io: Using in-memory adapter (single-instance mode)");
  }

  // ============================================================
  // JWT Authentication Middleware — runs before ANY connection
  // The client must pass the JWT in socket.handshake.auth.token
  // ============================================================
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret as Secret) as JwtPayload & {
        id: string;
        email: string;
        role: string;
      };
      // Attach verified user info to the socket for use in connection handler
      (socket as any).user = decoded;
      next();
    } catch {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // userId is now taken from verified JWT — not from untrusted query params
    const user = (socket as any).user as { id: string; email: string; role: string };
    const userId = user?.id;

    if (userId) {
      userSockets.set(userId, socket.id);
      socket.join(userId); // Join room named after userId
      console.log(`[Socket] User connected: ${userId} (${socket.id})`);
    }

    socket.on("disconnect", () => {
      if (userId) {
        userSockets.delete(userId);
        console.log(`[Socket] User disconnected: ${userId}`);
      }
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const getUserSocketId = (userId: string): string | undefined => {
  return userSockets.get(userId);
};
