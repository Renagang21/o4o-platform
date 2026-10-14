import { useId } from 'react';
import { RichTextEditor } from '@o4o/content-editor';
import ProxiedImg from './ProxiedImportImage';
import type { useSupplierProductImport } from './useSupplierProductImport';

export default function SupplierImportResult({
  controller,
}: {
  controller: ReturnType<typeof useSupplierProductImport>;
}) {
  const {
    sourceUrl,
    parsed,
    adminProduct,
    name,
    setName,
    brand,
    setBrand,
    manufacturer,
    setManufacturer,
    specification,
    setSpecification,
    originCountry,
    setOriginCountry,
    price,
    setPrice,
    detailDesc,
    setDetailDesc,
    setMediaPickerTarget,
    selectedImages,
    thumbnailIdx,
    setThumbnailIdx,
    imgNaturalSizes,
    setImgNaturalSizes,
    selectedDetailImages,
    detailImagesConfirmed,
    setDetailImagesConfirmed,
    editorImageUpload,
    toggleImage,
    detailCandidates,
    toggleDetailImage,
    selectAllDetailImages,
    clearAllDetailImages,
    imageCopyStatus,
    imageCopyError,
    handleInsertDetailImages,
  } = controller;
  if (!parsed) return null;
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-800">2. 추출 결과 확인 및 편집</h2>

      {/* Extracted Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="상품명" value={name} onChange={setName} />
        <Field label="브랜드" value={brand} onChange={setBrand} />
        <Field label="제조사" value={manufacturer} onChange={setManufacturer} />
        <Field label="규격" value={specification} onChange={setSpecification} />
        <Field label="원산지" value={originCountry} onChange={setOriginCountry} />
        <Field label="소비자 참고가 (원)" value={price} onChange={setPrice} type="number" />
      </div>

      {/* 관리자 추출 안내 + 추가정보 + 가져오지 않는 정보 */}
      {adminProduct && (
        <div className="mt-4 space-y-3">
          {adminProduct.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {adminProduct.warnings.map((w, i) => (
                <p key={i}>· {w}</p>
              ))}
            </div>
          )}
          {adminProduct.subInfo.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="mb-1 text-xs font-semibold text-slate-600">
                직접입력 추가정보 {adminProduct.keyword ? '· 검색어' : ''}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {adminProduct.subInfo
                  .filter((s) => s.label || s.value)
                  .map((s, i) => (
                    <span key={i}>
                      <strong className="text-slate-700">{s.label || '항목'}:</strong> {s.value}
                    </span>
                  ))}
              </div>
              {adminProduct.keyword && (
                <p className="mt-1 truncate text-[11px] text-slate-400">
                  검색어: {adminProduct.keyword}
                </p>
              )}
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            가져오지 않는 관리자 전용 정보(재고·가격정책·옵션·배송·노출설정·주문/회원 등)는 분석에서
            제외됩니다.
            {adminProduct.goodsSeq && <> 원본 상품번호: {adminProduct.goodsSeq}</>}
            {adminProduct.shopDomain && <> · 이미지 기준: {adminProduct.shopDomain}</>}
          </p>
        </div>
      )}

      {/* Images */}
      {parsed.imageUrls.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            이미지 ({selectedImages.size}/{parsed.imageUrls.length} 선택)
          </h3>
          <p className="mb-1 text-xs text-slate-500">
            등록할 이미지를 직접 선택하세요. 별표(★)로 대표 이미지를 지정합니다.
          </p>
          {selectedImages.size === 0 && (
            <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
              선택된 이미지 없음 — 등록 페이지에 이미지가 전달되지 않습니다.
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {parsed.imageUrls.map((url, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-lg border-2 ${
                  selectedImages.has(idx) ? 'border-emerald-500' : 'border-slate-200 opacity-50'
                }`}
              >
                {/* 프록시 미리보기 (http 외부 URL 직접 삽입 금지 → 혼합 콘텐츠 회피) */}
                <ProxiedImg
                  url={url}
                  shopOrigin={sourceUrl.trim() || adminProduct?.shopDomain || undefined}
                  alt={`상품 이미지 ${idx + 1}`}
                  imgClassName="aspect-square w-full object-cover"
                  onLoaded={(w, h) =>
                    setImgNaturalSizes((prev) => (prev[idx] ? prev : { ...prev, [idx]: { w, h } }))
                  }
                />

                {/* Checkbox */}
                <label className="absolute left-1 top-1 flex h-5 w-5 [@media(any-pointer:coarse)]:h-11 [@media(any-pointer:coarse)]:w-11 cursor-pointer items-center justify-center rounded bg-white/80 focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type="checkbox"
                    aria-label={`상품 이미지 ${idx + 1} 선택`}
                    checked={selectedImages.has(idx)}
                    onChange={() => toggleImage(idx)}
                    className="h-3.5 w-3.5 accent-emerald-600"
                  />
                </label>

                {/* Thumbnail star */}
                <button
                  onClick={() => setThumbnailIdx(idx)}
                  className={`absolute right-1 top-1 text-lg leading-none ${
                    thumbnailIdx === idx ? 'text-yellow-400' : 'text-white/60 hover:text-yellow-300'
                  }`}
                  title="대표 이미지로 지정"
                >
                  {thumbnailIdx === idx ? '★' : '☆'}
                </button>

                {/* 대표 배지 · 원본 크기 (예: 대표 · 850×850) */}
                {(thumbnailIdx === idx || imgNaturalSizes[idx]) && (
                  <span
                    className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] text-white ${
                      thumbnailIdx === idx ? 'bg-emerald-600/90 font-medium' : 'bg-slate-900/60'
                    }`}
                  >
                    {[
                      thumbnailIdx === idx ? '대표' : null,
                      imgNaturalSizes[idx]
                        ? `${imgNaturalSizes[idx].w}×${imgNaturalSizes[idx].h}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 대표 썸네일 표준화 안내 */}
          <p className="mt-2 text-xs text-slate-500">
            대표 이미지는 상품 전체가 보이도록 1000×1000으로 맞춰집니다. 가장 큰 이미지를 기본으로
            선택했습니다.
            {thumbnailIdx !== null && imgNaturalSizes[thumbnailIdx] && (
              <>
                {' '}
                현재 {imgNaturalSizes[thumbnailIdx].w}×{imgNaturalSizes[thumbnailIdx].h} → 1000×1000
              </>
            )}
          </p>
        </div>
      )}

      {/* 상세설명 이미지 (관리자 HTML 추출) — 선택 시 O4O 저장소로 복사 후 삽입
              WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1 */}
      <div className="mt-6 rounded-lg border border-slate-200 p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-700">상세설명 이미지</h3>
        <p className="mb-3 text-xs text-slate-500">
          관리자 상세설명에서 추출한 이미지입니다. 사용할 이미지를 선택하면{' '}
          <strong>O4O 저장소로 복사</strong>한 뒤 아래 상세설명 편집기에 본문 폭으로 삽입합니다.
        </p>

        {detailCandidates.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            관리자 상세설명에서 가져올 수 있는 이미지를 찾지 못했습니다.
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {selectedDetailImages.size}/{detailCandidates.length} 선택
              </span>
              <button
                type="button"
                onClick={selectAllDetailImages}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={clearAllDetailImages}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                전체 해제
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {detailCandidates.map((cand, idx) => {
                const selected = selectedDetailImages.has(idx);
                return (
                  <label
                    key={idx}
                    className={`relative block cursor-pointer overflow-hidden rounded-lg border-2 ${
                      selected ? 'border-emerald-500' : 'border-slate-200 opacity-70'
                    }`}
                  >
                    {/* 프록시 미리보기 (실패 시 재시도 카드) */}
                    <ProxiedImg
                      url={cand.originalUrl}
                      shopOrigin={sourceUrl.trim() || adminProduct?.shopDomain || undefined}
                      alt={cand.alt ?? `상세 이미지 ${cand.order}`}
                      imgClassName="aspect-[3/4] w-full bg-slate-50 object-contain"
                    />

                    {/* 선택 체크박스 */}
                    <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-white/80">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDetailImage(idx)}
                        className="h-3.5 w-3.5 accent-emerald-600"
                      />
                    </span>

                    {/* 순서 배지 */}
                    <span className="absolute right-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {cand.order}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* 사용자 확인 — 선택 1개 이상일 때만 노출 (내 상품 데이터가 맞습니다) */}
            {selectedDetailImages.size > 0 && (
              <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={detailImagesConfirmed}
                  onChange={(e) => setDetailImagesConfirmed(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                />
                <span>내 상품(또는 사용 권한이 있는 상품)의 상세설명 이미지가 맞습니다.</span>
              </label>
            )}

            <div className="mt-3">
              <button
                type="button"
                onClick={handleInsertDetailImages}
                disabled={
                  selectedDetailImages.size === 0 ||
                  !detailImagesConfirmed ||
                  imageCopyStatus === 'copying'
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {imageCopyStatus === 'copying'
                  ? 'O4O 저장소로 복사 중…'
                  : '선택 이미지를 O4O로 복사 후 상세설명에 넣기'}
              </button>
              {imageCopyError && <p className="mt-2 text-xs text-amber-700">{imageCopyError}</p>}
              <p className="mt-1.5 text-[11px] text-slate-400">
                원본 순서대로 O4O 저장소(https)로 복사한 뒤 본문 폭·가운데 정렬로 상세설명 하단에
                추가됩니다. 추가 후 순서 변경·삭제·편집할 수 있습니다.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Detail Description Editor */}
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          상세 설명{' '}
          <span className="ml-1 text-xs font-normal text-slate-400">
            (직접 수정 가능 — 등록 페이지로 그대로 전달됩니다)
          </span>
        </h3>
        <RichTextEditor
          value={detailDesc}
          onChange={(c) => setDetailDesc(c.html)}
          placeholder="상세 설명이 없습니다"
          minHeight="200px"
          onImageUpload={editorImageUpload}
          onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
        />
      </div>

      {/* Short Description Preview */}
      {parsed.shortDescription && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">간이 설명 프리뷰</h3>
          <div
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"
            dangerouslySetInnerHTML={{
              __html: parsed.shortDescription,
            }}
          />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const fieldId = useId();
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}
