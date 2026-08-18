import { z } from "zod";

const createReviewValidationSchema = z.object({
  body: z.object({
    tutorId: z.string({ required_error: "tutorId is required" }),
    rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
    comment: z.string().min(3, "Comment must be at least 3 characters"),
  }),
});

export const ReviewValidation = {
  createReviewValidationSchema,
};
