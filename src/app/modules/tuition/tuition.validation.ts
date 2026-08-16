import { z } from "zod";

const createTuitionPostValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    classLevel: z.string({
      required_error: "Class level is required",
    }).min(1, "Class level cannot be empty"),
    subjects: z.array(z.string()).min(1, "At least one subject is required"),
    budget: z.number({
      required_error: "Budget is required",
    }).positive("Budget must be a positive number"),
    mode: z.enum(["Home", "Online", "Both"]).optional(),
    frequency: z.string().optional(),
    location: z.string({
      required_error: "Location is required",
    }).min(1, "Location cannot be empty"),
    genderPreference: z.string().optional(),
    extraNotes: z.string().optional(),
  }),
});

const updateTuitionPostValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    classLevel: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    budget: z.number().positive().optional(),
    mode: z.enum(["Home", "Online", "Both"]).optional(),
    frequency: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(["Active", "Paused", "Closed"]).optional(),
    genderPreference: z.string().optional(),
    extraNotes: z.string().optional(),
  }),
});

const updatePostStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["Active", "Paused", "Closed"], {
      required_error: "Status is required",
    }),
  }),
});

const applyTuitionValidationSchema = z.object({
  body: z.object({
    salaryBid: z.number({
      required_error: "Salary bid is required",
    }).positive("Salary bid must be greater than 0"),
    proposal: z.string().optional(),
  }),
});

const updateApplicationStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["Pending", "Shortlisted", "Hired", "Rejected"], {
      required_error: "Application status is required",
    }),
  }),
});

export const TuitionValidation = {
  createTuitionPostValidationSchema,
  updateTuitionPostValidationSchema,
  updatePostStatusValidationSchema,
  applyTuitionValidationSchema,
  updateApplicationStatusValidationSchema,
};
