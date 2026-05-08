import axios from 'axios';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://o4o-core-api-117791934476.asia-northeast3.run.app';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Bearer 토큰을 Authorization 헤더에 주입 */
export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

export interface LoginResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string;
      name?: string;
    };
  };
  error?: string;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
    email,
    password,
  });
  return response.data;
}
