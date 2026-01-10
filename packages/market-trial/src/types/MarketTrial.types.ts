/**
 * Market Trial Common Types
 *
 * WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 기준 공통 타입 계약
 * 모든 서비스(Backend, API, Frontend)에서 이 타입을 사용해야 합니다.
 *
 * @package market-trial
 */

import { TrialStatus } from '../entities/MarketTrial.entity.js';

/**
 * Trial Outcome Snapshot - 결과 약속 정보
 *
 * Trial 생성 시 결과로 제공할 보상 정보를 스냅샷으로 저장합니다.
 * productId FK 대신 사용하여 Trial-상품 강결합을 제거합니다.
 */
export interface TrialOutcomeSnapshot {
  /** 보상 유형: 상품 또는 현금 */
  expectedType: 'product' | 'cash';
  /** 보상 설명 */
  description: string;
  /** 수량 (상품인 경우) */
  quantity?: number;
  /** 추가 메모 */
  note?: string;
}

/**
 * Market Trial DTO
 *
 * API 응답 및 Frontend에서 사용하는 공통 데이터 구조
 */
export interface MarketTrialDTO {
  id: string;
  title: string;
  description: string;
  status: TrialStatus;

  /** 공급자(Organizer) ID */
  organizerId: string;
  /** 공급자 이름 */
  organizerName?: string;

  /** 운영자 승인자 ID */
  approvedBy?: string;

  /** 결과 약속 정보 */
  outcomeSnapshot?: TrialOutcomeSnapshot;

  /** @deprecated productId FK - outcomeSnapshot 사용 권장 */
  productId?: string;

  /** Trial 시작일 */
  startDate?: string;
  /** Trial 종료일 */
  endDate?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Trial 참여 가능 상태 목록
 */
export const JOINABLE_STATUSES: TrialStatus[] = [TrialStatus.RECRUITING];

/**
 * Trial 종료 상태 목록
 */
export const CLOSED_STATUSES: TrialStatus[] = [
  TrialStatus.FULFILLED,
  TrialStatus.CLOSED,
];

/**
 * Trial 상태 라벨 (한국어)
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

// Re-export TrialStatus for convenience
export { TrialStatus };
