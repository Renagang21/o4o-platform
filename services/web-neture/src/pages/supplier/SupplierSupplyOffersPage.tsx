/**
 * SupplierSupplyOffersPage — 공급 오퍼 안내 허브
 *
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1
 *
 * 공급 오퍼(일반 공급/판매자 모집/서비스별 공급 상태)는 제품 등록과 분리된 별도 활동이다.
 * 1차 범위: 안내 허브 — 이미 등록된 제품을 활용해 공급 활동으로 연결하는 진입점.
 * (전용 오퍼 모드 선택 화면은 후속: WO-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1)
 */
import { Link } from 'react-router-dom';
import { Boxes, Users, Network, ArrowRight } from 'lucide-react';

export default function SupplierSupplyOffersPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">공급 오퍼</h1>
        <p className="text-sm text-slate-500 mt-1">
          이미 등록된 제품을 매장·서비스에 공급하는 활동입니다. 제품을 먼저 등록한 뒤 여기서 공급 방식을 연결하세요.
        </p>
      </div>

      <div className="space-y-3">
        {/* 일반 공급 오퍼 */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <Boxes className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-800">일반 공급 오퍼</h2>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            제품 등록 시 선택한 유통 정책(공개/서비스/비공개)과 서비스 대상으로 공급 오퍼가 구성됩니다.
            제품 목록에서 유통 정책·서비스 대상을 확인·수정하세요.
          </p>
          <Link
            to="/supplier/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            제품 목록으로 이동 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 서비스별 공급 상태 */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-800">서비스별 공급 상태</h2>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            각 제품이 어느 서비스(KPA Society·GlycoPharm·K-Cosmetics)에 공급/승인되었는지는 제품 목록의 서비스·승인 상태로 확인합니다.
          </p>
          <Link
            to="/supplier/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            제품 목록에서 상태 확인 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 판매자 모집 (준비 중) */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-600">판매자 모집</h2>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">준비 중</span>
          </div>
          <p className="text-sm text-slate-500">
            등록된 제품에 대해 판매자(파트너)를 모집하는 전용 흐름은 후속 단계에서 제공됩니다.
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        유통참여형 펀딩·이벤트 오퍼는 각각 별도 메뉴에서 진행합니다. 모두 <strong>이미 등록된 제품</strong>을 활용하며, 제품 등록 절차에 포함되지 않습니다.
      </p>
    </div>
  );
}
