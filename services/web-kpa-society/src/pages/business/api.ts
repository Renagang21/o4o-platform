import { authClient } from '../../contexts/AuthContext';

export interface Business {
  key: string;
  name: string;
  communityKey: string | null;
  registrationConditions: string | null;
}
export interface ParticipantAccess {
  kind: 'independent' | 'semi-franchise';
  businessKey?: string;
  name: string;
  allowed: boolean;
  canManage: boolean;
}
export interface BusinessMembership {
  key: string;
  membershipStatus: string | null;
  reason: string | null;
}
export interface BusinessContent {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  semiFranchiseKey: string;
}

/** Existing authenticated transport and server-owned approval/storage contracts. */
export const businessApi = {
  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const response = await authClient.api.get(path, { params });
    return response.data.data as T;
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await authClient.api.post(path, body);
    return response.data.data as T;
  },
};
export const businessBase = (key: string) => `/businesses/${encodeURIComponent(key)}`;
export const communityApiBase = (key: string) => `/communities/${encodeURIComponent(key)}`;
export const pharmacyApiBase = '/neture/pharmacy';

export function businessError(error: unknown): string {
  const data = (error as { response?: { data?: { error?: unknown } } })?.response?.data;
  return typeof data?.error === 'string' ? data.error : '요청을 처리하지 못했습니다. 다시 시도해 주세요.';
}
