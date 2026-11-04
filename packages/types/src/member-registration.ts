/** Public signup classifications, never authorization roles. */
export const MEMBER_REGISTRATION_TYPES = {
  pharmacist: '약사',
  pharmacy_owner: '약국경영자',
  supplier: '공급자',
  partner: '파트너',
  other: '기타',
} as const;
export type MemberRegistrationType = keyof typeof MEMBER_REGISTRATION_TYPES;
export const MEMBER_REGISTRATION_KEY = 'o4oMembershipRegistrationV1';
export const MEMBER_REGISTRATION_FIELDS = {
  licenseNumber: { label: '약사 면허번호', max: 30 },
  businessName: { label: '사업장명', max: 255 },
  businessNumber: { label: '사업자등록번호', max: 13 },
  representativeName: { label: '대표자명', max: 100 },
  businessType: { label: '업태', max: 100 },
  businessItem: { label: '종목', max: 100 },
  businessEntityType: { label: '사업자 구분', max: 30 },
  businessStartDate: { label: '개업일', max: 10 },
  zipCode: { label: '우편번호', max: 10 },
  address: { label: '사업장 주소', max: 500 },
  addressDetail: { label: '상세 주소', max: 500 },
  businessPhone: { label: '사업장 전화번호', max: 50 },
  contactName: { label: '담당자 이름', max: 100 },
  contactPhone: { label: '담당자 전화번호', max: 50 },
  contactEmail: { label: '연락 이메일', max: 255 },
  managerEmail: { label: '담당자 이메일', max: 255 },
  taxInvoiceEmail: { label: '세금계산서 이메일', max: 255 },
  businessRegistrationDocumentId: { label: '사업자등록증', max: 36 },
} as const;
export type MemberRegistrationField = keyof typeof MEMBER_REGISTRATION_FIELDS;
export type MemberRegistrationFields = Partial<
  Record<MemberRegistrationField, string>
>;
export interface MemberRegistrationInput {
  type: MemberRegistrationType;
  fields: MemberRegistrationFields;
}
export interface MemberRegistration extends MemberRegistrationInput {
  /** Server-owned application identity binds published-policy evidence to this submission. */
  requestId?: string;
  /** Read-only concurrency token for the canonical qualification, not a signup input. */
  qualificationVersion?: string | null;
  businessVersion?: string | null;
  businessEditable?: boolean;
  state: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
export function registrationFieldKeys(
  type: MemberRegistrationType,
): MemberRegistrationField[] {
  const business = Object.keys(MEMBER_REGISTRATION_FIELDS).filter(
    (k) =>
      k !== 'licenseNumber' && (k !== 'managerEmail' || type === 'supplier'),
  ) as MemberRegistrationField[];
  return type === 'pharmacist'
    ? ['licenseNumber']
    : type === 'pharmacy_owner'
      ? ['licenseNumber', ...business]
      : type === 'supplier' || type === 'partner'
        ? business
        : [];
}
export const MEMBER_STATUS_LABELS: Record<string, string> = {
  pending: '가입 대기',
  active: '정상',
  approved: '정상',
  rejected: '반려',
  suspended: '해지',
  withdrawn: '해지',
};
