import type { KpaMemberForEdit } from './KpaEditUserModal';

/** KPA 전용 편집 초안. API 읽기 alias는 여기서만 해석하고 쓰기는 canonical key를 사용한다. */
export function createKpaMemberDraft(member: KpaMemberForEdit) {
  const business = member.business_info;
  return {
    name: member.user?.name || '',
    nickname: member.user?.nickname || '',
    membership_type: member.membership_type || 'pharmacist',
    activity_type: member.activity_type || '',
    license_number: member.license_number || '',
    pharmacy_name: member.pharmacy_name || '',
    pharmacy_address: member.pharmacy_address || '',
    contactName: business?.contactName || '',
    zipCode: business?.zipCode || '',
    address1: business?.address || '',
    address2: business?.address2 || '',
    business_number: business?.businessNumber || '',
    pharmacy_phone: business?.pharmacy_phone || '',
    ownerPhone: business?.ownerPhone || '',
    ceoName: business?.ceoName || business?.representativeName || '',
    taxInvoiceEmail: business?.taxInvoiceEmail || business?.taxEmail || '',
    status: member.status,
  };
}

export type KpaMemberDraft = ReturnType<typeof createKpaMemberDraft>;
export type KpaMemberInfoPatch = Partial<Omit<KpaMemberDraft, 'status'>>;

export const KPA_ACTIVITY_LABELS: Record<string, string> = {
  pharmacy_owner: '약국 개설자', pharmacy_employee: '약국 근무 약사',
  hospital: '병원 약사', manufacturer: '제조업', importer: '수입업',
  wholesaler: '도매업', other_industry: '산업체', government: '공무원',
  school: '학교', other: '기타', inactive: '비활동',
};

export function buildKpaMemberSavePlan(
  baseline: KpaMemberDraft, draft: KpaMemberDraft, canChangeMembershipType: boolean,
) {
  const info: KpaMemberInfoPatch = {};
  // 이 필드들은 빈 문자열로 기존 값을 해제할 수 있다.
  const clearable = ['name', 'nickname', 'license_number', 'pharmacy_name', 'contactName'] as const;
  for (const key of clearable) {
    if (draft[key].trim() !== baseline[key].trim()) info[key] = draft[key].trim();
  }
  // 기존 화면의 빈 입력 보존 정책. 연락처/주소 등의 삭제 정책을 새로 만들지 않는다.
  const preserveEmpty = ['pharmacy_address', 'pharmacy_phone', 'ownerPhone', 'ceoName', 'taxInvoiceEmail'] as const;
  for (const key of preserveEmpty) {
    const value = draft[key].trim();
    if (value && value !== baseline[key].trim()) info[key] = value;
  }
  if (canChangeMembershipType && draft.membership_type !== baseline.membership_type) {
    info.membership_type = draft.membership_type;
  }
  if (draft.activity_type !== baseline.activity_type) info.activity_type = draft.activity_type;
  // 사업자번호는 기존 API와 같이 raw 값을 보낸다.
  if (draft.business_number !== baseline.business_number) info.business_number = draft.business_number;
  const addressKeys = ['zipCode', 'address1', 'address2'] as const;
  if (draft.address1.trim() && addressKeys.some(key => draft[key].trim() !== baseline[key].trim())) {
    for (const key of addressKeys) info[key] = draft[key].trim();
  }
  return { info, status: draft.status !== baseline.status ? draft.status : undefined };
}

/** 현재 info API의 길이/enum 제한만 미리 검사한다. 최종 권한·내용 검증은 서버가 담당한다. */
export function validateKpaMemberInfo(info: KpaMemberInfoPatch): string | undefined {
  const limits = {
    nickname: [50, '닉네임'], business_number: [50, '사업자등록번호'],
    pharmacy_phone: [50, '약국 전화번호'], contactName: [50, '담당자명'],
    zipCode: [10, '우편번호'], address1: [200, '기본 주소'], address2: [100, '상세 주소'],
    ownerPhone: [50, '개설자 연락처'], ceoName: [50, '대표자명'], taxInvoiceEmail: [254, '세금계산서 이메일'],
  } as const;
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const [max, label] = limits[key];
    if (Array.from(info[key] ?? '').length > max) return `${label}은(는) ${max}자 이내로 입력해 주세요.`;
  }
  if (info.activity_type !== undefined && !Object.prototype.hasOwnProperty.call(KPA_ACTIVITY_LABELS, info.activity_type)) {
    return '활동 유형을 선택해 주세요.';
  }
  return undefined;
}
