/**
 * API Health Check
 * Phase H8-5: 운영 서비스 공통 안정화
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * NOTE: /health is at root level (not under /api/v1), so we use full URL with api.get.
 *
 * 표준 응답 형식:
 * {
 *   service: string,
 *   status: "ok",
 *   timestamp: ISO string
 * }
 */

import { api, API_BASE_URL } from '@/lib/apiClient';

export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>(`${API_BASE_URL}/health`);
  return response.data;
}
