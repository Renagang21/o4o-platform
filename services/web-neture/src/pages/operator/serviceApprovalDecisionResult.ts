export type ServiceApprovalDecision = 'approve' | 'reject';

interface DecisionResponse {
  success: boolean;
  error?: string;
  data?: { approved?: number; rejected?: number; failed: number };
}

export interface ServiceApprovalDecisionOutcome {
  kind: 'success' | 'partial' | 'failure';
  message: string;
}

/** 일괄 API의 success:true는 모든 항목의 성공을 뜻하지 않는다. */
export function getServiceApprovalDecisionOutcome(
  decision: ServiceApprovalDecision,
  result: DecisionResponse,
  isBatch: boolean,
): ServiceApprovalDecisionOutcome {
  const label = decision === 'approve' ? '승인' : '거절';
  if (!result.success) {
    return { kind: 'failure', message: `${label} 처리하지 못했습니다. 입력 내용을 유지했으니 다시 시도해 주세요.` };
  }
  if (isBatch && result.data && result.data.failed > 0) {
    const completed = (decision === 'approve' ? result.data.approved : result.data.rejected) ?? 0;
    if (completed === 0) {
      return { kind: 'failure', message: `${result.data.failed}건을 ${label} 처리하지 못했습니다. 선택과 입력을 유지했으니 다시 시도해 주세요.` };
    }
    return { kind: 'partial', message: `${label} ${completed}건 완료, ${result.data.failed}건 실패했습니다. 목록에서 남은 승인대기 상품을 다시 선택해 주세요.` };
  }
  return { kind: 'success', message: `${label} 처리가 완료되었습니다.` };
}
