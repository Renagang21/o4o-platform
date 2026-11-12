import { FileText, Download } from 'lucide-react';
import { REGULATED_CATEGORY_LABELS } from '../../../lib/api';
import type { SupplierRegulatedCategory } from '../../../lib/api';
import type { useSupplierProfileCategories } from './useSupplierProfileCategories';
import {
  SUPPLIER_CATEGORY_GUIDANCE,
  SUPPLIER_SELECTABLE_CATEGORIES,
  isSupplierSelectableCategory,
} from './supplierCategoryGuidance';

const isRemovable = (row: SupplierRegulatedCategory | undefined) =>
  !row || ['not_requested', 'rejected', 'needs_update'].includes(row.status);

/** 이전 WO 에서 제출된 번호 · 증빙은 지우지 않고 보관 표시만 한다. */
function PriorSubmission({ row, onDownload }: { row: SupplierRegulatedCategory; onDownload: () => void }) {
  if (!row.registrationNumber && !row.evidenceDocument) return null;
  return (
    <p className="text-xs text-gray-400">
      제출 보관됨:
      {row.registrationNumber ? ` 번호 ${row.registrationNumber}` : ''}
      {row.registrationNumber && row.evidenceDocument ? ' ·' : ''}
      {row.evidenceDocument && (
        <button
          type="button"
          onClick={onDownload}
          className="ml-1 inline-flex items-center gap-1 font-medium text-primary-700 hover:text-primary-800"
        >
          <Download className="w-3.5 h-3.5" />
          증빙 열람
        </button>
      )}
    </p>
  );
}

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
  const rows = regulatedCategories ?? [];
  const legacyRows = rows.filter((r) => r.category !== 'general' && !isSupplierSelectableCategory(r.category));
  return (
    <>
      {/* Section A-4: 공급 예정 품목군 (WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <FileText className="w-5 h-5 text-gray-500" />
          공급 예정 품목군
        </h3>
        {/* WO-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-AND-PRODUCT-LIGHTWEIGHT-GATE-V1:
            선택-only — 번호/PDF/검토요청은 프로필 단계에서 제거. 규제 적합성은 상품 등록·운영자 확인 단계. */}
        <p className="text-xs text-gray-500 mb-5">
          법정 영업 자격이나 제품 허가가 필요한 품목을 공급할 계획이 있을 때만 선택해 주시기 바랍니다.
          해당 없으면 선택하지 않고 넘어가면 됩니다. 지금은 선택만 하며, 서류와 번호는 상품 등록 또는
          운영자 확인 단계에서 안내됩니다.
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
            {/* 2026-11-12: 법정 서류가 필요한 4개 품목군만 선택지로 둔다(supplierCategoryGuidance.ts).
                일반 상품 · 식품 · 화장품 · 기타는 선택지에서 뺐다 — 백엔드 enum · 기존 데이터는 그대로다. */}
            {SUPPLIER_SELECTABLE_CATEGORIES.map((category) => {
              const row = rows.find((c) => c.category === category);
              const selected = !!row;
              const removable = isRemovable(row);
              const busy = categoryBusy === category;
              const guidance = SUPPLIER_CATEGORY_GUIDANCE[category];
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
                    {row?.status === 'suspended' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                        운영자 보류
                      </span>
                    )}
                  </div>

                  <dl className="mt-3 space-y-1.5 pl-6 text-xs leading-relaxed">
                    <div>
                      <dt className="inline font-medium text-gray-600">공급에 필요한 자격 · </dt>
                      <dd className="inline text-gray-500">{guidance.qualification}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-gray-600">상품 등록 때 필요한 것 · </dt>
                      <dd className="inline text-gray-500">{guidance.productDocuments}</dd>
                    </div>
                  </dl>

                  {row && (
                    <div className="mt-2 space-y-2 pl-6">
                      {row.status === 'suspended' && row.reviewNote && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                          운영자 메모: {row.reviewNote}
                        </p>
                      )}
                      <PriorSubmission row={row} onDownload={() => handleDownloadCategoryEvidence(category)} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* 선택지에서 뺀 품목군을 이미 선택해 둔 공급자 — 숨기면 보류 상태 · 이전 제출 자료를 볼 수 없으므로
                「일반 상품」을 뺀 나머지는 이전 선택으로 보여 주고 해제할 수 있게 한다. 일반 상품은 서류 · 심사가 없어 숨긴다. */}
            {legacyRows.length > 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-600 mb-2">이전에 선택한 품목군</p>
                <ul className="space-y-2">
                  {legacyRows.map((row) => {
                    const removable = isRemovable(row);
                    return (
                      <li key={row.category} className="text-sm text-gray-700">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2">
                            {REGULATED_CATEGORY_LABELS[row.category]}
                            {row.status === 'suspended' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                                운영자 보류
                              </span>
                            )}
                          </span>
                          {removable && (
                            <button
                              type="button"
                              disabled={categoryBusy === row.category}
                              onClick={() => handleToggleCategory(row.category, false, true)}
                              className="text-xs font-medium text-gray-500 underline hover:text-gray-700 disabled:opacity-50"
                            >
                              선택 해제
                            </button>
                          )}
                        </div>
                        <div className="pl-0 mt-1">
                          <PriorSubmission row={row} onDownload={() => handleDownloadCategoryEvidence(row.category)} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {categoryError && <p className="text-sm text-red-500">{categoryError}</p>}
          </div>
        )}
      </div>
    </>
  );
}
