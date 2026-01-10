/**
 * Market Trial Types
 *
 * Phase L-1: Market Trial Flow (보상 선택 포함)
 * WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 기준 통합
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
 * Trial 상태 (Unified Enum)
 * WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 기준 단일화된 상태 모델
 */
export enum TrialStatus {
  DRAFT = 'draft',                         // 초안 - 공급자가 작성 중
  SUBMITTED = 'submitted',                 // 제출됨 - 운영자 심사 대기
  APPROVED = 'approved',                   // 승인됨 - 모집 시작 전
  RECRUITING = 'recruiting',               // 모집 중 - 참여자 모집 진행
  DEVELOPMENT = 'development',             // 개발/준비 중 - 모집 완료 후 상품 준비
  OUTCOME_CONFIRMING = 'outcome_confirming', // 결과 확정 중 - 참여자 Decision 수집
  FULFILLED = 'fulfilled',                 // 이행 완료 - Trial 성공 종료
  CLOSED = 'closed',                       // 종료 - 일반 종료 (실패/취소 포함)
}

/** Trial 참여 가능 상태 목록 */
export const JOINABLE_STATUSES: TrialStatus[] = [TrialStatus.RECRUITING];

/** Trial 종료 상태 목록 */
export const CLOSED_STATUSES: TrialStatus[] = [TrialStatus.FULFILLED, TrialStatus.CLOSED];

/**
 * 보상 상태
 */
export type RewardStatus = 'pending' | 'fulfilled';

/**
 * Trial Outcome Snapshot - 결과 약속 정보
 */
export interface TrialOutcomeSnapshot {
  expectedType: 'product' | 'cash';
  description: string;
  quantity?: number;
  note?: string;
}

/**
 * Market Trial
 *
 * Supplier가 생성하는 시장 검증 실험
 * WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 기준 공통 타입 계약
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
  /** 제품 보상 설명 (선택 시) @deprecated outcomeSnapshot 사용 권장 */
  productRewardDescription?: string;
  status: TrialStatus;
  /** Trial 결과 약속 정보 */
  outcomeSnapshot?: TrialOutcomeSnapshot;
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
  [TrialStatus.DRAFT]: '작성 중',
  [TrialStatus.SUBMITTED]: '심사 대기',
  [TrialStatus.APPROVED]: '승인됨',
  [TrialStatus.RECRUITING]: '모집 중',
  [TrialStatus.DEVELOPMENT]: '준비 중',
  [TrialStatus.OUTCOME_CONFIRMING]: '결과 확정 중',
  [TrialStatus.FULFILLED]: '이행 완료',
  [TrialStatus.CLOSED]: '종료',
};

/**
 * 역할 라벨
 */
export const ROLE_LABELS: Record<TrialEligibleRole, string> = {
  partner: '파트너',
  seller: '셀러',
};
