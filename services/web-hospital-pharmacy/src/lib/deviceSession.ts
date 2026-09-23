/**
 * Hospital Pharmacy — device 연결(로그인리스) 클라이언트 헬퍼
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1 §4·§5·§11·§12
 *
 * 병원약국은 개인 로그인 서비스가 아니다. 공용 PC 는 관리자가 발급한 1회용 코드로 한 번
 * enrollment 하면(=이 PC 연결), 이후 로그인 없이 device credential(HttpOnly 쿠키)로 쓴다.
 *
 * device 쿠키는 httpOnly 라 JS 가 읽지 못한다(§4). 따라서 연결 여부는 서버 /session 이 판정하고,
 * 모든 호출은 credentials:'include'(hospitalFetch)로 쿠키를 동반한다. localStorage 를 쓰지 않는다.
 */
import { hospitalFetch } from './apiClient';

export interface DeviceSession {
  enrolled: boolean;
  device?: { id: string; label: string | null };
}

/** 이 PC 의 연결 상태를 서버에 물어본다(쿠키 기반). 네트워크 실패는 미연결로 보수 처리. */
export async function getDeviceSession(): Promise<DeviceSession> {
  try {
    const { ok, body } = await hospitalFetch<DeviceSession>('/api/hospital/session');
    if (ok && body?.success && body.data) return body.data;
  } catch {
    /* 네트워크 오류 — 미연결로 취급해 연결 UX 를 보여준다. */
  }
  return { enrolled: false };
}

export class EnrollError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'EnrollError';
  }
}

/** 1회용 코드로 이 PC 를 연결한다. 성공 시 서버가 device 쿠키를 심는다(응답 body 에 토큰 없음). */
export async function enrollDevice(input: { code: string; label?: string }): Promise<{ id: string; label: string | null }> {
  let result: Awaited<ReturnType<typeof hospitalFetch<{ connected: boolean; device: { id: string; label: string | null } }>>>;
  try {
    result = await hospitalFetch('/api/hospital/enroll', {
      method: 'POST',
      body: { code: input.code, ...(input.label ? { label: input.label } : {}) },
    });
  } catch {
    throw new EnrollError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.', 'NETWORK_ERROR');
  }
  const { ok, body } = result;
  if (ok && body?.success && body.data?.device) {
    return body.data.device;
  }
  throw new EnrollError(
    body?.error || '이 PC 를 연결하지 못했습니다. 코드를 확인해 주세요.',
    body?.code || 'ENROLL_FAILED',
  );
}
