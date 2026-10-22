import { api, API_BASE_URL } from "../lib/apiClient";
const base = `${API_BASE_URL}/api/external-ai`;
export interface ExternalConnection {
  id: string;
  clientName: string;
  workspaceNames: string[];
  scopes: string[];
  expiresAt: string;
}
export interface ConsentInfo {
  clientName: string;
  scopes: string[];
  workspaces: Array<{ id: string; name: string; writable: boolean }>;
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
) {
  const result = await api.post(`${base}/consent`, {
    request,
    workspaces,
    scopes,
  });
  return result.data.data.redirectUrl as string;
}
export async function denyExternalConsent(request: string) {
  const result = await api.post(`${base}/consent/deny`, { request });
  return result.data.data.redirectUrl as string;
}
