import bcrypt from "bcrypt";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import config from "../../../config";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import {
  IChangePassword,
  ILoginUser,
  IRegisterUser,
} from "./auth.interface";

const registerUser = async (payload: IRegisterUser) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (isUserExist) {
    throw new AppError("User with this email already exists", 400);
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.password_salt)
  );

  const newUser = await prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return newUser;
};

const loginUser = async (payload: ILoginUser) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    throw new AppError("User does not exist", 404);
  }

  if (user.status === "blocked" || user.status === "inactive") {
    throw new AppError(`User account is ${user.status}`, 403);
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password
  );

  if (!isPasswordMatched) {
    throw new AppError("Invalid credentials", 401);
  }

  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt.secret as Secret, {
    expiresIn: config.jwt.expire_in as SignOptions["expiresIn"],
  });

  const { password, ...result } = user;

  return {
    accessToken,
    user: result,
  };
};

const changePassword = async (
  userId: string,
  payload: IChangePassword
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError("User does not exist", 404);
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.oldPassword,
    user.password
  );

  if (!isPasswordMatched) {
    throw new AppError("Old password does not match", 400);
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.password_salt)
  );

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: newHashedPassword,
    },
  });

  return { message: "Password updated successfully" };
};

const refreshToken = async (token: string) => {
  let decoded: JwtPayload & { id: string; email: string; role: string };
  try {
    decoded = jwt.verify(
      token,
      config.jwt.secret as Secret
    ) as JwtPayload & { id: string; email: string; role: string };
  } catch (err) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.status === "blocked" || user.status === "inactive") {
    throw new AppError(`User account is ${user.status}`, 403);
  }

  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt.secret as Secret, {
    expiresIn: config.jwt.expire_in as SignOptions["expiresIn"],
  });

  return { accessToken };
};

export const AuthService = {
  registerUser,
  loginUser,
  changePassword,
  refreshToken,
};
