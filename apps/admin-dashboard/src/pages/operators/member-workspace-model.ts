import type {MemberRegistration,MemberRegistrationType} from '@o4o/types';
export type MemberTask = 'all' | 'pending' | 'inactive' | 'qualifications' | 'pharmacies' | 'corrections';
export interface MemberPermissions { readDocuments?: boolean; qualifications: boolean; pharmacies: boolean; applications?: boolean; edit: boolean; manageAccount?: boolean; erase?: boolean }
export interface MemberRow { operatorReadOnly?:boolean; userId: string; name: string | null; nickname?:string|null;email: string; loginMethods?:string[];registrationType?:MemberRegistrationType|null;registrationState?:string|null;accountStatus: string; accountActive?:boolean; serviceStatus?: string; qualificationStatus?: string; pharmacyStatus?: string | null }
export interface MemberProfile { operatorReadOnly?:boolean; loginMethods?:string[]; hasPassword?:boolean; userId: string; name: string | null; nickname: string | null; email: string; phone: string | null; accountStatus: string; accountActive?:boolean; serviceStatus?: string; emailVerified: boolean; joinedAt: string; version: string }
export interface Qualification { licenseNumber: string | null; status: string; reason: string | null; approvedAt: string | null; reviewedBy: string | null; version: string }
export interface MemberPharmacy {
  id: string; version?: string; organizationId: string; name: string; businessNumber: string; licenseNumber: string; status: string; reason: string | null;
  appliedAt: string; decidedAt: string | null; decidedBy: string | null; address: string | null; phone: string | null;
  representativeName: string | null; businessType: string | null; businessCategory: string | null; documentId: string | null;
  contactName: string | null; managerPhone: string | null; contactEmail: string | null; taxInvoiceEmail: string | null;
}
export interface MemberDetail {
  registration?:MemberRegistration|null;
  member: MemberProfile; qualification: Qualification | null; legacyLicense: string | null; legacyBusiness?: Record<string, string> | null; pharmacies: MemberPharmacy[];
  history: Array<{ action: string; createdAt: string; actorId: string | null; reason: string | null }>; permissions: MemberPermissions;
}
export const qualificationLabels: Record<string, string> = { unrequested: '신청 없음', pending: '검토 대기', approved: '승인', rejected: '반려', revoked: '승인 취소' };
export const memberServiceLabels:Record<string,string>={active:'정상',suspended:'정지',withdrawn:'해지',pending:'확인 대기',rejected:'반려',none:'가입 없음'};
export const pharmacyLabels: Record<string, string> = { pending: '심사 대기', active: '승인', suspended: '정지', rejected: '반려', terminated: '종료' };
export const pharmacyActions: Record<string, Array<{ action: string; label: string }>> = {
  pending: [{ action: 'approve', label: '약국 승인' }, { action: 'reject', label: '약국 반려' }],
  active: [{ action: 'suspend', label: '약국 정지' }, { action: 'terminate', label: '약국 종료' }],
  suspended: [{ action: 'reactivate', label: '약국 재개' }, { action: 'terminate', label: '약국 종료' }],
};
export function canActivatePharmacy(detail: MemberDetail, pharmacy: MemberPharmacy) {
  return detail.member.accountActive!==false && detail.member.emailVerified && ['active', 'approved'].includes(detail.member.accountStatus) &&
    detail.qualification?.status === 'approved' && detail.qualification.licenseNumber?.trim() === pharmacy.licenseNumber.trim();
}
export function memberError(error: unknown) {
  const response = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof response === 'string' ? response : '처리하지 못했습니다. 권한과 최신 정보를 다시 확인해 주시기 바랍니다.';
}

export type MemberWorkMode = 'detail' | 'edit' | 'reject' | 'delete' | 'pharmacy';
/** 처리 후 동작: close 면 패널을 닫고 목록 위에 done 문구를 보인다(가입 승인·반려 · 해지·복구). */
export interface PerformOptions { close?: boolean; done?: string }
export type Perform = (work: () => Promise<unknown>, options?: PerformOptions) => Promise<void>;
/** 목록 「회원 상태」 배지 색 — MEMBER_STATUS_LABELS 의 키 기준. */
export const memberStatusTone: Record<string, string> = {
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  rejected: 'border-red-300 bg-red-50 text-red-700',
  suspended: 'border-slate-300 bg-slate-100 text-slate-600',
  withdrawn: 'border-slate-300 bg-slate-100 text-slate-600',
  active: 'border-green-300 bg-green-50 text-green-800',
  approved: 'border-green-300 bg-green-50 text-green-800',
};
/** 목록에서 고른 회원에게 가입 승인·반려를 할 수 없는 이유. 상태를 모르면(undefined) 서버 판정에 맡긴다. */
export function registrationDecisionBlock(row: Pick<MemberRow,'registrationState'>|undefined): string | null {
  if (!row || row.registrationState === undefined) return null;
  if (row.registrationState === null) return '가입 유형·제출 정보가 없습니다. 「회원 정보 수정」에서 먼저 저장해 주시기 바랍니다.';
  if (row.registrationState === 'approved') return '이미 승인된 회원입니다. 이용 종료는 「회원 해지·복구」로 처리해 주시기 바랍니다.';
  return null;
}
