/**
 * Pharmacy-Hub 계정 API 클라이언트 (사용자 프로필 · 비밀번호)
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
 * WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1:
 *   PH 전용 scope 계약(`/pharmacy-hub/store-owner/account/profile`) 대신
 *   플랫폼 공통 self-profile 계약을 쓴다. 그 경로는 store_owner scope 가드 뒤라
 *   운영자·공급자 본인이 자기 계정을 볼 수도 고칠 수도 없었다.
 *
 *   GET   /users/me/profile    내 프로필 (ACCOUNT_CORE)
 *   PATCH /users/me/profile    { name, nickname, phone } 등 allowlist 필드
 *   PUT   /users/password      { currentPassword, newPassword, newPasswordConfirm, serviceKey }
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
  firstName?: string | null;
  lastName?: string | null;
  nickname: string | null;
  displayName?: string | null;
  phone: string | null;
  status?: string | null;
  createdAt?: string | null;
  /** 서버가 알려주는 수정 가능 필드. 화면은 역할이 아니라 이 값으로 편집 여부를 판단한다. */
  editableFields?: string[];
}

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || body?.message || fallbackMessage);
  }
  return body.data as T;
}

const PROFILE_PATH = '/users/me/profile';

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
