/**
 * API Health Check
 * Phase H8-5: 운영 서비스 공통 안정화
 *
 * 표준 응답 형식:
 * {
 *   service: string,
 *   status: "ok",
 *   timestamp: ISO string
 * }
 */

import { api } from '../lib/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await api.get(`${API_BASE_URL}/health`);
  return response.data;
}
