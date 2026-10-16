import { useId } from 'react';
import { REGULATORY_TYPE_OPTIONS } from './importHelpers';
import type { useSupplierProductImport } from './useSupplierProductImport';

export default function SupplierImportSettings({
  controller,
  onCancel,
}: {
  controller: ReturnType<typeof useSupplierProductImport>;
  onCancel?: () => void;
}) {
  const formId = useId();
  const {
    navigate,
    o4oCategoryId,
    setO4oCategoryId,
    o4oRegulatoryType,
    setO4oRegulatoryType,
    flatCats,
    selectedCatIsRegulated,
    navStatus,
    navError,
    handleNavigateToCreate,
  } = controller;
  return (
    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/40 p-6 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-slate-800">3. O4O 등록 설정</h2>
      <p className="mb-5 text-sm text-slate-500">
        O4O 플랫폼 등록 조건을 설정합니다. 상품 등록 페이지에 자동 입력됩니다.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 카테고리 */}
        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-field1`} className="mb-1 block text-sm font-medium text-slate-700">카테고리</label>
          <select id={`${formId}-field1`}
            value={o4oCategoryId}
            onChange={(e) => setO4oCategoryId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">카테고리 선택 (선택사항)</option>
            {flatCats.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {'　'.repeat(cat.depth)}
                {cat.name}
                {cat.isRegulated ? ' ⚕' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 규제 유형 (조건부) */}
        {selectedCatIsRegulated && (
          <div>
            <label htmlFor={`${formId}-field3`} className="mb-1 block text-sm font-medium text-slate-700">
              규제 유형 <span className="text-red-500">*</span>
            </label>
            <select id={`${formId}-field3`}
              value={o4oRegulatoryType}
              onChange={(e) => setO4oRegulatoryType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {REGULATORY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-slate-600">제품 정보만 검토 요청으로 제출합니다. 공급가·서비스 게시·이벤트 기간은 등록 승인 후 각 업무에서 설정합니다.</p>

      {/* Actions */}
      <div className="mt-5 flex gap-3">
        <button
          onClick={handleNavigateToCreate}
          disabled={navStatus === 'copying'}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {navStatus === 'copying' ? '이미지 O4O 복사 중…' : '상품 등록 페이지로 이동 →'}
        </button>
        <button
          onClick={onCancel ?? (() => navigate('/supplier/products'))}
          disabled={navStatus === 'copying'}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          취소
        </button>
      </div>
      {navError && <p className="mt-2 text-sm text-amber-700">{navError}</p>}
    </div>
  );
}
