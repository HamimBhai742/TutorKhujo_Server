import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { TuitionService } from "./tuition.service";

const createTuitionPost = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionService.createTuitionPost(user.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Tuition post created successfully",
    data: result,
  });
});

const getMyTuitionPosts = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionService.getMyTuitionPosts(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Your tuition posts retrieved successfully",
    data: result,
  });
});

const getAllTuitionPosts = catchAsync(async (req: Request, res: Response) => {
  const result = await TuitionService.getAllTuitionPosts(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tuition posts retrieved successfully",
    data: result.data,
    metaData: result.metaData,
  });
});

const getTuitionPostById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TuitionService.getTuitionPostById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tuition post retrieved successfully",
    data: result,
  });
});

const updateTuitionPost = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const result = await TuitionService.updateTuitionPost(
    id,
    user.id,
    user.role,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tuition post updated successfully",
    data: result,
  });
});

const updatePostStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { status } = req.body;
  const result = await TuitionService.updatePostStatus(
    id,
    user.id,
    user.role,
    status
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Tuition post status updated to ${status}`,
    data: result,
  });
});

const deleteTuitionPost = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const result = await TuitionService.deleteTuitionPost(
    id,
    user.id,
    user.role
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tuition post deleted successfully",
    data: result,
  });
});

const getStudentDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionService.getStudentDashboardStats(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: result,
  });
});

const applyForTuition = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const result = await TuitionService.applyForTuition(id, user.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Application submitted successfully",
    data: result,
  });
});

const getMyReceivedApplications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionService.getMyReceivedApplications(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Received applications retrieved successfully",
    data: result,
  });
});

const getTutorAppliedPosts = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await TuitionService.getTutorAppliedPosts(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tutor applied posts retrieved successfully",
    data: result,
  });
});

const updateApplicationStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { applicationId } = req.params;
  const { status } = req.body;
  const result = await TuitionService.updateApplicationStatus(
    applicationId,
    user.id,
    user.role,
    status
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Application marked as ${status}`,
    data: result,
  });
});

export const TuitionController = {
  createTuitionPost,
  getMyTuitionPosts,
  getAllTuitionPosts,
  getTuitionPostById,
  updateTuitionPost,
  updatePostStatus,
  deleteTuitionPost,
  getStudentDashboardStats,
  applyForTuition,
  getMyReceivedApplications,
  getTutorAppliedPosts,
  updateApplicationStatus,
};
