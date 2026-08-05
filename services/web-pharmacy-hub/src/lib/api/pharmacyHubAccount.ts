/**
 * Pharmacy-Hub 계정 API 클라이언트 (사용자 프로필 · 비밀번호)
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
 *
 *   GET   /pharmacy-hub/store-owner/account/profile   내 프로필
 *   PATCH /pharmacy-hub/store-owner/account/profile   { name, nickname, phone }
 *   PUT   /users/password                             { currentPassword, newPassword, newPasswordConfirm, serviceKey }
 *
 * 프로필이 PH scope 인 이유: 공통 `/api/v1/users/*` 는 `/password` 를 제외하면
 * 전부 requireAdmin 뒤에 있어 일반 사용자용 프로필 계약이 없다 (`/users/profile`
 * 은 admin 전용 `/:id` 에 걸려 403). 공통 가드 정책은 이 WO 의 변경 금지 항목이라
 * 건드리지 않고, users 자기 행만 다루는 PH 최소 계약을 쓴다.
 * 비밀번호는 기존 공통 계약을 그대로 재사용한다.
 *
 * serviceKey 를 함께 보내면 service_credentials(V2 경로)만 갱신된다
 * (WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1).
 * Pharmacy-Hub 로그인은 이 자격증명을 쓰므로 serviceKey 를 명시한다.
 *
 * ⚠️ 비밀번호 값은 이 모듈 밖으로 나가지 않는다 — 로깅·저장·재사용 금지.
 * ⚠️ 사용자 계정(users)과 매장 정보(organizations)는 서로 다른 SSOT 다. 섞지 않는다.
 */
import { api } from '../apiClient';
import { SERVICE_KEY } from '../../config/service';

export interface AccountProfile {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  displayName?: string | null;
  phone: string | null;
  status?: string | null;
  createdAt?: string | null;
}

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || body?.message || fallbackMessage);
  }
  return body.data as T;
}

const PROFILE_PATH = '/pharmacy-hub/store-owner/account/profile';

export async function fetchAccountProfile(): Promise<AccountProfile> {
  const res = await api.get(PROFILE_PATH);
  return unwrap<AccountProfile>(res.data, '계정 정보를 불러오지 못했습니다.');
}

export async function updateAccountProfile(patch: {
  name?: string;
  nickname?: string;
  phone?: string;
}): Promise<AccountProfile> {
  const res = await api.patch(PROFILE_PATH, patch);
  return unwrap<AccountProfile>(res.data, '계정 정보를 저장하지 못했습니다.');
}

/**
 * 비밀번호 변경. 실패는 예외로 올려 모달이 서버 메시지를 그대로 보여주게 한다
 * (자체 판정으로 성공을 흉내내지 않는다).
 */
export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<void> {
  await api.put('/users/password', {
    currentPassword,
    newPassword,
    newPasswordConfirm,
    serviceKey: SERVICE_KEY,
  });
}
