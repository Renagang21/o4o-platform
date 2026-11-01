export type MemberTask = 'all' | 'qualifications' | 'pharmacies' | 'corrections';
export interface MemberPermissions { qualifications: boolean; pharmacies: boolean; applications?: boolean; edit: boolean }
export interface MemberRow { userId: string; name: string | null; email: string; accountStatus: string; qualificationStatus: string; pharmacyStatus: string | null }
export interface MemberProfile { userId: string; name: string | null; nickname: string | null; email: string; phone: string | null; accountStatus: string; emailVerified: boolean; joinedAt: string; version: string }
export interface Qualification { licenseNumber: string | null; status: string; reason: string | null; approvedAt: string | null; reviewedBy: string | null; version: string }
export interface MemberPharmacy {
  id: string; organizationId: string; name: string; businessNumber: string; licenseNumber: string; status: string; reason: string | null;
  appliedAt: string; decidedAt: string | null; decidedBy: string | null; address: string | null; phone: string | null;
  representativeName: string | null; businessType: string | null; businessCategory: string | null; documentId: string | null;
  contactName: string | null; managerPhone: string | null; contactEmail: string | null; taxInvoiceEmail: string | null;
}
export interface MemberDetail {
  member: MemberProfile; qualification: Qualification | null; legacyLicense: string | null; legacyBusiness?: Record<string, string> | null; pharmacies: MemberPharmacy[];
  history: Array<{ action: string; createdAt: string; actorId: string | null; reason: string | null }>; permissions: MemberPermissions;
}
export const qualificationLabels: Record<string, string> = { unrequested: '신청 없음', pending: '검토 대기', approved: '승인', rejected: '반려', revoked: '승인 취소' };
export const pharmacyLabels: Record<string, string> = { pending: '심사 대기', active: '승인', suspended: '정지', rejected: '반려', terminated: '종료' };
export const pharmacyActions: Record<string, Array<{ action: string; label: string }>> = {
  pending: [{ action: 'approve', label: '약국 승인' }, { action: 'reject', label: '약국 반려' }],
  active: [{ action: 'suspend', label: '약국 정지' }, { action: 'terminate', label: '약국 종료' }],
  suspended: [{ action: 'reactivate', label: '약국 재개' }, { action: 'terminate', label: '약국 종료' }],
};
export function canActivatePharmacy(detail: MemberDetail, pharmacy: MemberPharmacy) {
  return detail.member.emailVerified && ['active', 'approved'].includes(detail.member.accountStatus) &&
    detail.qualification?.status === 'approved' && detail.qualification.licenseNumber?.trim() === pharmacy.licenseNumber.trim();
}
export function memberError(error: unknown) {
  const response = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof response === 'string' ? response : '처리하지 못했습니다. 권한과 최신 정보를 다시 확인해 주세요.';
}
