import { Response } from 'express';

// Standard API response interfaces
interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
}

interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    details?: any;
  };
}

// Success response helper
export const sendSuccess = <T = any>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: ApiSuccessResponse['meta']
): Response => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  if (message) {
    response.message = message;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

// Error response helper (for manual error responses)
export const sendError = (
  res: Response,
  message: string,
  code: string = 'ERROR',
  statusCode: number = 500,
  details?: any
): Response => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString()
    }
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

// Pagination response helper
export const sendPaginatedResponse = <T = any>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response => {
  const totalPages = Math.ceil(total / limit);
  
  return sendSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages
  });
};

// Common response shortcuts
export const ok = <T = any>(res: Response, data: T, message?: string) => 
  sendSuccess(res, data, message, 200);

export const created = <T = any>(res: Response, data: T, message: string = 'Resource created successfully') => 
  sendSuccess(res, data, message, 201);

export const noContent = (res: Response) => 
  res.status(204).send();

export const badRequest = (res: Response, message: string, details?: any) => 
  sendError(res, message, 'BAD_REQUEST', 400, details);

export const unauthorized = (res: Response, message: string = 'Unauthorized') => 
  sendError(res, message, 'UNAUTHORIZED', 401);

export const forbidden = (res: Response, message: string = 'Forbidden') => 
  sendError(res, message, 'FORBIDDEN', 403);

export const notFound = (res: Response, message: string = 'Resource not found') => 
  sendError(res, message, 'NOT_FOUND', 404);

export const conflict = (res: Response, message: string) => 
  sendError(res, message, 'CONFLICT', 409);

export const tooManyRequests = (res: Response, message: string = 'Too many requests') => 
  sendError(res, message, 'RATE_LIMIT_EXCEEDED', 429);

export const internalError = (res: Response, message: string = 'Internal server error') => 
  sendError(res, message, 'INTERNAL_ERROR', 500);