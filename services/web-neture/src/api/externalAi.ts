import { api, API_BASE_URL } from "../lib/apiClient";
const base = `${API_BASE_URL}/api/external-ai`;
export interface ExternalConnection {
  id: string;
  clientName: string;
  workspaceNames: string[];
  scopes: string[];
  createdAt?: string;
  expiresAt: string;
}
export interface ConsentInfo {
  clientName: string;
  scopes: string[];
  workspaces: Array<{
    id: string;
    name: string;
    writable: boolean;
    kind?: "supplier" | "store" | "organization" | "community";
  }>;
  /** 같은 앱으로 이미 쓰는 활성 연결 수 — 재연결이면 이전 연결을 바꿀지 사용자가 고른다 */
  existingConnections?: number;
  mailAccounts?: Array<{id:string;name:string;kind:'personal_mail';writable:boolean}>;
}
export async function listExternalConnections(): Promise<ExternalConnection[]> {
  const result = await api.get(`${base}/connections`);
  return result.data.data;
}
export async function revokeExternalConnection(id: string) {
  await api.delete(`${base}/connections/${encodeURIComponent(id)}`);
}
export async function getExternalConsent(
  request: string,
): Promise<ConsentInfo> {
  const result = await api.get(`${base}/consent`, { params: { request } });
  return result.data.data;
}
export async function approveExternalConsent(
  request: string,
  workspaces: string[],
  scopes: string[],
  replaceExisting = false,
) {
  const result = await api.post(`${base}/consent`, {
    request,
    workspaces,
    scopes,
    replaceExisting,
  });
  return result.data.data.redirectUrl as string;
}
export async function denyExternalConsent(request: string) {
  const result = await api.post(`${base}/consent/deny`, { request });
  return result.data.data.redirectUrl as string;
}
