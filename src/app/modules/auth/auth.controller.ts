import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AuthService } from "./auth.service";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "User registered successfully. Please check your email for the OTP verification code.",
    data: result,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await AuthService.changePassword(user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.body?.token || req.cookies?.refreshToken;
  const result = await AuthService.refreshToken(token);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Access token refreshed successfully",
    data: result,
  });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, otpCode } = req.body;
  const result = await AuthService.verifyOtp(email, otpCode);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User verified successfully",
    data: result,
  });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await AuthService.resendOtp(email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "OTP code sent successfully",
    data: result,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password reset OTP sent successfully",
    data: result,
  });
});

const verifyResetOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, otpCode } = req.body;
  const result = await AuthService.verifyResetOtp(email, otpCode);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "OTP verified successfully. You may now reset your password.",
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password reset successfully",
    data: result,
  });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.googleLogin(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged in with Google successfully",
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;

  if (token) {
    // Delete refresh token from DB — prevents token reuse after logout
    await AuthService.revokeRefreshToken(token);
  }

  res.clearCookie("refreshToken");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

export const AuthController = {
  registerUser,
  loginUser,
  googleLogin,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
};
