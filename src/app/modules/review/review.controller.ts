import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const studentId = req.user?.userId || req.user?.id;
  const result = await ReviewService.createReview(studentId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Review submitted successfully",
    data: result,
  });
});

const getTutorReviews = catchAsync(async (req: Request, res: Response) => {
  const { tutorId } = req.params;
  const result = await ReviewService.getTutorReviews(tutorId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tutor reviews fetched successfully",
    data: result,
  });
});

const getTutorStats = catchAsync(async (req: Request, res: Response) => {
  const { tutorId } = req.params;
  const result = await ReviewService.getTutorStats(tutorId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tutor stats fetched successfully",
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getTutorReviews,
  getTutorStats,
};
