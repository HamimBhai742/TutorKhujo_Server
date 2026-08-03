import { Response } from "express";

interface IResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  metaData?: IMetaData;
}

interface IMetaData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendResponse = <T>(res: Response, data: IResponse<T>) => {
  res.status(data.statusCode).json(data);
};
