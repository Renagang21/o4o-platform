/**
 * SupplierProductImportPage — 상품 Import Assistant
 *
 * WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * 외부 상품 페이지 HTML → 파싱 → 프리뷰/편집 → 등록 페이지 자동 채움
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseProductHtml } from '../../lib/product-import/parser';
import { saveDraft } from '../../lib/product-import/storage';
import type { ParsedProductData, ImportDraft } from '../../lib/product-import/types';

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SupplierProductImportPage() {
  const navigate = useNavigate();

  // Input state
  const [sourceUrl, setSourceUrl] = useState('');
  const [html, setHtml] = useState('');

  // Parsed result
  const [parsed, setParsed] = useState<ParsedProductData | null>(null);

  // Editable fields (initialized from parsed result)
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [specification, setSpecification] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [price, setPrice] = useState('');

  // Image selection
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [thumbnailIdx, setThumbnailIdx] = useState<number | null>(null);

  // UI state
  const [error, setError] = useState('');

  /* ---------------------------------------------------------------- */
  /*  Parse                                                            */
  /* ---------------------------------------------------------------- */

  const handleParse = useCallback(() => {
    if (!html.trim()) {
      setError('HTML을 붙여넣어 주세요.');
      return;
    }

    // Size limit: 2MB
    if (html.length > 2 * 1024 * 1024) {
      setError('HTML이 너무 큽니다 (2MB 제한). 상품 상세 부분만 복사해 주세요.');
      return;
    }

    setError('');

    const result = parseProductHtml(html, sourceUrl || undefined);
    setParsed(result);

    // Initialize editable fields
    setName(result.name ?? '');
    setBrand(result.brand ?? '');
    setManufacturer(result.manufacturer ?? '');
    setSpecification(result.specification ?? '');
    setOriginCountry(result.originCountry ?? '');
    setPrice(result.price ? String(result.price) : '');

    // Select all images by default
    const allIdxs = new Set(result.imageUrls.map((_, i) => i));
    setSelectedImages(allIdxs);
    setThumbnailIdx(result.imageUrls.length > 0 ? 0 : null);
  }, [html, sourceUrl]);

  /* ---------------------------------------------------------------- */
  /*  Navigate to Create                                               */
  /* ---------------------------------------------------------------- */

  const handleNavigateToCreate = useCallback(() => {
    if (!parsed) return;

    const selectedImgUrls = parsed.imageUrls.filter((_, i) =>
      selectedImages.has(i),
    );

    const thumbUrl =
      thumbnailIdx != null && parsed.imageUrls[thumbnailIdx]
        ? parsed.imageUrls[thumbnailIdx]
        : selectedImgUrls[0] ?? null;

    const detailUrls = selectedImgUrls.filter((u) => u !== thumbUrl);

    const draft: ImportDraft = {
      marketingName: name,
      brandName: brand,
      manufacturerName: manufacturer,
      specification,
      originCountry,
      consumerReferencePrice: price,
      consumerShortDesc: parsed.shortDescription ?? '',
      consumerDetailDesc: parsed.detailDescription ?? '',
      thumbnailUrl: thumbUrl,
      detailImageUrls: detailUrls.slice(0, 10),
      contentImageUrls: [],
      sourceUrl: sourceUrl || '',
      importedAt: new Date().toISOString(),
    };

    saveDraft(draft);
    navigate('/supplier/products/new');
  }, [
    parsed,
    name,
    brand,
    manufacturer,
    specification,
    originCountry,
    price,
    selectedImages,
    thumbnailIdx,
    sourceUrl,
    navigate,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Image toggle                                                     */
  /* ---------------------------------------------------------------- */

  const toggleImage = useCallback((idx: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  const handleReset = useCallback(() => {
    setHtml('');
    setSourceUrl('');
    setParsed(null);
    setName('');
    setBrand('');
    setManufacturer('');
    setSpecification('');
    setOriginCountry('');
    setPrice('');
    setSelectedImages(new Set());
    setThumbnailIdx(null);
    setError('');
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          상품 등록 도우미
        </h1>
        <div className="mt-2">
          <strong className="text-sm text-slate-700">사용 방법</strong>
          <ol className="mt-1 ml-4 list-decimal text-sm text-slate-500 space-y-0.5">
            <li>외부 쇼핑몰 상품 페이지를 엽니다</li>
            <li>Ctrl+A → Ctrl+C 로 전체 복사합니다</li>
            <li>아래에 붙여넣고 [분석하기]를 클릭합니다</li>
          </ol>
          <p className="mt-2 text-sm text-slate-400">
            외부 상품 정보를 기반으로 빠르게 등록할 수 있습니다
          </p>
        </div>
      </div>

      {/* Input Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          1. HTML 붙여넣기
        </h2>

        <p className="mb-3 text-sm text-slate-500">
          외부 상품 페이지에서 Ctrl+A → Ctrl+C로 복사한 후 아래에 붙여넣어
          주세요. (페이지 소스 보기의 HTML도 가능)
        </p>

        {/* Source URL */}
        <label className="mb-1 block text-sm font-medium text-slate-700">
          소스 URL (선택)
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/product/123"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        {/* HTML textarea */}
        <label className="mb-1 block text-sm font-medium text-slate-700">
          HTML *
        </label>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={12}
          placeholder="<html>...</html> 또는 상품 상세 HTML을 붙여넣으세요"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleParse}
            disabled={!html.trim()}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            분석하기
          </button>
          {parsed && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Result Card */}
      {parsed && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            2. 추출 결과 확인 및 편집
          </h2>

          {/* Extracted Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="상품명" value={name} onChange={setName} />
            <Field label="브랜드" value={brand} onChange={setBrand} />
            <Field
              label="제조사"
              value={manufacturer}
              onChange={setManufacturer}
            />
            <Field
              label="규격"
              value={specification}
              onChange={setSpecification}
            />
            <Field
              label="원산지"
              value={originCountry}
              onChange={setOriginCountry}
            />
            <Field
              label="소비자 참고가 (원)"
              value={price}
              onChange={setPrice}
              type="number"
            />
          </div>

          {/* Images */}
          {parsed.imageUrls.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                이미지 ({selectedImages.size}/{parsed.imageUrls.length} 선택)
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                체크박스로 포함할 이미지를 선택하세요. 별표(★)를 클릭하면
                대표 이미지로 지정됩니다.
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {parsed.imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative overflow-hidden rounded-lg border-2 ${
                      selectedImages.has(idx)
                        ? 'border-emerald-500'
                        : 'border-slate-200 opacity-50'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`img-${idx}`}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="%23f1f5f9"/></svg>';
                      }}
                    />

                    {/* Checkbox */}
                    <label className="absolute left-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-white/80">
                      <input
                        type="checkbox"
                        checked={selectedImages.has(idx)}
                        onChange={() => toggleImage(idx)}
                        className="h-3.5 w-3.5 accent-emerald-600"
                      />
                    </label>

                    {/* Thumbnail star */}
                    <button
                      onClick={() => setThumbnailIdx(idx)}
                      className={`absolute right-1 top-1 text-lg leading-none ${
                        thumbnailIdx === idx
                          ? 'text-yellow-400'
                          : 'text-white/60 hover:text-yellow-300'
                      }`}
                      title="대표 이미지로 지정"
                    >
                      {thumbnailIdx === idx ? '\u2605' : '\u2606'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description Preview */}
          {parsed.detailDescription && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                상세 설명 프리뷰
              </h3>
              <div
                className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"
                dangerouslySetInnerHTML={{
                  __html: parsed.detailDescription,
                }}
              />
            </div>
          )}

          {/* Short Description Preview */}
          {parsed.shortDescription && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                간이 설명 프리뷰
              </h3>
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"
                dangerouslySetInnerHTML={{
                  __html: parsed.shortDescription,
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleNavigateToCreate}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              상품 등록으로 이동
            </button>
            <button
              onClick={() => navigate('/supplier/products')}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field Component                                                    */
/* ------------------------------------------------------------------ */

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
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}
