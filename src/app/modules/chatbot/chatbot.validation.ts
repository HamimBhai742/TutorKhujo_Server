import { z } from "zod";

const chatValidationSchema = z.object({
  body: z.object({
    message: z.string({
      required_error: "Message is required",
    }),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string({
            required_error: "Message content is required",
          }),
        })
      )
      .optional(),
  }),
});

export const ChatbotValidation = {
  chatValidationSchema,
};
