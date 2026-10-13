import { FileText, Download } from 'lucide-react';
import { REGULATED_CATEGORY_LABELS, REGULATED_CATEGORY_ORDER } from '../../../lib/api';
import type { useSupplierProfileCategories } from './useSupplierProfileCategories';

export default function SupplierCategoryFields({
  controller,
}: {
  controller: ReturnType<typeof useSupplierProfileCategories>;
}) {
  const {
    regulatedCategories,
    categoryBusy,
    categoryError,
    categoriesLoadError,
    refreshCategories,
    handleToggleCategory,
    handleDownloadCategoryEvidence,
  } = controller;
  return (
    <>
      {/* Section A-4: 공급 예정 품목군 (WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <FileText className="w-5 h-5 text-gray-500" />
          공급 예정 품목군
        </h2>
        {/* WO-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-AND-PRODUCT-LIGHTWEIGHT-GATE-V1:
            선택-only — 번호/PDF/검토요청은 프로필 단계에서 제거. 규제 적합성은 상품 등록·운영자 확인 단계. */}
        <p className="text-xs text-gray-500 mb-5">
          공급 예정 품목군은 향후 상품 등록과 운영자 확인 기준을 정하기 위한 정보입니다. 일반 상품은
          별도 서류가 필요하지 않습니다. 의약품·의료기기·건강기능식품 등 일부 품목은 실제 판매 노출
          또는 주문 가능 전 운영자 확인이 필요할 수 있습니다. 우선 공급 예정 품목군만 선택해 주세요.
        </p>

        {/* WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1:
            조회 실패 시 전부 미선택으로 보이지 않도록 선택 UI 자체를 오류 UI 로 대체한다.
            (미선택 표시 → 보류 배지 은폐 → 중복 select 유발을 모두 차단) */}
        {categoriesLoadError ? (
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-700">공급 예정 품목군을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={refreshCategories}
              className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {REGULATED_CATEGORY_ORDER.map((category) => {
              const row = (regulatedCategories ?? []).find((c) => c.category === category);
              const selected = !!row;
              const removable =
                !row || ['not_requested', 'rejected', 'needs_update'].includes(row.status);
              const busy = categoryBusy === category;
              // WO-O4O-NETURE-SUPPLIER-GENERAL-CATEGORY-NO-DOCUMENT-V1:
              // 일반 상품은 backend 면제(번호/파일/심사 없음) → 증빙 입력 UI·심사 배지 미표시, 안내만.
              const isGeneral = category === 'general';
              return (
                <div key={category} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={busy || (selected && !removable)}
                        onChange={(e) =>
                          handleToggleCategory(category, e.target.checked, removable)
                        }
                        className="w-4 h-4"
                      />
                      {REGULATED_CATEGORY_LABELS[category]}
                    </label>
                    {row && !isGeneral && row.status === 'suspended' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                        운영자 보류
                      </span>
                    )}
                    {row && isGeneral && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        서류 불필요
                      </span>
                    )}
                  </div>

                  {/* 일반 상품: backend 면제 → 증빙 입력 UI 대신 안내만 */}
                  {row && isGeneral && (
                    <p className="mt-3 pl-6 text-xs text-gray-500 leading-relaxed">
                      일반 상품은 별도 허가/신고 서류가 필요하지 않습니다. 바로 제품 등록을 진행할
                      수 있으며, 법정 인증 대상 상품은 제품 등록 단계에서 별도로 확인됩니다.
                    </p>
                  )}

                  {row && !isGeneral && (
                    <div className="mt-3 space-y-2 pl-6">
                      {/* 선택-only 안내 — 규제 적합성은 상품 등록/운영자 확인 단계 */}
                      <p className="text-xs text-gray-500 leading-relaxed">
                        이 품목군은 상품 판매 노출 또는 주문 가능 전 운영자 확인이 필요할 수
                        있습니다. 필요한 허가/신고 번호·증빙은 상품 등록 또는 운영자 확인 단계에서
                        안내됩니다.
                      </p>
                      {row.status === 'suspended' && row.reviewNote && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                          운영자 메모: {row.reviewNote}
                        </p>
                      )}
                      {/* 기존 제출 자료 보존 표시(삭제하지 않음) */}
                      {(row.registrationNumber || row.evidenceDocument) && (
                        <p className="text-xs text-gray-400">
                          제출 보관됨:
                          {row.registrationNumber ? ` 번호 ${row.registrationNumber}` : ''}
                          {row.registrationNumber && row.evidenceDocument ? ' ·' : ''}
                          {row.evidenceDocument && (
                            <button
                              type="button"
                              onClick={() => handleDownloadCategoryEvidence(category)}
                              className="ml-1 inline-flex items-center gap-1 font-medium text-primary-700 hover:text-primary-800"
                            >
                              <Download className="w-3.5 h-3.5" />
                              증빙 열람
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {categoryError && <p className="text-sm text-red-500">{categoryError}</p>}
          </div>
        )}
      </div>
    </>
  );
}
