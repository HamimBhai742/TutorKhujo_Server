import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import config from "../../../config";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import {
  IChangePassword,
  ILoginUser,
  IRegisterUser,
  IForgotPassword,
  IVerifyResetOtp,
  IResetPassword,
} from "./auth.interface";
import { enqueueEmail } from "../../queues/email.queue";
import { getVerificationOtpTemplate } from "../../utils/templates/verificationOtp.template";
import { getResetPasswordOtpTemplate } from "../../utils/templates/resetPasswordOtp.template";

const registerUser = async (payload: IRegisterUser) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (isUserExist) {
    if (isUserExist.isVerified) {
      throw new AppError("User with this email already exists", 400);
    }

    // If user exists but is NOT verified yet, let them re-register.
    // Update their details, generate a new OTP code, and send the email.
    const hashedPassword = await bcrypt.hash(
      payload.password,
      Number(config.password_salt)
    );

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const updatedUser = await prisma.user.update({
      where: {
        email: payload.email,
      },
      data: {
        ...payload,
        password: hashedPassword,
        otpCode,
        otpExpires,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const emailHtml = getVerificationOtpTemplate(updatedUser.name, otpCode);
    await enqueueEmail(updatedUser.email, "Verify Your TutorKhujo Account", emailHtml);

    return updatedUser;
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.password_salt)
  );

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  const newUser = await prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
      isVerified: false,
      otpCode,
      otpExpires,
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      status: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Enqueue verification email job via BullMQ
  const emailHtml = getVerificationOtpTemplate(newUser.name, otpCode);
  await enqueueEmail(newUser.email, "Verify Your TutorKhujo Account", emailHtml);

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

  // Enforce account verification
  if (!user.isVerified) {
    throw new AppError("Please verify your account using the OTP code sent to your email.", 403);
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

  const { password, otpCode, otpExpires, ...result } = user;

  return {
    accessToken,
    user: result,
  };
};

const verifyOtp = async (email: string, otpCode: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isVerified) {
    throw new AppError("User is already verified", 400);
  }

  if (!user.otpCode || user.otpCode !== otpCode) {
    throw new AppError("Invalid verification code", 400);
  }

  if (!user.otpExpires || new Date() > user.otpExpires) {
    throw new AppError("Verification code has expired. Please request a new one.", 400);
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      isVerified: true,
      otpCode: null,
      otpExpires: null,
    },
  });

  const jwtPayload = {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt.secret as Secret, {
    expiresIn: config.jwt.expire_in as SignOptions["expiresIn"],
  });

  const { password, otpCode: oc, otpExpires: oe, ...result } = updatedUser;

  return {
    accessToken,
    user: result,
  };
};

const resendOtp = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.isVerified) {
    throw new AppError("User is already verified", 400);
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      otpCode,
      otpExpires,
    },
  });

  // Enqueue verification email job via BullMQ
  const emailHtml = getVerificationOtpTemplate(user.name, otpCode);
  await enqueueEmail(user.email, "Verify Your TutorKhujo Account", emailHtml);

  return { message: "Verification OTP sent successfully" };
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



const forgotPassword = async (payload: IForgotPassword) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    throw new AppError("User with this email does not exist", 404);
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      resetPasswordOtp: otpCode,
      resetPasswordOtpExpires: otpExpires,
      resetPasswordToken: null,
      resetPasswordTokenExpires: null,
    },
  });

  // Enqueue password reset email job via BullMQ
  const emailHtml = getResetPasswordOtpTemplate(user.name, otpCode);
  await enqueueEmail(user.email, "Reset Your TutorKhujo Password", emailHtml);

  return { message: "Password reset OTP sent successfully" };
};

const verifyResetOtp = async (email: string, otpCode: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.resetPasswordOtp || user.resetPasswordOtp !== otpCode) {
    throw new AppError("Invalid verification code", 400);
  }

  if (!user.resetPasswordOtpExpires || new Date() > user.resetPasswordOtpExpires) {
    throw new AppError("Verification code has expired. Please request a new one.", 400);
  }

  // Generate a unique single-use reset password token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      resetPasswordOtp: null, // consume the OTP immediately
      resetPasswordOtpExpires: null,
      resetPasswordToken: resetToken,
      resetPasswordTokenExpires: tokenExpires,
    },
  });

  return { resetToken };
};

const resetPassword = async (payload: IResetPassword) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.resetPasswordToken || user.resetPasswordToken !== payload.resetToken) {
    throw new AppError("Invalid or already used reset token. Please request a new OTP.", 400);
  }

  if (!user.resetPasswordTokenExpires || new Date() > user.resetPasswordTokenExpires) {
    throw new AppError("Reset token has expired. Please request a new OTP.", 400);
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.password_salt)
  );

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
      resetPasswordToken: null, // consume token
      resetPasswordTokenExpires: null,
    },
  });

  return { message: "Password reset successfully. Please log in with your new password." };
};

export const AuthService = {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  refreshToken,
};
