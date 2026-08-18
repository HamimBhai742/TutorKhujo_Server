import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";

const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await UserService.getMe(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await UserService.updateMe(user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile updated successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, search, role } = req.query;
  const result = await UserService.getAllUsers({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string | undefined,
    role: role as string | undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.getUserById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.updateUserStatus(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User status updated successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.deleteUser(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

const onboardTutor = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await UserService.onboardTutor(user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tutor profile onboarding details updated successfully",
    data: result,
  });
});

const getAdminStats = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAdminStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin statistics retrieved successfully",
    data: result,
  });
});

const getPendingVerifications = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getPendingVerifications();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pending tutor verifications retrieved successfully",
    data: result,
  });
});

const updateVerificationStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await UserService.updateVerificationStatus(id, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Tutor verification status updated to ${status}`,
    data: result,
  });
});

const getAllPublicTutors = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllPublicTutors(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tutors retrieved successfully",
    data: result,
  });
});

const getPublicTutorById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.getPublicTutorById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tutor retrieved successfully",
    data: result,
  });
});

export const UserController = {
  getMe,
  updateMe,
  onboardTutor,
  getAdminStats,
  getPendingVerifications,
  updateVerificationStatus,
  getAllUsers,
  getUserById,
  getAllPublicTutors,
  getPublicTutorById,
  updateUserStatus,
  deleteUser,
};
