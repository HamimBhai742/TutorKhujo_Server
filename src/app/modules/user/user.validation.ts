import { z } from "zod";

const updateProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    mobile: z.string().optional(),
    dob: z.string().optional(),
    gender: z.string().optional(),
    city: z.string().optional(),
    bio: z.string().optional(),
    profilePic: z.string().optional(),
    institution: z.string().optional(),
    department: z.string().optional(),
    yearOfStudy: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    tuitionModes: z.array(z.string()).optional(),
    expectedSalary: z.number().optional(),
    availability: z.any().optional(),
    totalYearsExp: z.string().optional(),
    experiences: z.any().optional(),
    certificateUrl: z.string().optional(),
    nidCardUrl: z.string().optional(),
    role: z.enum(["student", "tutor"]).optional(),
    isFirstLogin: z.boolean().optional(),
  }),
});

const updateUserStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["active", "inactive", "blocked"]).optional(),
    role: z.enum(["student", "tutor", "admin"]).optional(),
    isVerified: z.boolean().optional(),
  }),
});

const onboardTutorValidationSchema = z.object({
  body: z.object({
    fullName: z.string().optional(),
    dob: z.string().optional(),
    gender: z.string().optional(),
    city: z.string().optional(),
    bio: z.string().optional(),
    qualifications: z.array(z.any()).optional(),
    tuitionModes: z.array(z.string()).optional(),
    subjects: z.array(z.string()).optional(),
    salary: z.number().optional(),
    expectedSalary: z.number().optional(),
    availability: z.any().optional(),
    totalYearsExp: z.string().optional(),
    experiences: z.array(z.any()).optional(),
    profilePic: z.string().optional(),
    certificateUrl: z.string().optional(),
    nidCardUrl: z.string().optional(),
  }),
});

const updateVerificationValidationSchema = z.object({
  body: z.object({
    status: z.enum(["Approved", "Rejected"]),
  }),
});

export const UserValidation = {
  updateProfileValidationSchema,
  updateUserStatusValidationSchema,
  onboardTutorValidationSchema,
  updateVerificationValidationSchema,
};
