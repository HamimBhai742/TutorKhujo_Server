import { z } from "zod";

const updateProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

const updateUserStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["active", "inactive", "blocked"]).optional(),
    role: z.enum(["user", "admin"]).optional(),
  }),
});

export const UserValidation = {
  updateProfileValidationSchema,
  updateUserStatusValidationSchema,
};
