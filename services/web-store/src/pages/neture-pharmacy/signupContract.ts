/**
 * Neture 약국 가입 · 승인 화면 계약 — docs/baseline/O4O-NETURE-PHARMACY-SIGNUP-APPROVAL-CONTRACT-V1.md
 *
 * 상태별 화면 모델 · 진행 단계 · 신청 항목 규칙 · 승인 후 이용 안내를 한 곳에 둔다.
 * 판정(이용 가능 여부 · 상태 전이)은 서버가 한다. 여기 값은 표시 계약이다.
 */
import type { PharmacyMembershipStatus } from '../../api/neturePharmacy';

export interface StatusView {
  label: string;
  /** 현재 상태가 무엇을 뜻하는지 */
  summary: string;
  /** 사용자가 다음에 할 일 */
  next: string;
  tone: 'info' | 'success' | 'warn' | 'error' | 'muted';
}

/** 기본 가입 상태별 화면 모델 (계약 §3-1). */
export const BASIC_MEMBERSHIP_VIEW: Record<PharmacyMembershipStatus, StatusView> = {
  pending: {
    label: '승인 대기',
    summary: 'Neture 운영자가 사업자등록번호와 약사 면허번호를 확인하고 있습니다.',
    next: '승인되면 이 화면과 내 매장에서 바로 확인할 수 있습니다. 별도로 하실 일은 없습니다.',
    tone: 'info',
  },
  active: {
    label: '이용 중',
    summary: '기본 가입이 승인되었습니다. 내 매장 기본 기능을 이용할 수 있습니다.',
    next: '공급 상품을 주문하려면 세미프랜차이즈 가입을 따로 신청하세요. 세미프랜차이즈는 별도로 승인됩니다.',
    tone: 'success',
  },
  rejected: {
    label: '반려',
    summary: '신청이 반려되었습니다.',
    next: '아래 반려 사유를 확인하고 정보를 고친 뒤 다시 신청해 주세요.',
    tone: 'error',
  },
  suspended: {
    label: '정지',
    summary: '이용이 정지되었습니다. 정지 중에는 내 매장과 세미프랜차이즈 공급 상품을 이용할 수 없습니다.',
    next: '정지 사유를 확인하고 Neture 운영자에게 문의해 주세요. 운영자가 재개하면 다시 이용할 수 있습니다.',
    tone: 'warn',
  },
  terminated: {
    label: '종료',
    summary: '이용이 종료되었습니다.',
    next: '다시 이용하려면 아래에서 새로 신청해 주세요. 같은 약국으로 다시 심사합니다.',
    tone: 'muted',
  },
};

/** 세미프랜차이즈 가입 상태별 안내 (계약 §3-2). 승인 주체는 그 세미프랜차이즈 담당 운영자. */
export const SEMI_FRANCHISE_STATUS_HELP: Record<PharmacyMembershipStatus, string> = {
  pending: '담당 운영자가 확인하고 있습니다.',
  active: '공급 상품 · 이벤트 · 취급매장 모집 · 커뮤니티를 이용할 수 있습니다.',
  rejected: '반려되었습니다. 사유를 확인한 뒤 다시 신청할 수 있습니다.',
  suspended: '정지되었습니다. 이 세미프랜차이즈의 공급 상품을 주문할 수 없습니다.',
  terminated: '가입이 종료되었습니다. 다시 신청할 수 있습니다.',
};

/** 약국 본인이 같은 원장으로 다시 신청할 수 있는 상태 — 서버 `canReapply` 와 같다. */
export const canReapplyBasic = (status: PharmacyMembershipStatus | null | undefined) =>
  !status || status === 'rejected' || status === 'terminated';

/** 진행 단계(계약 §3-1). 반려 · 정지 · 종료는 단계가 아니라 상태 카드로 보여준다. */
export const SIGNUP_STEPS = ['가입 신청', '운영자 확인', '이용 시작'] as const;

/** 현재 상태에서 완료된 단계 수(0..3). 단계 흐름 밖 상태는 null. */
export function completedSteps(status: PharmacyMembershipStatus | null | undefined): number | null {
  if (!status) return 0;
  if (status === 'pending') return 1;
  if (status === 'active') return 3;
  return null;
}

/**
 * 미확정 U1 — 기본 승인 전 세미프랜차이즈 신청 허용 여부는 사업 판단 대기.
 * 현재 구현(서버 게이트)의 동작을 안내할 뿐 규칙으로 선언하지 않는다. 결정되면 서버 게이트와 함께 바꾼다.
 */
export const SEMI_FRANCHISE_TIMING_NOTICE = '현재는 기본 가입이 승인된 뒤 내 매장에서 세미프랜차이즈를 신청할 수 있습니다.';

/** 승인 후 이용 안내 (계약 §5). */
export const AFTER_APPROVAL_GUIDE: Array<{ condition: string; features: string }> = [
  { condition: '기본 가입 승인', features: '내 매장 기본 기능(매장 정보 · 콘텐츠 자료함 · QR · 사이니지 · 태블릿) · 세미프랜차이즈 가입 신청' },
  { condition: '+ pharmacy 세미프랜차이즈 승인', features: '기본 공급 상품 주문' },
  { condition: '+ 다른 세미프랜차이즈 승인', features: '그 세미프랜차이즈의 공급 제안 · 이벤트 · 취급매장 모집 · 커뮤니티' },
];

/** 사업자등록번호 — 서버 `normalizeBusinessNumber` 와 같은 규칙(숫자 10자리, 하이픈 허용). */
export function normalizeBusinessNumber(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length === 10 ? digits : null;
}

/**
 * 입력 중 표시용 000-00-00000. 숫자를 버리지 않는다 — 10자리를 넘으면 숫자만 그대로 두고
 * `validateSignup` 이 거부한다(잘라서 다른 번호로 제출하지 않는다).
 */
export function formatBusinessNumber(raw: string): string {
  const d = raw.replace(/[^0-9]/g, '');
  if (d.length > 10) return d;
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export interface SignupFieldErrors {
  pharmacyName?: string;
  businessNumber?: string;
  pharmacistLicenseNumber?: string;
  address?: string;
  phone?: string;
}

/** 신청 항목 규칙 (계약 §4-1 필수 · §4-2 추가 정보). 서버 검사와 같은 한도. */
export function validateSignup(input: {
  pharmacyName: string;
  businessNumber: string;
  pharmacistLicenseNumber: string;
  address?: string;
  phone?: string;
}): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const name = input.pharmacyName.trim();
  const license = input.pharmacistLicenseNumber.trim();
  if (!name) errors.pharmacyName = '약국 이름을 입력해 주세요.';
  else if (name.length > 255) errors.pharmacyName = '약국 이름은 255자 이내로 입력해 주세요.';
  if (!normalizeBusinessNumber(input.businessNumber)) errors.businessNumber = '사업자등록번호 10자리를 입력해 주세요.';
  if (!license) errors.pharmacistLicenseNumber = '약사 면허번호를 입력해 주세요.';
  else if (license.length > 30) errors.pharmacistLicenseNumber = '약사 면허번호는 30자 이내로 입력해 주세요.';
  if ((input.address ?? '').trim().length > 500) errors.address = '주소는 500자 이내로 입력해 주세요.';
  if ((input.phone ?? '').trim().length > 50) errors.phone = '전화번호는 50자 이내로 입력해 주세요.';
  return errors;
}
