import { useId } from 'react';
import { O4O_SERVICES, REGULATORY_TYPE_OPTIONS } from './importHelpers';
import type { useSupplierProductImport } from './useSupplierProductImport';

export default function SupplierImportSettings({
  controller,
}: {
  controller: ReturnType<typeof useSupplierProductImport>;
}) {
  const formId = useId();
  const {
    navigate,
    o4oCategoryId,
    setO4oCategoryId,
    o4oPriceGeneral,
    setO4oPriceGeneral,
    o4oIsPublic,
    setO4oIsPublic,
    o4oServiceKeys,
    setO4oServiceKeys,
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

        {/* 공급가 */}
        <div>
          <label htmlFor={`${formId}-field2`} className="mb-1 block text-sm font-medium text-slate-700">
            공급가 (원) <span className="text-red-500">*</span>
          </label>
          <input id={`${formId}-field2`}
            type="number"
            value={o4oPriceGeneral}
            onChange={(e) => setO4oPriceGeneral(e.target.value)}
            placeholder="0"
            min="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-0.5 text-xs text-slate-400">공급자가 결정하는 B2B 공급가</p>
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

      {/* 유통 설정 */}
      <div className="mt-5">
        <p className="mb-2 block text-sm font-medium text-slate-700">유통 설정</p>
        <label className="mb-3 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={o4oIsPublic}
            onChange={(e) => setO4oIsPublic(e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm text-slate-700">공개(PUBLIC) — 모든 판매처에 노출</span>
        </label>

        <p className="mb-2 text-xs text-slate-500">서비스별 공급 (복수 선택 가능)</p>
        <div className="flex flex-wrap gap-4">
          {O4O_SERVICES.map((svc) => (
            <label key={svc.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={o4oServiceKeys.includes(svc.key)}
                onChange={(e) => {
                  setO4oServiceKeys((prev) =>
                    e.target.checked ? [...prev, svc.key] : prev.filter((k) => k !== svc.key),
                  );
                }}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-sm text-slate-700">{svc.name}</span>
            </label>
          ))}
        </div>
        {!o4oIsPublic && o4oServiceKeys.length === 0 && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            서비스별 공급이 설정되지 않아 승인요청 대상이 아닙니다. 저장 후 상품 편집에서 추가할 수
            있습니다.
          </p>
        )}
      </div>

      {/* 설정 요약 */}
      <div className="mt-4 rounded-lg bg-white border border-slate-200 px-4 py-3 text-xs text-slate-500">
        <span className="font-medium text-slate-700">설정 요약: </span>
        {o4oCategoryId ? flatCats.find((c) => c.id === o4oCategoryId)?.name : '카테고리 미선택'} /
        공급가 {o4oPriceGeneral ? `${Number(o4oPriceGeneral).toLocaleString()}원` : '미입력'} /
        {o4oIsPublic ? ' PUBLIC' : ''}
        {o4oServiceKeys.length > 0 ? ` ${o4oServiceKeys.join(', ')}` : ' PRIVATE'}
      </div>

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
          onClick={() => navigate('/supplier/products')}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          취소
        </button>
      </div>
      {navError && <p className="mt-2 text-sm text-amber-700">{navError}</p>}
    </div>
  );
}
