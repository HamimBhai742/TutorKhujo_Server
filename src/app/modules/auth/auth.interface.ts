export interface IRegisterUser {
  name: string;
  email: string;
  password: string;
  mobile: string;
  role: "student" | "tutor";
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IChangePassword {
  oldPassword: string;
  newPassword: string;
}

export interface IRefreshToken {
  token: string;
}

export interface IForgotPassword {
  email: string;
}

export interface IVerifyResetOtp {
  email: string;
  otpCode: string;
}

export interface IResetPassword {
  email: string;
  resetToken: string;
  newPassword: string;
}
