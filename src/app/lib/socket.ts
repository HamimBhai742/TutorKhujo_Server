import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;
const userSockets = new Map<string, string>(); // userId -> socketId

export const initSocket = (httpServer: HttpServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      userSockets.set(userId, socket.id);
      socket.join(userId); // Join room named after userId
      console.log(`User connected to socket: ${userId} (${socket.id})`);
    }

    socket.on("disconnect", () => {
      if (userId) {
        userSockets.delete(userId);
        console.log(`User disconnected from socket: ${userId}`);
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
