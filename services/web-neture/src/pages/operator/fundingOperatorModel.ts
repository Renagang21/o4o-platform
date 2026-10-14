import type { ParticipantFilters, PaymentStatus, TrialStatus } from '../../api/trial';

export type ParticipantFilter = 'all' | 'product' | 'cash' | 'pending' | 'fulfilled';
export function fundingParticipantFilters(filter: ParticipantFilter, payment: PaymentStatus | ''): ParticipantFilters {
  return {
    ...(filter === 'product' || filter === 'cash' ? { rewardType: filter } : {}),
    ...(filter === 'pending' || filter === 'fulfilled' ? { rewardStatus: filter } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
  };
}

export const STATUS_LABELS: Record<string, string> = {
  draft: '작성 중',
  submitted: '심사 대기',
  approved: '승인됨',
  recruiting: '모집 중',
  development: '준비 중',
  outcome_confirming: '결과 확정',
  fulfilled: '이행 완료',
  closed: '종료',
};

// Operator-allowed status transitions
export const NEXT_STATUS: Partial<Record<string, { status: TrialStatus; label: string }>> = {
  recruiting: { status: 'development', label: '준비 중으로 전환' },
  development: { status: 'outcome_confirming', label: '결과 확정으로 전환' },
  outcome_confirming: { status: 'fulfilled', label: '이행 완료 처리' },
  fulfilled: { status: 'closed', label: '종료 처리' },
};

