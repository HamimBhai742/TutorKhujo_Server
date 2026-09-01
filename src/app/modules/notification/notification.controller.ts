import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { NotificationService } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await NotificationService.getMyNotifications(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const result = await NotificationService.markAsRead(user.id, id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification marked as read successfully",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await NotificationService.markAllAsRead(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All notifications marked as read successfully",
    data: result,
  });
});

const registerDeviceToken = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { token, platform } = req.body;
  const result = await NotificationService.registerDeviceToken(user.id, token, platform || "web");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Device token registered successfully",
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const result = await NotificationService.deleteNotification(user.id, id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification deleted successfully",
    data: result,
  });
});

const deleteAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await NotificationService.deleteAllNotifications(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All notifications deleted successfully",
    data: result,
  });
});

const deregisterDeviceToken = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { token } = req.body;
  const result = await NotificationService.deregisterDeviceToken(user.id, token);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Device token deregistered successfully",
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  registerDeviceToken,
  deregisterDeviceToken,
};


