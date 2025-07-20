import { AxiosError } from 'axios';

export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

export type ApiError = AxiosError<ApiErrorResponse>;