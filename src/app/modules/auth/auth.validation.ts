import { z } from "zod";

const registerValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }),
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters"),
    mobile: z.string({ required_error: "Mobile number is required" }),
    role: z.enum(["student", "tutor"], { required_error: "Role is required" }),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
    password: z.string({ required_error: "Password is required" }),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: "Old password is required" }),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(6, "New password must be at least 6 characters"),
  }),
});

const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({ required_error: "Refresh token is required" }),
  }).optional(),
  body: z.object({
    token: z.string().optional(),
  }).optional(),
});

const verifyOtpValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
    otpCode: z
      .string({ required_error: "OTP code is required" })
      .length(6, "OTP code must be 6 digits"),
  }),
});

const resendOtpValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
  }),
});

const forgotPasswordValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
  }),
});

const verifyResetOtpValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
    otpCode: z
      .string({ required_error: "OTP code is required" })
      .length(6, "OTP code must be 6 digits"),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Invalid email address"),
    resetToken: z.string({ required_error: "Reset token is required" }),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(6, "New password must be at least 6 characters"),
  }),
});

const googleLoginValidationSchema = z.object({
  body: z.object({
    idToken: z.string({ required_error: "Google ID token is required" }),
    role: z.enum(["student", "tutor"]).optional(),
  }),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  changePasswordValidationSchema,
  refreshTokenValidationSchema,
  verifyOtpValidationSchema,
  resendOtpValidationSchema,
  forgotPasswordValidationSchema,
  verifyResetOtpValidationSchema,
  resetPasswordValidationSchema,
  googleLoginValidationSchema,
};
