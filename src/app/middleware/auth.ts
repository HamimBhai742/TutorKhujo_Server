import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import config from "../../config";
import { AppError } from "../error/AppError";
import { prisma } from "../lib/prisma";

export const auth = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.headers.authorization?.split(" ")[1] || req.cookies?.accessToken;

      if (!token) {
        throw new AppError("You are not authorized!", 401);
      }

      const decoded = jwt.verify(
        token,
        config.jwt.secret as Secret
      ) as JwtPayload & { id: string; email: string; role: string };

      const { id, role } = decoded;

      const user = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!user) {
        throw new AppError("User not found!", 404);
      }

      if (user.status === "blocked" || user.status === "inactive") {
        throw new AppError(`User account is ${user.status}!`, 403);
      }

      if (requiredRoles.length && !requiredRoles.includes(role)) {
        throw new AppError("You are not authorized to perform this action!", 403);
      }

      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};
