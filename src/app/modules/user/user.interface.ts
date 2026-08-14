export interface IUpdateProfile {
  name?: string;
}

export interface IUpdateUserStatus {
  status?: "active" | "inactive" | "blocked";
  role?: "student" | "tutor" | "admin";
  isVerified?: boolean;
}
