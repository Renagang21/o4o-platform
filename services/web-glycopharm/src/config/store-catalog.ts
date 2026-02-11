/**
 * Store Catalog Config
 *
 * WO-STORE-MAIN-PAGE-PHASE1-V1 + PHASE2-A
 * Product Policy 설정 및 승인 상태 표시 설정
 */

import type { ProductPolicy, ProductPolicyConfig, ApprovalStatus } from '@/types/store-main';

/** Product Policy 설정 맵 */
export const PRODUCT_POLICY_CONFIG: Record<ProductPolicy, ProductPolicyConfig> = {
  OPEN: {
    policy: 'OPEN',
    label: '자유 판매',
    description: '즉시 판매 가능한 상품',
    badgeColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  REQUEST_REQUIRED: {
    policy: 'REQUEST_REQUIRED',
    label: '신청 필요',
    description: '운영자 승인 후 판매 가능',
    badgeColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  DISPLAY_ONLY: {
    policy: 'DISPLAY_ONLY',
    label: '진열 전용',
    description: '매장 진열만 가능 (직접 판매 불가)',
    badgeColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  LIMITED: {
    policy: 'LIMITED',
    label: '한정 판매',
    description: '수량 또는 기간 한정 상품',
    badgeColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
};

/** Phase 2-A: 승인 상태 표시 설정 */
export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, {
  label: string;
  badgeColor: string;
  textColor: string;
}> = {
  none: { label: '', badgeColor: '', textColor: '' },
  pending: { label: '승인 대기', badgeColor: 'bg-amber-50', textColor: 'text-amber-600' },
  approved: { label: '승인 완료', badgeColor: 'bg-green-50', textColor: 'text-green-600' },
  rejected: { label: '반려', badgeColor: 'bg-red-50', textColor: 'text-red-600' },
};
