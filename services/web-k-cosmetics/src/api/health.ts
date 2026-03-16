/**
 * API Health Check
 * Phase H8-6: 운영 서비스 공통 안정화
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 자동 갱신
 *
 * 표준 응답 형식:
 * {
 *   service: string,
 *   status: "ok",
 *   timestamp: ISO string
 * }
 */

import { api, API_BASE_URL } from '../lib/apiClient';

export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  // /health is NOT under /api/v1, use full URL
  const response = await api.get(`${API_BASE_URL}/health`);
  return response.data;
}
