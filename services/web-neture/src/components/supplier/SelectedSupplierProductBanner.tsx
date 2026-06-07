/**
 * SelectedSupplierProductBanner — 선택 공급자 상품 context 배너
 *
 * WO-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-PREFILL-V1
 *
 * 제품 목록 후속 작업에서 이벤트 오퍼/유통참여형 펀딩 생성 화면으로 진입할 때
 * 전달된 supplierProductId(+name/brand/price/regulatoryType) query 를 읽어
 * "선택한 공급자 상품" context 와 "원본 정보·가격 미변경" 안내를 표시한다.
 *
 * - query 가 없으면(메뉴 직접 진입) null 렌더 → crash/데드링크 없음.
 * - 원본 상품을 복제하거나 가격을 변경하지 않는다 (표시 전용).
 */
import { useSearchParams } from 'react-router-dom';

type Kind = 'event' | 'funding';

const KIND_NOTE: Record<Kind, string> = {
  event: '이벤트 오퍼는 이 상품을 기준으로 기간·가격·수량 조건만 설정합니다. 원본 상품 정보와 기본 공급가는 변경되지 않습니다.',
  funding:
    '유통참여형 펀딩은 이 상품을 기준으로 참여 조건과 목표 조건을 설정합니다. 원본 상품 정보와 기본 공급가는 변경되지 않습니다.',
};

const KIND_INTRO: Partial<Record<Kind, string>> = {
  funding:
    '유통참여형 펀딩은 공급자가 등록한 상품을 기준으로 일정 매장 수 또는 목표 수량 등 참여 조건을 설정하고, 조건 충족 시 공급을 진행하는 방식입니다.',
};

export default function SelectedSupplierProductBanner({ kind }: { kind: Kind }) {
  const [params] = useSearchParams();
  const supplierProductId = params.get('supplierProductId');
  if (!supplierProductId) return null;

  const name = params.get('name');
  const brand = params.get('brand');
  const price = params.get('price');
  const regulatoryType = params.get('regulatoryType');
  const priceLabel = price && !Number.isNaN(Number(price)) ? `${Number(price).toLocaleString()}원` : null;

  return (
    <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="text-xs font-semibold text-blue-700 mb-1">선택한 공급자 상품</div>
      <div className="text-sm text-slate-800 font-medium">{name || '(상품명 미전달)'}</div>
      <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
        {brand && <div><span className="text-slate-400">브랜드 </span>{brand}</div>}
        {priceLabel && <div><span className="text-slate-400">기본 공급가 </span>{priceLabel}</div>}
        {regulatoryType && <div><span className="text-slate-400">규제 유형 </span>{regulatoryType}</div>}
        <div><span className="text-slate-400">상품 ID </span>{supplierProductId.slice(0, 8)}…</div>
      </dl>
      <p className="mt-2 text-xs text-blue-800/90">{KIND_NOTE[kind]}</p>
      {KIND_INTRO[kind] && <p className="mt-1 text-[11px] text-slate-500">{KIND_INTRO[kind]}</p>}
    </div>
  );
}
