/**
 * SupplierProductImportPage — 상품 Import Assistant
 *
 * WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * 외부 상품 페이지 HTML → 파싱 → 프리뷰/편집 → 등록 페이지 자동 채움
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import { parseProductHtml } from '../../lib/product-import/parser';
import { saveDraft } from '../../lib/product-import/storage';
import type { ParsedProductData, ImportDraft, DetailImageCandidate } from '../../lib/product-import/types';
import { supplierApi } from '../../lib/api/supplier';
// WO-O4O-NETURE-SUPPLIER-MENU-ASSISTANT-IA-CLEANUP-V1
// WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-PRODUCT-TYPE-PASSTHROUGH-V1:
//   유형 선택을 등록 진입 화면(SupplierProductRegisterEntryPage)과 동일한 2분기 모델로 통일.
//   의약외품은 비의약품 하위(등록 폼 '규제 구분'에서 확정) — 진입 화면 정책과 정합.
import { getSupplierProductType, type SupplierProductTypeDef } from '../../lib/supplierProductTypes';
import { productApi, type CategoryTreeItem } from '../../lib/api';
import { mediaApi } from '../../lib/api/media';
import MediaPickerModal from '../../components/common/MediaPickerModal';

const NON_DRUG = getSupplierProductType('non_drug')!;
type TopChoice = 'drug' | 'non_drug';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const O4O_SERVICES = [
  { key: 'glycopharm', name: 'GlycoPharm' },
  { key: 'kpa-society', name: 'KPA Society' },
  { key: 'k-cosmetics', name: 'K-Cosmetics' },
];

const REGULATORY_TYPE_OPTIONS = [
  { value: 'GENERAL', label: '일반' },
  { value: 'DRUG', label: '의약품' },
  { value: 'HEALTH_FUNCTIONAL', label: '건강기능식품' },
  { value: 'QUASI_DRUG', label: '의약외품' },
  { value: 'COSMETIC', label: '화장품' },
];

/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-IMPORT-ASSISTANT-DETAIL-IMAGE-IMPORT-V1
 * HTML 속성값(src/alt) 안전 삽입용 이스케이프.
 */
function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function flattenCats(
  cats: CategoryTreeItem[],
  depth = 0,
): { id: string; name: string; depth: number; isRegulated: boolean }[] {
  const result: { id: string; name: string; depth: number; isRegulated: boolean }[] = [];
  for (const cat of cats) {
    result.push({ id: cat.id, name: cat.name, depth, isRegulated: cat.isRegulated });
    if (cat.children?.length) result.push(...flattenCats(cat.children, depth + 1));
  }
  return result;
}

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

  // Editable detail description
  const [detailDesc, setDetailDesc] = useState('');
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((url: string) => void) | null>(null);

  // Image selection
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [thumbnailIdx, setThumbnailIdx] = useState<number | null>(null);

  // 상세설명 이미지 가져오기 (WO-O4O-NETURE-SUPPLIER-PRODUCT-IMPORT-ASSISTANT-DETAIL-IMAGE-IMPORT-V1)
  //   selectedDetailImages: detailImageCandidates 배열 인덱스 기준 선택 집합
  const [selectedDetailImages, setSelectedDetailImages] = useState<Set<number>>(new Set());
  const [detailImagesConfirmed, setDetailImagesConfirmed] = useState(false);
  const [detailImgPreviewErrors, setDetailImgPreviewErrors] = useState<Set<number>>(new Set());

  // 동적 상세설명 원본 가져오기 (WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-DYNAMIC-DETAIL-CONTENTS-DETECTION-V1)
  //   상세설명을 별도 주소(AJAX)에서 불러오는 페이지 — 서버 SSRF-safe 경로로 원본을 조회한 결과.
  //   조회 성공 시 base HTML 의 (로고/메뉴 오탐) 후보를 실제 상세 이미지 후보로 교체한다.
  const [fetchedDetail, setFetchedDetail] = useState<{ candidates: DetailImageCandidate[]; fetchedUrl: string } | null>(null);
  const [dynamicFetchStatus, setDynamicFetchStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [dynamicFetchError, setDynamicFetchError] = useState('');

  // Thumbnail correction
  const [thumbNaturalSize, setThumbNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [correctionMode, setCorrectionMode] = useState<'crop' | 'pad' | 'resize'>('crop');
  const [correctedDataUrl, setCorrectedDataUrl] = useState<string | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<'idle' | 'applied' | 'cors-blocked'>('idle');
  const correctionImgRef = useRef<HTMLImageElement | null>(null);

  // UI state
  const [error, setError] = useState('');

  // O4O 등록 설정 (WO-O4O-SUPPLIER-IMPORT-O4O-SETTINGS-STEP-V1)
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [o4oCategoryId, setO4oCategoryId] = useState('');
  const [o4oPriceGeneral, setO4oPriceGeneral] = useState('');
  const [o4oIsPublic, setO4oIsPublic] = useState(false);
  const [o4oServiceKeys, setO4oServiceKeys] = useState<string[]>([]);
  const [o4oRegulatoryType, setO4oRegulatoryType] = useState('GENERAL');
  // WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-PRODUCT-TYPE-PASSTHROUGH-V1:
  //   등록 도우미는 상위 2분기(의약품/비의약품)만 선택한다. 의약품 세부 분류는 분석 후 정식 Wizard 가 처리.
  //   앞 단계에서 전달된 정밀 유형(otc/rx/의약외품)은 보존하되 도우미에서 재선택을 요구하지 않는다.
  const [searchParams] = useSearchParams();
  const [topChoice, setTopChoice] = useState<TopChoice | null>(null);
  const [passedType, setPassedType] = useState<SupplierProductTypeDef | null>(null);

  useEffect(() => {
    productApi.getCategories().then(setCategories);
  }, []);

  // 앞 단계 전달 유형 → 상위 분기 미리 선택(정밀 유형 보존). 미전달/직접 진입은 사용자가 상위만 선택.
  useEffect(() => {
    const incoming = getSupplierProductType(searchParams.get('productType'));
    if (!incoming) return;
    if (incoming.key === 'otc_drug' || incoming.key === 'rx_drug') {
      setTopChoice('drug');
      setPassedType(incoming);
    } else if (incoming.key === 'non_drug' || incoming.key === 'quasi_drug') {
      setTopChoice('non_drug');
      setPassedType(incoming); // 의약외품은 비의약품 하위 — 정밀 유형 보존(임의 강등 금지)
    }
    // unclassified/미전달은 사용자가 직접 선택
  }, [searchParams]);

  const selectTop = (choice: TopChoice) => {
    setTopChoice(choice);
    // 다른 상위 분기로 바꾸면 전달된 정밀 유형 폐기(사용자 override)
    setPassedType((prev) => {
      if (!prev) return null;
      const prevBucket: TopChoice = prev.key === 'otc_drug' || prev.key === 'rx_drug' ? 'drug' : 'non_drug';
      return prevBucket === choice ? prev : null;
    });
  };

  // 정식 Wizard 로 넘길 유효 유형/규제값 — 도우미는 상위만, 세부 미지정 의약품은 regulatoryType=DRUG 로만 전달.
  const effective = useMemo<{ productKey?: string; regulatoryType?: string }>(() => {
    if (topChoice === 'non_drug') {
      const keep = passedType && (passedType.key === 'non_drug' || passedType.key === 'quasi_drug') ? passedType : NON_DRUG;
      return { productKey: keep.key, regulatoryType: keep.regulatoryType || 'GENERAL' };
    }
    if (topChoice === 'drug') {
      const keep = passedType && (passedType.key === 'otc_drug' || passedType.key === 'rx_drug') ? passedType : null;
      return { productKey: keep?.key, regulatoryType: 'DRUG' }; // 세부 미지정이면 productType 없이 DRUG 만
    }
    return {};
  }, [topChoice, passedType]);

  const flatCats = useMemo(() => flattenCats(categories), [categories]);
  const selectedCatIsRegulated = flatCats.find((c) => c.id === o4oCategoryId)?.isRegulated ?? false;

  const editorImageUpload = useCallback(async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, undefined, 'description');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드 실패');
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Parse                                                            */
  /* ---------------------------------------------------------------- */

  const handleParse = useCallback(() => {
    // WO-...PASSTHROUGH: 상위 유형(의약품/비의약품) 선택 전에는 분석 제한. 세부 유형 없이도 분석 가능.
    if (!topChoice) {
      setError('먼저 제품 유형(의약품/비의약품)을 선택해 주세요.');
      return;
    }
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
    setDetailDesc(result.detailDescription ?? '');

    // WO-PRODUCT-HELPER-IMAGE-SELECTION-DEFAULT-OFF-V1: 기본 미선택
    setSelectedImages(new Set());
    setThumbnailIdx(null);
    setCorrectedDataUrl(null);
    setCorrectionStatus('idle');
    setThumbNaturalSize(null);

    // 상세설명 이미지 선택/확인 초기화
    setSelectedDetailImages(new Set());
    setDetailImagesConfirmed(false);
    setDetailImgPreviewErrors(new Set());

    // 동적 상세설명 조회 상태 초기화 (재분석 시 base HTML 후보로 복귀)
    setFetchedDetail(null);
    setDynamicFetchStatus('idle');
    setDynamicFetchError('');
  }, [html, sourceUrl, topChoice]);

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
      consumerDetailDesc: detailDesc,
      thumbnailUrl: correctionStatus === 'applied' ? null : thumbUrl,
      thumbnailCorrectedDataUrl: correctionStatus === 'applied' && correctedDataUrl ? correctedDataUrl : undefined,
      detailImageUrls: detailUrls.slice(0, 10),
      contentImageUrls: [],
      sourceUrl: sourceUrl || '',
      importedAt: new Date().toISOString(),
      // O4O 등록 설정 (WO-O4O-SUPPLIER-IMPORT-O4O-SETTINGS-STEP-V1)
      categoryId: o4oCategoryId || undefined,
      priceGeneral: o4oPriceGeneral || undefined,
      isPublic: o4oIsPublic,
      serviceKeys: o4oServiceKeys.length > 0 ? o4oServiceKeys : undefined,
      // WO-O4O-NETURE-SUPPLIER-MENU-ASSISTANT-IA-CLEANUP-V1: 선택 유형 우선, 없으면 기존 설정
      regulatoryType:
        (effective.regulatoryType && effective.regulatoryType !== 'GENERAL' ? effective.regulatoryType : undefined) ??
        (o4oRegulatoryType !== 'GENERAL' ? o4oRegulatoryType : undefined),
    };

    saveDraft(draft);
    // 상위 분기(+보존된 정밀 유형)를 정식 wizard 로 전달. 세부 미지정 의약품은 regulatoryType=DRUG 만.
    const params = new URLSearchParams();
    if (effective.productKey) params.set('productType', effective.productKey);
    if (effective.regulatoryType) params.set('regulatoryType', effective.regulatoryType);
    const qs = params.toString();
    navigate(qs ? `/supplier/products/new?${qs}` : '/supplier/products/new');
  }, [
    parsed,
    name,
    brand,
    manufacturer,
    specification,
    originCountry,
    price,
    detailDesc,
    selectedImages,
    thumbnailIdx,
    correctionStatus,
    correctedDataUrl,
    sourceUrl,
    navigate,
    o4oCategoryId,
    o4oPriceGeneral,
    o4oIsPublic,
    o4oServiceKeys,
    o4oRegulatoryType,
    effective,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Thumbnail dimension check                                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    setThumbNaturalSize(null);
    setCorrectedDataUrl(null);
    setCorrectionStatus('idle');

    if (thumbnailIdx === null || !parsed) return;
    const url = parsed.imageUrls[thumbnailIdx];
    if (!url) return;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setThumbNaturalSize(w === 1000 && h === 1000 ? null : { w, h });
    };
    img.onerror = () => setThumbNaturalSize(null);
    img.src = url;
  }, [thumbnailIdx, parsed]);

  const applyThumbnailCorrection = useCallback(() => {
    if (thumbnailIdx === null || !parsed || !thumbNaturalSize) return;
    const url = parsed.imageUrls[thumbnailIdx];

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    correctionImgRef.current = img;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1000, 1000);
      const { w, h } = thumbNaturalSize;

      if (correctionMode === 'crop') {
        const size = Math.min(w, h);
        ctx.drawImage(img, (w - size) / 2, (h - size) / 2, size, size, 0, 0, 1000, 1000);
      } else if (correctionMode === 'pad') {
        const scale = Math.min(1000 / w, 1000 / h);
        const dw = w * scale;
        const dh = h * scale;
        ctx.drawImage(img, 0, 0, w, h, (1000 - dw) / 2, (1000 - dh) / 2, dw, dh);
      } else {
        ctx.drawImage(img, 0, 0, 1000, 1000);
      }

      try {
        setCorrectedDataUrl(canvas.toDataURL('image/jpeg', 0.92));
        setCorrectionStatus('applied');
      } catch {
        setCorrectionStatus('cors-blocked');
      }
    };
    img.onerror = () => setCorrectionStatus('cors-blocked');
    img.src = url;
  }, [thumbnailIdx, parsed, thumbNaturalSize, correctionMode]);

  /* ---------------------------------------------------------------- */
  /*  Image toggle                                                     */
  /* ---------------------------------------------------------------- */

  // WO-PRODUCT-HELPER-IMAGE-SELECTION-DEFAULT-OFF-V1:
  // 선택 시 첫 번째 선택 이미지를 자동으로 대표 이미지로 지정
  const toggleImage = useCallback((idx: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
        // 대표 이미지 해제 시 다음 선택 이미지를 대표로
        setThumbnailIdx((prevThumb) => {
          if (prevThumb !== idx) return prevThumb;
          const remaining = [...next].sort((a, b) => a - b);
          return remaining.length > 0 ? remaining[0] : null;
        });
      } else {
        next.add(idx);
        // 첫 번째 선택 이미지면 대표로 자동 지정
        setThumbnailIdx((prevThumb) => (prevThumb === null ? idx : prevThumb));
      }
      return next;
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  상세설명 이미지 가져오기                                            */
  /*  WO-O4O-NETURE-SUPPLIER-PRODUCT-IMPORT-ASSISTANT-DETAIL-IMAGE-IMPORT-V1 */
  /* ---------------------------------------------------------------- */

  // 동적 원본 조회에 성공하면 그 결과(실제 상세 이미지)를 우선 표시 — base HTML 오탐 후보를 대체.
  const detailCandidates = fetchedDetail?.candidates ?? parsed?.detailImageCandidates ?? [];
  const dynamicSource = parsed?.dynamicDetailSource ?? null;

  const handleFetchDynamicDetail = useCallback(async () => {
    if (!dynamicSource?.resolvedUrl) return;
    setDynamicFetchStatus('loading');
    setDynamicFetchError('');
    try {
      const result = await supplierApi.fetchDetailContents(
        dynamicSource.resolvedUrl,
        sourceUrl.trim() || undefined,
      );
      if (result.candidates.length === 0) {
        setDynamicFetchStatus('error');
        setDynamicFetchError('상세설명 원본에서 이미지를 찾지 못했습니다.');
        return;
      }
      setFetchedDetail({ candidates: result.candidates, fetchedUrl: result.fetchedUrl });
      // 선택/확인/미리보기 상태 초기화 (후보 목록이 교체됨)
      setSelectedDetailImages(new Set());
      setDetailImagesConfirmed(false);
      setDetailImgPreviewErrors(new Set());
      setDynamicFetchStatus('idle');
    } catch (e) {
      setDynamicFetchStatus('error');
      setDynamicFetchError(e instanceof Error ? e.message : '상세설명 원본 조회에 실패했습니다.');
    }
  }, [dynamicSource, sourceUrl]);

  const toggleDetailImage = useCallback((idx: number) => {
    setSelectedDetailImages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const selectAllDetailImages = useCallback(() => {
    // 미리보기 실패 후보는 제외 (WO §6 — 실패 이미지는 후보 선택에서 자동 제외)
    setSelectedDetailImages(
      new Set(
        detailCandidates
          .map((_, i) => i)
          .filter((i) => !detailImgPreviewErrors.has(i)),
      ),
    );
  }, [detailCandidates, detailImgPreviewErrors]);

  const clearAllDetailImages = useCallback(() => {
    setSelectedDetailImages(new Set());
  }, []);

  // 선택 이미지를 원본 순서로 정렬해 표준 폭 <img> HTML 로 에디터 본문 하단에 추가.
  //   에디터(TipTap Image extension)가 inline style 은 제거하되 .editor-image 클래스(max-width:100%,
  //   height:auto, display:block)를 부여하므로 — 클래스 기반 표준 반응형 폭으로 일관 적용된다(WO §11).
  const handleInsertDetailImages = useCallback(() => {
    if (selectedDetailImages.size === 0 || !detailImagesConfirmed) return;

    const chosen = detailCandidates
      .filter((_, i) => selectedDetailImages.has(i))
      .slice(); // detailCandidates 는 이미 원본 DOM 순서(order 1-based)

    const productName = name.trim() || '상품';
    const html = chosen
      .map((c, i) => {
        const alt = escapeHtmlAttr(c.alt || `${productName} 상세설명 이미지 ${i + 1}`);
        return `<p><img src="${escapeHtmlAttr(c.url)}" alt="${alt}" /></p>`;
      })
      .join('');

    // 기존 본문 보존 — 하단 append (커서 삽입 API 미노출, WO §10.4 fallback)
    setDetailDesc((prev) => (prev ? prev + html : html));

    // 실수 중복 삽입 방지 — 선택/확인 상태 정리
    setSelectedDetailImages(new Set());
    setDetailImagesConfirmed(false);
  }, [selectedDetailImages, detailImagesConfirmed, detailCandidates, name]);

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
    setDetailDesc('');
    setSelectedImages(new Set());
    setThumbnailIdx(null);
    setSelectedDetailImages(new Set());
    setDetailImagesConfirmed(false);
    setDetailImgPreviewErrors(new Set());
    setFetchedDetail(null);
    setDynamicFetchStatus('idle');
    setDynamicFetchError('');
    setThumbNaturalSize(null);
    setCorrectedDataUrl(null);
    setCorrectionStatus('idle');
    setError('');
    setO4oCategoryId('');
    setO4oPriceGeneral('');
    setO4oIsPublic(false);
    setO4oServiceKeys([]);
    setO4oRegulatoryType('GENERAL');
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          등록 도우미
        </h1>
        {/* WO-O4O-NETURE-SUPPLIER-MENU-ASSISTANT-IA-CLEANUP-V1: 보조 기능 안내(자동 등록 아님) */}
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          등록 도우미는 제품을 <strong>자동 등록하는 기능이 아닙니다.</strong> 외부 상품 페이지·HTML·기존 설명에서
          제품명·브랜드·설명·이미지 후보를 추출해 <strong>정식 제품 등록 Wizard 입력을 돕는 보조 기능</strong>입니다.
          최종 제출 전에는 반드시 내용을 확인하세요.
        </div>
        <div className="mt-2">
          <strong className="text-sm text-slate-700">사용 방법</strong>
          <ol className="mt-1 ml-4 list-decimal text-sm text-slate-500 space-y-0.5">
            <li>제품 유형을 먼저 선택합니다</li>
            <li>외부 상품 페이지를 Ctrl+A → Ctrl+C 로 복사합니다</li>
            <li>아래에 붙여넣고 [분석하기] → 확인 후 [정식 등록으로 계속]</li>
          </ol>
        </div>
      </div>

      {/* WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-PRODUCT-TYPE-PASSTHROUGH-V1:
          등록 도우미는 상위 2분기(의약품/비의약품)만 선택한다. 의약품 세부 분류는 분석 후
          정식 등록 Wizard 가 처리. 앞 단계에서 전달되면 상위 분기가 미리 선택되고 정밀 유형은 보존된다. */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-800">제품 유형 선택</h2>
        <p className="mb-3 text-xs text-slate-500">
          의약품 / 비의약품만 선택하세요. 앞 단계에서 선택했다면 미리 선택되어 있으며, 세부 분류는 분석 후 정식 등록 화면에서 확정합니다.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <button
            onClick={() => selectTop('non_drug')}
            className={`text-left rounded-lg border p-3 transition-colors ${topChoice === 'non_drug' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <span className="text-sm font-medium text-slate-800">비의약품</span>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">일반 상품(식품·생활·잡화 등). 의약외품·의료기기·건기식·화장품 등 세부 분류는 등록 폼의 규제 구분에서 선택합니다.</p>
          </button>
          <button
            onClick={() => selectTop('drug')}
            className={`text-left rounded-lg border p-3 transition-colors ${topChoice === 'drug' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">의약품</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">약국 대상</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">일반의약품 또는 전문의약품. 세부 분류는 분석 후 정식 등록 화면에서 확정합니다.</p>
          </button>
        </div>
        {topChoice && (
          <p className="mt-3 text-xs text-slate-500">
            선택: <strong className="text-slate-700">{topChoice === 'drug' ? '의약품' : '비의약품'}</strong>
            {passedType?.key === 'quasi_drug' && ' (의약외품 — 비의약품 하위)'}
            . 세부 분류는 분석 후 정식 등록 화면에서 확정합니다.
          </p>
        )}
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

              {/* Thumbnail correction panel */}
              {thumbnailIdx !== null && thumbNaturalSize !== null && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-3 text-sm font-medium text-amber-800">
                    ⚠ 대표 이미지 규격 불일치 — {thumbNaturalSize.w}×{thumbNaturalSize.h}px
                    (기준: 1000×1000)
                  </p>

                  <div className="flex gap-6">
                    {/* CSS preview */}
                    <div className="flex-shrink-0">
                      <p className="mb-1 text-xs text-slate-500">보정 미리보기</p>
                      <div className="h-28 w-28 overflow-hidden rounded border border-slate-300 bg-white">
                        <img
                          src={parsed.imageUrls[thumbnailIdx]}
                          alt="보정 미리보기"
                          className={`h-full w-full ${
                            correctionMode === 'crop'
                              ? 'object-cover'
                              : correctionMode === 'pad'
                              ? 'object-contain'
                              : 'object-fill'
                          }`}
                        />
                      </div>
                      {correctionStatus === 'applied' && (
                        <p className="mt-1 text-xs text-emerald-600">✓ 1000×1000 보정 완료</p>
                      )}
                      {correctionStatus === 'cors-blocked' && (
                        <p className="mt-1 text-xs text-slate-400">원본 이미지로 전달됩니다</p>
                      )}
                    </div>

                    {/* Mode selector + button */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-slate-700">보정 방식</p>
                      {(['crop', 'pad', 'resize'] as const).map((mode) => (
                        <label key={mode} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="correctionMode"
                            value={mode}
                            checked={correctionMode === mode}
                            onChange={() => {
                              setCorrectionMode(mode);
                              setCorrectionStatus('idle');
                              setCorrectedDataUrl(null);
                            }}
                            className="accent-amber-600"
                          />
                          <span className="text-slate-700">
                            {mode === 'crop' && '정사각형 크롭 (중앙 기준)'}
                            {mode === 'pad' && '여백 추가 (흰 배경)'}
                            {mode === 'resize' && '1000×1000 리사이즈'}
                          </span>
                        </label>
                      ))}
                      <button
                        onClick={applyThumbnailCorrection}
                        className="mt-2 rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                      >
                        보정 적용
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 상세설명 이미지 가져오기
              WO-O4O-NETURE-SUPPLIER-PRODUCT-IMPORT-ASSISTANT-DETAIL-IMAGE-IMPORT-V1 */}
          <div className="mt-6 rounded-lg border border-slate-200 p-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">
              상세설명 이미지 가져오기
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              상품 페이지에서 발견한 상세설명 이미지입니다. 사용할 이미지를 선택한 뒤
              아래 상세설명 편집기에 넣을 수 있습니다.
            </p>

            {/* 동적 상세설명 안내 — 별도 주소(AJAX)에서 불러오는 페이지
                WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-DYNAMIC-DETAIL-CONTENTS-DETECTION-V1 */}
            {dynamicSource && !fetchedDetail && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">
                  이 상품은 상세설명을 별도 주소에서 불러옵니다.
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  상품 페이지 HTML 에 상세설명 이미지가 직접 들어 있지 않습니다. 아래에서 상세설명 원본을
                  가져와 분석하면 실제 상세 이미지만 후보로 표시됩니다.
                </p>
                {dynamicSource.resolvedUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={handleFetchDynamicDetail}
                      disabled={dynamicFetchStatus === 'loading'}
                      className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {dynamicFetchStatus === 'loading' ? '상세설명 원본 가져오는 중…' : '상세설명 원본 가져와 분석'}
                    </button>
                    <p className="mt-1.5 break-all text-[11px] text-amber-600">
                      원본: {dynamicSource.resolvedUrl}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 rounded bg-white px-3 py-2 text-xs text-amber-700">
                    상세설명 주소가 상대경로라 절대주소로 변환하지 못했습니다. 위 <strong>소스 URL</strong>에
                    상품 페이지 주소를 입력한 뒤 다시 <strong>분석하기</strong>를 눌러 주세요.
                  </p>
                )}
                {dynamicFetchStatus === 'error' && dynamicFetchError && (
                  <p className="mt-2 text-xs text-red-600">{dynamicFetchError}</p>
                )}
              </div>
            )}

            {/* 동적 원본 조회 성공 안내 */}
            {fetchedDetail && (
              <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                상세설명 원본에서 이미지 {fetchedDetail.candidates.length}개를 가져왔습니다. (로고·SNS·메뉴 이미지 제외)
              </p>
            )}

            {detailCandidates.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                상품 페이지에서 가져올 수 있는 상세설명 이미지를 찾지 못했습니다.
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
                    const previewFailed = detailImgPreviewErrors.has(idx);
                    return (
                      <label
                        key={idx}
                        className={`relative block cursor-pointer overflow-hidden rounded-lg border-2 ${
                          selected ? 'border-emerald-500' : 'border-slate-200 opacity-70'
                        }`}
                      >
                        {previewFailed ? (
                          <div className="flex aspect-[3/4] w-full items-center justify-center bg-slate-50 px-2 text-center text-[11px] text-slate-400">
                            미리보기 실패
                          </div>
                        ) : (
                          <img
                            src={cand.url}
                            alt={cand.alt ?? `상세 이미지 ${cand.order}`}
                            className="aspect-[3/4] w-full bg-slate-50 object-contain"
                            loading="lazy"
                            onError={() => {
                              setDetailImgPreviewErrors((prev) => {
                                const next = new Set(prev);
                                next.add(idx);
                                return next;
                              });
                              // 실패 후보는 선택에서 자동 제외 (WO §6)
                              setSelectedDetailImages((prev) => {
                                if (!prev.has(idx)) return prev;
                                const next = new Set(prev);
                                next.delete(idx);
                                return next;
                              });
                            }}
                          />
                        )}

                        {/* 선택 체크박스 */}
                        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-white/80">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={previewFailed}
                            onChange={() => toggleDetailImage(idx)}
                            className="h-3.5 w-3.5 accent-emerald-600 disabled:cursor-not-allowed"
                          />
                        </span>

                        {/* 순서 배지 */}
                        <span className="absolute right-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {cand.order}
                        </span>

                        {/* 원본 크기 (확인 가능한 경우) */}
                        {cand.width != null && cand.height != null && (
                          <span className="absolute bottom-1 left-1 rounded bg-slate-900/60 px-1 py-0.5 text-[10px] text-white">
                            {cand.width}×{cand.height}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* 사용자 확인 — 선택 1개 이상일 때만 노출 */}
                {selectedDetailImages.size > 0 && (
                  <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={detailImagesConfirmed}
                      onChange={(e) => setDetailImagesConfirmed(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                    />
                    <span>선택한 이미지가 해당 상품의 상세설명 이미지임을 확인합니다.</span>
                  </label>
                )}

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleInsertDetailImages}
                    disabled={selectedDetailImages.size === 0 || !detailImagesConfirmed}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    선택 이미지를 상세설명에 넣기
                  </button>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    원본 페이지 순서대로 아래 상세설명 본문 하단에 추가됩니다. 추가 후 순서 변경·삭제·편집할 수 있습니다.
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
              onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
            />
          </div>

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

        </div>
      )}

      {/* O4O 등록 설정 (WO-O4O-SUPPLIER-IMPORT-O4O-SETTINGS-STEP-V1) */}
      {parsed && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/40 p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-800">
            3. O4O 등록 설정
          </h2>
          <p className="mb-5 text-sm text-slate-500">
            O4O 플랫폼 등록 조건을 설정합니다. 상품 등록 페이지에 자동 입력됩니다.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* 카테고리 */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">카테고리</label>
              <select
                value={o4oCategoryId}
                onChange={(e) => setO4oCategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">카테고리 선택 (선택사항)</option>
                {flatCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {'　'.repeat(cat.depth)}{cat.name}{cat.isRegulated ? ' ⚕' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 공급가 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                공급가 (원) <span className="text-red-500">*</span>
              </label>
              <input
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
                <label className="mb-1 block text-sm font-medium text-slate-700">규제 유형 <span className="text-red-500">*</span></label>
                <select
                  value={o4oRegulatoryType}
                  onChange={(e) => setO4oRegulatoryType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {REGULATORY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 유통 설정 */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-slate-700">유통 설정</label>
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
                서비스별 공급이 설정되지 않아 승인요청 대상이 아닙니다. 저장 후 상품 편집에서 추가할 수 있습니다.
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
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              상품 등록 페이지로 이동 →
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

      <MediaPickerModal
        open={!!mediaPickerTarget}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(asset) => {
          mediaPickerTarget?.(asset.url);
          setMediaPickerTarget(null);
        }}
        title="상세 설명 이미지 선택"
        defaultFolder="description"
      />
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
