/**
 * SupplierProductRegisterEntryPage — 제품 등록 진입 (유형 선택 → 등록 방식)
 *
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1
 *
 * 제품 등록 1차 흐름:
 *   1) 제품 유형 선택 (비의약품/의약외품/비처방/처방/미분류)
 *   2) 등록 방식 선택 (하나씩 / 대량)
 *   → 단일: /supplier/products/new?regulatoryType=..&productType=..
 *   → 대량: /supplier/products/bulk?productType=..
 *
 * 유통참여형 펀딩·이벤트 오퍼는 제품 등록 흐름에 포함하지 않는다 (별도 메뉴).
 * 처방의약품은 등록은 가능하되 일반 공급오퍼/이벤트/펀딩 자동 연결 대상이 아님을 안내한다.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Layers, ArrowRight, AlertTriangle } from 'lucide-react';
import { SUPPLIER_PRODUCT_TYPES, type SupplierProductTypeDef } from '../../lib/supplierProductTypes';

export default function SupplierProductRegisterEntryPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SupplierProductTypeDef | null>(null);

  const goSingle = (t: SupplierProductTypeDef) => {
    const params = new URLSearchParams({ productType: t.key });
    if (t.regulatoryType) params.set('regulatoryType', t.regulatoryType);
    navigate(`/supplier/products/new?${params.toString()}`);
  };

  const goBulk = (t: SupplierProductTypeDef) => {
    navigate(`/supplier/products/bulk?productType=${t.key}`);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">제품 등록</h1>
        <p className="text-sm text-slate-500 mt-1">
          등록할 <strong>제품 유형</strong>을 먼저 선택하세요. 유형에 따라 입력 항목과 검토 절차가 달라집니다.
        </p>
      </div>

      {/* Step 1: 제품 유형 */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-slate-500 mb-2">1. 제품 유형 선택</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SUPPLIER_PRODUCT_TYPES.map((t) => {
            const active = selected?.key === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSelected(t)}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{t.label}</span>
                  {t.pharmacyTarget && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">약국 대상</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: 등록 방식 */}
      {selected && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500 mb-1">2. 등록 방식 선택</div>
          <p className="text-sm text-slate-700 mb-4">
            선택한 유형: <strong>{selected.label}</strong>
          </p>

          {selected.rx && (
            <div className="mb-4 flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                처방의약품은 <strong>O4O 유통 정보화 범위</strong>로만 등록됩니다(재고·유효기간·일련번호 관리 아님).
                일반 공급 오퍼·이벤트 오퍼·유통참여형 펀딩으로 <strong>자동 연결되지 않으며</strong>, 등록 후 운영자 검토를 거칩니다.
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => goSingle(selected)}
              className="flex items-center justify-between rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 p-4 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>
                  <span className="block font-medium text-slate-800">하나씩 등록</span>
                  <span className="block text-xs text-slate-500">단일 제품을 단계별로 입력</span>
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => goBulk(selected)}
              className="flex items-center justify-between rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 p-4 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>
                  <span className="block font-medium text-slate-800">대량 등록</span>
                  <span className="block text-xs text-slate-500">유형별 템플릿으로 여러 제품 등록</span>
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        유통참여형 펀딩·이벤트 오퍼·판매자 모집은 제품 등록이 아니라 <strong>이미 등록된 제품을 활용하는 별도 메뉴</strong>입니다.
        제품을 먼저 등록한 뒤 제품 목록에서 연결하세요.
      </p>
    </div>
  );
}
