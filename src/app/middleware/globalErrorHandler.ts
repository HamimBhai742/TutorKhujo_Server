import { NextFunction, Request, Response } from "express";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let message = err.message || "Something went wrong";
  let statusCode = err.statusCode || 500;
  const errorDetails: any = [];
  console.log(err.message, err);

  if (err.name === "ZodError") {
    message = "Validation error";
    statusCode = 400;

    err.issues.forEach((error: any) => {
      errorDetails.push({ path: error.path[0], message: error.message });
    });
  }

  if (err.name === "PrismaClientValidationError") {
    message = "Validation error";
    statusCode = 400;
    const errorMessage = err.message;

    // 🔥 field extract
    const match = errorMessage.match(/Argument `(.*?)` is missing/);

    if (match) {
      errorDetails.push({
        path: match[1],
        message: `${match[1]} is required`,
      });
    } else {
      errorDetails.push({
        path: "",
        message: "Invalid data provided",
      });
    }
  }

  // Handle Prisma known request errors (e.g. P2002 unique constraint)
  if (err.name === "PrismaClientKnownRequestError" || err.code?.startsWith?.("P2")) {
    statusCode = 400;

    if (err.code === "P2002") {
      const target: string = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : (err.meta?.target as string) ?? "field";
      message = "Er is een conflict opgetreden. Probeer het opnieuw.";
      errorDetails.push({
        path: target,
        message: `Duplicate value for unique field: ${target}`,
      });
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "Het gevraagde item kon niet worden gevonden.";
    } else {
      message = "Database fout. Probeer het opnieuw.";
    }
  }

  res.status(statusCode).json({ success: false, message, errorDetails });
};
