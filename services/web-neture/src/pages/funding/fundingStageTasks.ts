import type { TrialStatus } from '../../api/trial';

/** Existing manual stages; guidance does not introduce transition prerequisites. */
export const fundingStageTasks: Record<TrialStatus, { operator: string; creator: string }> = {
  draft: { operator: '개설자가 보완 후 신청하면 심사합니다.', creator: '개설 내용을 작성·보완하고 심사를 신청하세요.' },
  submitted: { operator: '개설 내용과 반려 사유를 검토합니다. 승인 후 전용 포럼 준비 상태를 확인하세요.', creator: '심사 결과를 기다리세요. 보완 요청이 있으면 내용을 수정해 다시 신청하세요.' },
  recruiting: { operator: '참여 명단과 오프라인 입금 기록을 확인하고 필요한 조건의 CSV를 개설자에게 공유하세요.', creator: '참여 신청자를 확인하고 포럼 회원을 수동 승인하세요. 입금 상태는 현황을 새로고침해 확인하세요.' },
  development: { operator: '개설자와 진행 상황을 확인하고 참여·입금 현황을 점검하세요.', creator: '전용 포럼에서 진행 상황과 일정을 안내하고 결과 확정 준비를 진행하세요.' },
  outcome_confirming: { operator: '참여자별 이행 기록을 확인·처리하고 전체 이행 현황을 점검하세요.', creator: '포럼에서 결과와 참여 조건 처리 내용을 안내하고 운영자와 이행 현황을 확인하세요.' },
  fulfilled: { operator: '전체 이행 기록과 남은 문의를 확인한 뒤 종료 여부를 검토하세요.', creator: '최종 결과를 안내하고 운영자와 남은 문의·기록을 확인한 뒤 종료 여부를 검토하세요.' },
  closed: { operator: '종료된 펀딩의 참여·입금·이행 기록과 문의를 확인하세요.', creator: '종료된 펀딩의 결과와 참여 현황을 확인하세요.' },
};
