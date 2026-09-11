/**
 * 분회 서비스 가입 신청 API 클라이언트
 * WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1
 *
 * `POST /kpa-branch/join` — serviceKey/role 은 서버가 강제한다 (클라이언트가 보내지 않는다).
 * 면허번호·직역은 가입 시점에 canonical 약사 프로필(`kpa_pharmacist_profiles`)로 승격된다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch';

/**
 * 직역 구분 — 서버 register DTO 의 `activityType` enum 과 1:1 이다 (11종).
 * 신상신고 양식과 달리 가입 시점에는 양식(schema)이 없어 이 목록만 클라이언트가 가진다.
 * 서버가 enum 밖 값을 422 `ACTIVITY_TYPE_INVALID` 로 거절하므로 목록이 어긋나면 화면에서 드러난다.
 */
export const JOIN_ACTIVITY_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'pharmacy_owner', label: '약국 개설약사' },
  { value: 'pharmacy_employee', label: '약국 근무약사' },
  { value: 'hospital', label: '병원·의료기관 약사' },
  { value: 'manufacturer', label: '제약회사(제조)' },
  { value: 'importer', label: '수입업체' },
  { value: 'wholesaler', label: '도매업체' },
  { value: 'other_industry', label: '기타 산업체' },
  { value: 'government', label: '공직·공공기관' },
  { value: 'school', label: '학교·연구기관' },
  { value: 'other', label: '기타' },
  { value: 'inactive', label: '미활동' },
];

export interface BranchJoinInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
  activityType?: string;
  /** 이용약관 동의 — 서버 register 필수값 */
  tos: true;
}

export interface BranchJoinFailure {
  code: string;
  message: string;
  status?: string;
}

export async function applyBranchJoin(input: BranchJoinInput): Promise<void> {
  await api.post(`${BASE}/join`, input);
}

/** axios 오류에서 서버 계약(`{ success:false, error, code }`)을 꺼낸다 */
export function toJoinFailure(err: unknown): BranchJoinFailure {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  const code = typeof data?.code === 'string' ? data.code : 'JOIN_FAILED';
  const message = typeof data?.error === 'string' ? data.error : '가입 신청에 실패했습니다.';
  const status = (data?.data as { status?: string } | undefined)?.status;
  return { code, message, status };
}
