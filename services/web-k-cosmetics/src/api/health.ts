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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
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
