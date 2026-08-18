export interface IUpdateProfile {
  name?: string;
  fullName?: string;
  mobile?: string;
  dob?: string;
  gender?: string;
  city?: string;
  bio?: string;
  profilePic?: string;
  institution?: string;
  department?: string;
  yearOfStudy?: string;
  qualifications?: any;
  subjects?: string[];
  tuitionModes?: string[];
  expectedSalary?: number;
  salary?: number;
  availability?: any;
  totalYearsExp?: string;
  experiences?: any;
  certificateUrl?: string;
  nidCardUrl?: string;
  isFirstLogin?: boolean;
}

export interface IUpdateUserStatus {
  status?: "active" | "inactive" | "blocked";
  role?: "student" | "tutor" | "admin";
  isVerified?: boolean;
}
