import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import config from "../../config";
import { isRedisAvailable, redisClient } from "./redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { prisma } from "./prisma";

let io: SocketServer | null = null;
const userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

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

  // Redis Adapter — enables multi-instance horizontal scaling
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

  // JWT Authentication Middleware
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
      (socket as any).user = decoded;
      next();
    } catch {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user as { id: string; email: string; role: string };
    const userId = user?.id;

    if (userId) {
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);
      socket.join(userId);

      // Broadcast user online status
      socket.broadcast.emit("user_online", { userId });
      // Send current online user list to newly connected client
      socket.emit("online_users", Array.from(userSockets.keys()));
      console.log(`[Socket] User connected: ${userId} (${socket.id}). Online: ${userSockets.size}`);
    }

    // Join conversation room
    socket.on("join_conversation", (conversationId: string) => {
      if (conversationId) {
        socket.join(conversationId);
      }
    });

    // Typing start indicator
    socket.on("typing_start", async (data: { conversationId: string; recipientId?: string }) => {
      let targetRecipientId = data?.recipientId;
      if (!targetRecipientId && data?.conversationId) {
        try {
          const conv = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
            select: { studentId: true, tutorId: true },
          });
          if (conv) {
            targetRecipientId = conv.studentId === userId ? conv.tutorId : conv.studentId;
          }
        } catch (_) {}
      }

      if (targetRecipientId) {
        io?.to(targetRecipientId).emit("typing_status", {
          conversationId: data.conversationId,
          senderId: userId,
          isTyping: true,
        });
      }

      if (data?.conversationId) {
        socket.to(data.conversationId).emit("typing_status", {
          conversationId: data.conversationId,
          senderId: userId,
          isTyping: true,
        });
      }
    });

    // Typing stop indicator
    socket.on("typing_stop", async (data: { conversationId: string; recipientId?: string }) => {
      let targetRecipientId = data?.recipientId;
      if (!targetRecipientId && data?.conversationId) {
        try {
          const conv = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
            select: { studentId: true, tutorId: true },
          });
          if (conv) {
            targetRecipientId = conv.studentId === userId ? conv.tutorId : conv.studentId;
          }
        } catch (_) {}
      }

      if (targetRecipientId) {
        io?.to(targetRecipientId).emit("typing_status", {
          conversationId: data.conversationId,
          senderId: userId,
          isTyping: false,
        });
      }

      if (data?.conversationId) {
        socket.to(data.conversationId).emit("typing_status", {
          conversationId: data.conversationId,
          senderId: userId,
          isTyping: false,
        });
      }
    });

    // Read receipts
    socket.on("mark_read", async (data: { conversationId: string; recipientId?: string }) => {
      let targetRecipientId = data?.recipientId;
      if (!targetRecipientId && data?.conversationId) {
        try {
          const conv = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
            select: { studentId: true, tutorId: true },
          });
          if (conv) {
            targetRecipientId = conv.studentId === userId ? conv.tutorId : conv.studentId;
          }
        } catch (_) {}
      }

      if (targetRecipientId) {
        io?.to(targetRecipientId).emit("messages_read", {
          conversationId: data.conversationId,
          readerId: userId,
        });
      }

      if (data?.conversationId) {
        socket.to(data.conversationId).emit("messages_read", {
          conversationId: data.conversationId,
          readerId: userId,
        });
      }
    });

    // Request active online users
    socket.on("get_online_users", () => {
      socket.emit("online_users", Array.from(userSockets.keys()));
    });

    socket.on("disconnect", () => {
      if (userId && userSockets.has(userId)) {
        const socketSet = userSockets.get(userId)!;
        socketSet.delete(socket.id);
        if (socketSet.size === 0) {
          userSockets.delete(userId);
          io?.emit("user_offline", { userId });
          console.log(`[Socket] User offline: ${userId}. Online: ${userSockets.size}`);
        }
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

export const isUserOnline = (userId: string): boolean => {
  return userSockets.has(userId) && (userSockets.get(userId)?.size || 0) > 0;
};
