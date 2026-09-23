/**
 * Hospital Pharmacy — 관리자(별도 역할) API 클라이언트
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §2·§10·§16
 *
 * 관리자 엔드포인트(/api/hospital/admin/*)는 platform:super_admin 이 authenticate(Bearer)로 접근한다.
 * 이는 device credential 과 완전히 분리된 경로다 — 일반 사용자(로그인리스) 흐름과 섞이지 않는다.
 * 따라서 여기서는 authClient(Bearer)를 쓴다(device 쿠키 아님). 절대 URL 로 /api/v1 base 를 덮어쓴다.
 */
import { api, API_BASE_URL } from './apiClient';

export interface EnrollmentCodeRow {
  id: string;
  label: string | null;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  status: 'consumed' | 'expired' | 'active';
}

export interface DeviceRow {
  id: string;
  label: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface IssuedCode {
  id: string;
  code: string;
  label: string | null;
  expiresAt: string;
}

export async function issueEnrollmentCode(label?: string): Promise<IssuedCode> {
  const res = await api.post(`${API_BASE_URL}/api/hospital/admin/enrollment-codes`, {
    ...(label?.trim() ? { label: label.trim() } : {}),
  });
  return res?.data?.data as IssuedCode;
}

export async function listEnrollmentCodes(): Promise<EnrollmentCodeRow[]> {
  const res = await api.get(`${API_BASE_URL}/api/hospital/admin/enrollment-codes`);
  return (res?.data?.data?.codes as EnrollmentCodeRow[]) ?? [];
}

export async function listDevices(): Promise<DeviceRow[]> {
  const res = await api.get(`${API_BASE_URL}/api/hospital/admin/devices`);
  return (res?.data?.data?.devices as DeviceRow[]) ?? [];
}

export async function revokeDevice(id: string): Promise<void> {
  await api.post(`${API_BASE_URL}/api/hospital/admin/devices/${id}/revoke`, {});
}
