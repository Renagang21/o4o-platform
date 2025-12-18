/**
 * Market Trial Types
 *
 * Phase L-1: Market Trial Flow (보상 선택 포함)
 *
 * @package Phase L - Market Trial
 */

/**
 * 참여 가능 역할
 */
export type TrialEligibleRole = 'partner' | 'seller';

/**
 * 보상 유형
 */
export type RewardType = 'cash' | 'product';

/**
 * Trial 상태
 */
export type TrialStatus = 'open' | 'closed';

/**
 * 보상 상태
 */
export type RewardStatus = 'pending' | 'fulfilled';

/**
 * Market Trial
 *
 * Supplier가 생성하는 시장 검증 실험
 */
export interface MarketTrial {
  id: string;
  title: string;
  description: string;
  supplierId: string;
  supplierName?: string;
  eligibleRoles: TrialEligibleRole[];
  rewardOptions: RewardType[];
  /** 현금 보상 금액 (선택 시) */
  cashRewardAmount?: number;
  /** 제품 보상 설명 (선택 시) */
  productRewardDescription?: string;
  status: TrialStatus;
  /** 모집 인원 제한 (없으면 무제한) */
  maxParticipants?: number;
  /** 현재 참여자 수 */
  currentParticipants?: number;
  /** 마감일 */
  deadline?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Trial 참여 기록
 *
 * Partner/Seller가 Trial에 참여한 기록
 */
export interface TrialParticipation {
  id: string;
  trialId: string;
  participantId: string;
  /** 참여자 이름 */
  participantName?: string;
  role: TrialEligibleRole;
  /** 선택한 보상 유형 */
  rewardType: RewardType;
  /** 보상 상태 (pending = 약속 상태, fulfilled = 지급 완료) */
  rewardStatus: RewardStatus;
  joinedAt: string;
}

/**
 * Trial 참여 요청 DTO
 */
export interface JoinTrialRequest {
  rewardType: RewardType;
}

/**
 * Trial 목록 필터
 */
export interface TrialListFilter {
  status?: TrialStatus;
  role?: TrialEligibleRole;
}

/**
 * 보상 옵션 라벨
 */
export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  cash: '현금 정산',
  product: '제품 제공',
};

/**
 * Trial 상태 라벨
 */
export const TRIAL_STATUS_LABELS: Record<TrialStatus, string> = {
  open: '모집 중',
  closed: '모집 마감',
};

/**
 * 역할 라벨
 */
export const ROLE_LABELS: Record<TrialEligibleRole, string> = {
  partner: '파트너',
  seller: '셀러',
};
