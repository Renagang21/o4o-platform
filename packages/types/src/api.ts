// API related types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}