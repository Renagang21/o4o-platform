/**
 * API Health Check
 * Phase 1: 최소 API 연결 확인용
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://o4o-core-api-117791934476.asia-northeast3.run.app';

export interface HealthResponse {
  status: string;
  timestamp?: string;
  uptime?: number;
  version?: string;
  service?: string;
  environment?: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json();
}
