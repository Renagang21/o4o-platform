/**
 * API Health Check
 * Phase H8-6: 운영 서비스 공통 안정화
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
  const { data } = await api.get(`${API_BASE_URL}/health`);
  return data;
}
