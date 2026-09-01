import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PointsService } from "./points.service";

const buyPackage = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await PointsService.buyPackage(user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Point package purchased successfully",
    data: result,
  });
});

const unlockTutorContact = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { tutorId } = req.body;
  const result = await PointsService.unlockTutorContact(user.id, tutorId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.alreadyUnlocked
      ? "Tutor contact is already unlocked"
      : "Tutor contact unlocked successfully with 10 Points",
    data: result,
  });
});

const unlockTuitionContact = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { tuitionPostId } = req.body;
  const result = await PointsService.unlockTuitionContact(user.id, tuitionPostId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.alreadyUnlocked
      ? "Tuition contact is already unlocked"
      : "Tuition contact unlocked successfully with 10 Points",
    data: result,
  });
});

const getMyWallet = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await PointsService.getMyWallet(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Wallet details retrieved successfully",
    data: result,
  });
});

export const PointsController = {
  buyPackage,
  unlockTutorContact,
  unlockTuitionContact,
  getMyWallet,
};
