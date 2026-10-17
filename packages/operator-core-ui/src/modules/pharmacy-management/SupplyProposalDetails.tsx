import type { SupplyProposal, SupplyProposalTerms } from './api';
import { formatDateTime, formatWon } from './api';

export function SupplyProposalTermsSummary({ terms }: { terms?: SupplyProposalTerms | null }) {
  return <div className="mt-1 space-y-0.5 text-xs text-gray-600">
    {terms ? <>
      <div>배송비 {formatWon(terms.baseShippingFee)}</div>
      <div>{terms.freeShippingThreshold === null ? '무료배송 기준 없음' : `${formatWon(terms.freeShippingThreshold)} 이상 무료배송`}</div>
      <div>최소 주문 {formatWon(terms.minOrderAmount)} · 협업체별 고정 조건</div>
    </> : <div>기존 제안 · 공급자 공통 배송정책 적용</div>}
  </div>;
}

export function SupplyProposalHistory({ proposal: p }: { proposal: SupplyProposal }) {
  const legacyEnd = !!p.endedAt && !p.endedBy && !p.termsSnapshot;
  return <div className="mt-1 space-y-0.5 text-xs text-gray-500">
    {p.decidedAt && <div>{legacyEnd ? '이전 처리 기록 (승인·종료 구분 불가)' : '승인·반려 결정'}: {p.decidedByName || '담당 운영자'} · {formatDateTime(p.decidedAt)}</div>}
    {p.endedAt && <div>종료: {p.endedByName || (p.endedBy ? '담당자' : '기록 없음')} · {formatDateTime(p.endedAt)}</div>}
    {p.endReason && <div>종료 사유: {p.endReason}</div>}
  </div>;
}
