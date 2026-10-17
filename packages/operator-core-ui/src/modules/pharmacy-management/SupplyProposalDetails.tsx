import { ContentRenderer } from '@o4o/content-editor';
import type { SupplyProposal } from './api';
import { formatWon } from './api';

/** Current product and supplier policy, not a snapshot of the conditions at approval time. */
export function SupplyProposalDetails({ proposal: p }: { proposal: SupplyProposal }) {
  return <details className="mt-3 min-w-[18rem] max-w-xs rounded border bg-gray-50 p-3 text-sm">
    <summary className="cursor-pointer font-medium text-primary-700">제품 · 배송조건 확인</summary>
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 whitespace-normal break-words">
      <dt>규격</dt><dd>{p.productSpecification || '미등록'}</dd>
      <dt>제조사</dt><dd>{p.productManufacturer || '미등록'}</dd>
      <dt>바코드</dt><dd>{p.productBarcode || '미등록'}</dd>
      <dt>기본 배송비</dt><dd>{p.baseShippingFee == null ? '미설정' : formatWon(Number(p.baseShippingFee))}</dd>
      <dt>무료배송 기준</dt><dd>{p.freeShippingThreshold != null && Number(p.freeShippingThreshold) > 0 ? `${formatWon(Number(p.freeShippingThreshold))} 이상` : '기준 없음'}</dd>
    </dl>
    <p className="mt-3 text-xs text-gray-600">배송비는 현재 공급자 공통 정책입니다. 이 제안에 고정된 개별 배송조건이 아닙니다.</p>
    {p.productSummary && <p className="mt-3 whitespace-pre-wrap">{p.productSummary}</p>}
    {p.productDescription ? <div className="mt-3 whitespace-normal break-words"><ContentRenderer html={p.productDescription} /></div> : <p className="mt-3 text-gray-500">등록된 제품 상세 설명이 없습니다.</p>}
  </details>;
}
