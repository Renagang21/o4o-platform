/**
 * Standardized API Response Types
 * All API responses should follow this structure
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  code?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Helper functions to create standardized responses
 */
export const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message
});

export const createErrorResponse = (error: string, code?: string): ApiError => ({
  success: false,
  error,
  code
});

export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> => ({
  success: true,
  data,
  total,
  page,
  limit,
  hasNext: page * limit < total,
  hasPrev: page > 1
});