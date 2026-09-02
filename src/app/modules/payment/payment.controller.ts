import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentService } from "./payment.service";

const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllTransactions();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transactions retrieved successfully",
    data: result,
  });
});

const processPayout = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PaymentService.processPayout(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payout processed successfully",
    data: result,
  });
});

const getMyTransactions = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await PaymentService.getMyTransactions(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Your transactions retrieved successfully",
    data: result,
  });
});

const getInvoiceDetails = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { trxId } = req.params;
  const result = await PaymentService.getInvoiceDetails(user.id, user.role, trxId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Invoice details retrieved successfully",
    data: result,
  });
});

export const PaymentController = {
  getAllTransactions,
  processPayout,
  getMyTransactions,
  getInvoiceDetails,
};
