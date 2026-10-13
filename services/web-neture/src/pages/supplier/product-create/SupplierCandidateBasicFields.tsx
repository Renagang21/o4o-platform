import type { useSupplierCandidateForm } from './useSupplierCandidateForm';

export default function SupplierCandidateBasicFields({
  controller,
}: {
  controller: ReturnType<typeof useSupplierCandidateForm>;
}) {
  const {
    form,
    setForm,
    searching,
    master,
    setMaster,
    barcodeChecked,
    setBarcodeChecked,
    categoriesLoading,
    categoriesError,
    setCategoriesReloadKey,
    brands,
    flatCats,
    isRegulated,
    searchBarcode,
    handleChange,
    goToFromMaster,
  } = controller;
  return (
    <>
      {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1: 정보-우선 안내 */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        먼저 <strong>상품 정보</strong>를 등록합니다. 공급 방식(전체 공개 / 서비스 공급)은 저장 후
        상품 상세에서 별도로 설정할 수 있으며, 공급 방식이 설정되기 전까지 이 상품은{' '}
        <strong>HUB에 노출되지 않습니다</strong>.
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-800">기본 정보</h3>

        {/* Packaging Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            포장 상품명 <span className="text-xs text-slate-400">(선택)</span>
          </label>
          <input
            type="text"
            name="packagingName"
            value={form.packagingName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="포장에 인쇄된 공식 상품명"
            autoFocus
          />
          <p className="mt-1 text-xs text-slate-400">
            포장에 인쇄된 공식 상품명 (상품 식별 기준, 입력 권장)
          </p>
        </div>

        {/* Marketing Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            상품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="marketingName"
            value={form.marketingName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="소비자에게 노출되는 상품명 (검색/노출용)"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            카테고리 <span className="text-red-500">*</span>
          </label>
          {categoriesError ? (
            /* 필수 선택 데이터 조회 실패 — 빈 select 대신 오류+재시도. 입력값은 유지됨. */
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
              <p className="font-medium">카테고리 목록을 불러오지 못했습니다.</p>
              <p className="mt-0.5 text-xs text-red-600">
                카테고리는 필수 항목입니다. 다시 시도해 주세요.
              </p>
              <button
                type="button"
                onClick={() => setCategoriesReloadKey((k) => k + 1)}
                className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              disabled={categoriesLoading}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              <option value="">
                {categoriesLoading ? '카테고리 불러오는 중...' : '카테고리 선택'}
              </option>
              {flatCats.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {'\u00A0\u00A0'.repeat(cat.depth)}
                  {cat.name}
                </option>
              ))}
            </select>
          )}
          {isRegulated && (
            <p className="mt-1 text-sm text-amber-600">
              규제 카테고리 — 아래 규제 정보 입력이 필요합니다
            </p>
          )}
        </div>

        {/* Regulatory Type — 항상 표시 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">규제 구분</label>
          <select
            name="regulatoryType"
            value={form.regulatoryType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1:
                    의약품 진입(regulatoryType=DRUG)은 이 select 에 값이 없어 화면에는 '건강기능식품'이,
                    저장에는 DRUG 이 들어갔다. 진입 유형이 의약품일 때만 DRUG 항목을 노출해 표시-저장을 일치시킨다.
                    (비의약품 진입에서는 여전히 선택할 수 없다 — 등록 정책 불변) */}
            {form.regulatoryType === 'DRUG' && <option value="DRUG">의약품</option>}
            <option value="HEALTH_FUNCTIONAL">건강기능식품</option>
            <option value="MEDICAL_DEVICE">의료기기</option>
            <option value="QUASI_DRUG">의약외품</option>
            <option value="COSMETIC">화장품</option>
            <option value="GENERAL">기타</option>
          </select>
        </div>

        {/* Brand & Manufacturer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">브랜드</label>
            {/* WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.10:
                    목록에서 고르면 brandId 를 보내고, 직접 입력하면 brandName 만 보낸다(자동 매칭·자동 생성 없음). */}
            {brands.length > 0 && (
              <select
                name="brandId"
                value={form.brandId}
                onChange={(e) => {
                  const picked = brands.find((b) => b.id === e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    brandId: picked?.id ?? '',
                    brandName: picked ? picked.name : prev.brandName,
                  }));
                }}
                className="w-full mb-2 px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">O4O 브랜드에서 선택 (선택 사항)</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              name="brandName"
              value={form.brandName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, brandName: e.target.value, brandId: '' }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="브랜드명 직접 입력 (목록에 없을 때)"
            />
            {form.brandId && <p className="mt-1 text-xs text-emerald-600">O4O 브랜드에 연결됨</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">제조사</label>
            <input
              type="text"
              name="manufacturerName"
              value={form.manufacturerName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="제조사명"
            />
          </div>
        </div>

        {/* Barcode (optional) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            바코드 <span className="text-xs text-slate-400">(선택)</span>
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              name="barcode"
              value={form.barcode}
              onChange={(e) => {
                handleChange(e);
                setBarcodeChecked(false);
                setMaster(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && searchBarcode()}
              placeholder="바코드가 있으면 입력하세요"
              className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <button
              onClick={() => searchBarcode()}
              disabled={searching || !form.barcode.trim()}
              className="px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
            >
              {searching ? '검색중...' : '조회'}
            </button>
          </div>
          {barcodeChecked && master && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-sm text-emerald-700">
                이미 등록된 제품입니다:{' '}
                <strong>{master.marketingName || master.name || master.regulatoryName}</strong>
                {master.isMfdsVerified && ' (MFDS 검증됨)'}
              </p>
              <p className="text-xs text-emerald-700/80 mt-1">
                검토 요청 대신 기존 제품에 바로 공급을 연결하세요.
              </p>
              <button
                type="button"
                onClick={goToFromMaster}
                className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                기존 제품에 공급 연결 →
              </button>
            </div>
          )}
          {barcodeChecked && !master && (
            <p className="mt-1 text-sm text-blue-600">
              표준 제품에 없는 바코드입니다 — 검토 요청으로 접수됩니다
            </p>
          )}
          {!form.barcode.trim() && (
            <p className="mt-1 text-xs text-slate-400">
              바코드가 없어도 요청할 수 있습니다 (운영자 검토에서 식별자가 확정됩니다)
            </p>
          )}
        </div>
      </div>

      {/* Regulated info (conditional) */}
      {isRegulated && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 space-y-5">
          <h3 className="text-lg font-semibold text-amber-800">규제 정보 (필수)</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                규제 유형 <span className="text-red-500">*</span>
              </label>
              <select
                name="regulatoryType"
                value={form.regulatoryType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="HEALTH_FUNCTIONAL">건강기능식품</option>
                <option value="DRUG">의약품</option>
                <option value="MEDICAL_DEVICE">의료기기</option>
                <option value="QUASI_DRUG">의약외품</option>
                <option value="COSMETIC">화장품</option>
                <option value="GENERAL">일반</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">허가번호</label>
              <input
                type="text"
                name="mfdsPermitNumber"
                value={form.mfdsPermitNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="식약처 허가번호 (선택)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              규제명 (식약처 공식명) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="regulatoryName"
              value={form.regulatoryName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="식약처에 등록된 공식 제품명"
            />
          </div>
        </div>
      )}
    </>
  );
}
