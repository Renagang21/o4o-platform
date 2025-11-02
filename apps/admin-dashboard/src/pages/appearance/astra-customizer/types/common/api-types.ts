/**
 * API Related Types
 * API 요청/응답 관련 타입
 */

/**
 * Generic API Response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Save Settings Request
 */
export interface SaveSettingsRequest {
  settings: Record<string, unknown>;
  preset?: string;
}

/**
 * Load Settings Response
 */
export interface LoadSettingsResponse {
  settings: Record<string, unknown>;
  preset?: string;
  lastModified?: string;
}
