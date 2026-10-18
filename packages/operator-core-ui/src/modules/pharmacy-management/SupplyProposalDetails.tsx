import { ContentRenderer } from '@o4o/content-editor';
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

/** Product information with fixed proposal terms, or the legacy common policy. */
export function SupplyProposalDetails({ proposal: p }: { proposal: SupplyProposal }) {
  return <details className="mt-3 min-w-[18rem] max-w-xs rounded border bg-gray-50 p-3 text-sm">
    <summary className="cursor-pointer font-medium text-primary-700">제품 · 배송조건 확인</summary>
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 whitespace-normal break-words">
      <dt>규격</dt><dd>{p.productSpecification || '미등록'}</dd>
      <dt>제조사</dt><dd>{p.productManufacturer || '미등록'}</dd>
      <dt>바코드</dt><dd>{p.productBarcode || '미등록'}</dd>
      {!p.termsSnapshot && <><dt>기본 배송비</dt><dd>{p.baseShippingFee == null ? '미설정' : formatWon(Number(p.baseShippingFee))}</dd>
      <dt>무료배송 기준</dt><dd>{p.freeShippingThreshold == null ? '기준 없음' : Number(p.freeShippingThreshold) === 0 ? '0원 이상 (항상 무료)' : `${formatWon(Number(p.freeShippingThreshold))} 이상`}</dd></>}
    </dl>
    {p.termsSnapshot ? <SupplyProposalTermsSummary terms={p.termsSnapshot} /> : <p className="mt-3 text-xs text-gray-600">배송비는 현재 공급자 공통 정책입니다. 이 제안에 고정된 개별 배송조건이 아닙니다.</p>}
    {p.productSummary && <p className="mt-3 whitespace-pre-wrap">{p.productSummary}</p>}
    {p.productDescription ? <div className="mt-3 whitespace-normal break-words"><ContentRenderer html={p.productDescription} /></div> : <p className="mt-3 text-gray-500">등록된 제품 상세 설명이 없습니다.</p>}
  </details>;
}
