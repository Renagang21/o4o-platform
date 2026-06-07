/**
 * SupplierBulkRegisterPage — 대량 등록 (제품 유형별 분기 landing)
 *
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1
 *
 * 대량 등록은 한 파일에 여러 유형을 섞지 않는다 — 유형별로 분리한다.
 * 1차 범위: 유형별 진입 + 템플릿 안내 + 혼합 금지 안내 + 업로더 연결.
 * (유형별 전용 파서/저장은 후속: WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1)
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Upload, FileSpreadsheet } from 'lucide-react';
import { SUPPLIER_PRODUCT_TYPES, type SupplierProductTypeDef } from '../../lib/supplierProductTypes';

export default function SupplierBulkRegisterPage() {
  const [searchParams] = useSearchParams();
  const initialKey = searchParams.get('productType');
  const [selected, setSelected] = useState<SupplierProductTypeDef | null>(
    SUPPLIER_PRODUCT_TYPES.find((t) => t.key === initialKey) ?? null,
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">대량 등록</h1>
        <p className="text-sm text-slate-500 mt-1">
          제품 유형을 선택해 유형별 템플릿으로 대량 등록합니다.
        </p>
      </div>

      {/* 혼합 금지 안내 */}
      <div className="mb-5 flex gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          한 파일에 <strong>여러 제품 유형을 섞지 마세요.</strong> 유형마다 필요한 항목과 검증 기준이 다릅니다.
          비의약품·의약외품·비처방 의약품·처방의약품·미분류를 <strong>각각 별도 파일</strong>로 등록하세요.
        </div>
      </div>

      {/* 유형 선택 */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
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
                <span className="font-medium text-slate-800">{t.label} 대량 등록</span>
                {t.pharmacyTarget && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">약국 대상</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 선택 후 안내 */}
      {selected && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800 mb-2">{selected.label} — 대량 등록</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 mb-4 list-disc pl-5">
            <li>이 유형 전용 템플릿(컬럼 구성)은 준비 중입니다. 현재는 공통 CSV/엑셀 업로드를 사용합니다.</li>
            <li>업로드 파일에는 <strong>{selected.label}만</strong> 포함하세요 (다른 유형 혼합 금지).</li>
            {selected.pharmacyTarget && <li>약국 대상 의약품류는 업로드 후 <strong>운영자 검토</strong>를 거쳐 공개됩니다.</li>}
            {selected.rx && <li>처방의약품은 유통 정보화 범위로만 등록되며 일반 공급오퍼/이벤트/펀딩에 자동 연결되지 않습니다.</li>}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/supplier/csv-import"
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" /> CSV/엑셀 업로드로 이동
            </Link>
            <Link
              to="/supplier/products/import-assistant"
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              <FileSpreadsheet className="w-4 h-4" /> 상품 등록 도우미
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            유형별 전용 템플릿·검증은 후속 단계에서 제공됩니다 (WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1).
          </p>
        </div>
      )}
    </div>
  );
}
