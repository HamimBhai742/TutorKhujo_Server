import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { TuitionManagementService } from "./tuition-management.service";

const createClassLog = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionManagementService.createClassLog(user.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Class session logged successfully",
    data: result,
  });
});

const getTutorClassLogs = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionManagementService.getTutorClassLogs(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Class logs retrieved successfully",
    data: result,
  });
});

const updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionManagementService.updatePaymentStatus(user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tuition payment status updated successfully",
    data: result,
  });
});

const getTutorPayments = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionManagementService.getTutorPayments(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tuition payments retrieved successfully",
    data: result,
  });
});

const calculateMarketRate = catchAsync(async (req: Request, res: Response) => {
  const result = await TuitionManagementService.calculateMarketStandardRate(req.query as any);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Market standard fee rate calculated successfully",
    data: result,
  });
});

export const TuitionManagementController = {
  createClassLog,
  getTutorClassLogs,
  updatePaymentStatus,
  getTutorPayments,
  calculateMarketRate,
};
