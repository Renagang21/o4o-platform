/**
 * SupplierProductImportPage — 내 쇼핑몰 관리자 상품 가져오기
 *
 * WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1
 *
 * 공급자가 자신이 운영하는 쇼핑몰(Firstmall) 관리자 상품 수정 페이지의 HTML 을
 * 붙여넣거나 파일로 불러와 → 브라우저에서 분석 → 필요한 필드/이미지만 추출 →
 * 선택 이미지는 O4O 저장소로 복사 → 표준 편집기에 삽입 → 정식 등록 입력을 돕는다.
 *
 * 원칙: 관리자 HTML 원문은 서버/DB/로그에 저장하지 않는다(선택 이미지 URL 만 복사 요청).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import { parseFirstmallAdmin, looksLikeFirstmallAdmin } from '../../lib/product-import/firstmall-admin-parser';
import { saveDraft } from '../../lib/product-import/storage';
import type { ParsedProductData, ImportDraft, DetailImageCandidate, FirstmallAdminProduct } from '../../lib/product-import/types';
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

  // Input state — sourceUrl 은 "내 쇼핑몰 주소"(상대 이미지 URL 절대화 기준)
  const [sourceUrl, setSourceUrl] = useState('');
  const [html, setHtml] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parsed result
  const [parsed, setParsed] = useState<ParsedProductData | null>(null);
  // 관리자 추출 원본(구조화) — subInfo/도메인/경고 표시용
  const [adminProduct, setAdminProduct] = useState<FirstmallAdminProduct | null>(null);

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

  // 이미지 O4O 저장소 복사 상태 (선택 → 복사 → 편집기 삽입)
  const [imageCopyStatus, setImageCopyStatus] = useState<'idle' | 'copying' | 'error'>('idle');
  const [imageCopyError, setImageCopyError] = useState('');

  // 등록 이동 시 대표/갤러리 이미지 O4O 복사 상태
  const [navStatus, setNavStatus] = useState<'idle' | 'copying'>('idle');
  const [navError, setNavError] = useState('');

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

  /** 관리자 HTML → ParsedProductData(다운스트림 호환) 매핑 */
  const handleParse = useCallback(() => {
    // WO-...PASSTHROUGH: 상위 유형(의약품/비의약품) 선택 전에는 분석 제한. 세부 유형 없이도 분석 가능.
    if (!topChoice) {
      setError('먼저 제품 유형(의약품/비의약품)을 선택해 주세요.');
      return;
    }
    if (!html.trim()) {
      setError('관리자 상품 수정 페이지 HTML을 붙여넣거나 파일을 불러와 주세요.');
      return;
    }
    if (html.length > 5 * 1024 * 1024) {
      setError('HTML이 너무 큽니다 (5MB 제한).');
      return;
    }
    if (!looksLikeFirstmallAdmin(html)) {
      setError('Firstmall 관리자 상품 수정 페이지 HTML로 보이지 않습니다. 관리자에서 상품 수정 화면의 전체 HTML(Ctrl+U)을 복사해 주세요.');
      return;
    }

    setError('');

    const admin = parseFirstmallAdmin(html, sourceUrl || undefined);
    setAdminProduct(admin);
    // 도메인 자동 감지 시 입력칸 prefill (사용자 확인용)
    if (!sourceUrl && admin.shopDomain) setSourceUrl(admin.shopDomain);

    // 상세 이미지 후보 (원본 https 쇼핑몰 URL — 미리보기는 원본, 삽입 시 O4O 복사)
    const detailCandidates: DetailImageCandidate[] = admin.detailImageUrls.map((url, i) => ({
      url,
      originalUrl: url,
      alt: null,
      width: null,
      height: null,
      order: i + 1,
    }));

    const result: ParsedProductData = {
      name: admin.name,
      brand: null,
      manufacturer: admin.manufacturer,
      specification: admin.subInfo.find((s) => /용량|내용량|규격/.test(s.label))?.value ?? null,
      originCountry: admin.originCountry,
      price: null,
      thumbnailUrl: admin.productImageUrls[0] ?? null,
      imageUrls: admin.productImageUrls,
      shortDescription: admin.summary ? `<p>${escapeHtmlAttr(admin.summary)}</p>` : null,
      detailDescription: admin.detailHtml ?? '',
      detailImageCandidates: detailCandidates,
    };
    setParsed(result);

    setName(result.name ?? '');
    setBrand('');
    setManufacturer(result.manufacturer ?? '');
    setSpecification(result.specification ?? '');
    setOriginCountry(result.originCountry ?? '');
    setPrice('');
    setDetailDesc(result.detailDescription ?? '');

    // 기본 선택: 대표 이미지 후보(view/large 우선 = index 0) 1개 자동 선택 + 대표 지정.
    //   productImageUrls 는 [view, large, list1, ...] 순서라 index 0 이 가장 적합한 대표.
    if (result.imageUrls.length > 0) {
      setSelectedImages(new Set([0]));
      setThumbnailIdx(0);
    } else {
      setSelectedImages(new Set());
      setThumbnailIdx(null);
    }

    // 상세설명 이미지: 정상 후보 기본 전체 선택(사용자가 해제 가능)
    setSelectedDetailImages(new Set(detailCandidates.map((_, i) => i)));
    setDetailImagesConfirmed(false);
    setImageCopyStatus('idle');
    setImageCopyError('');
    setNavStatus('idle');
    setNavError('');
  }, [html, sourceUrl, topChoice]);

  /** .html / .txt 파일 불러오기 → textarea 채움 (서버 전송 없음) */
  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('파일이 너무 큽니다 (5MB 제한).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setHtml(typeof reader.result === 'string' ? reader.result : '');
      setError('');
    };
    reader.onerror = () => setError('파일을 읽지 못했습니다.');
    reader.readAsText(file, 'utf-8');
    // 같은 파일 재선택 허용
    e.target.value = '';
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Navigate to Create                                               */
  /* ---------------------------------------------------------------- */

  const handleNavigateToCreate = useCallback(async () => {
    if (!parsed || navStatus === 'copying') return;

    const selectedImgUrls = parsed.imageUrls.filter((_, i) =>
      selectedImages.has(i),
    );

    const thumbUrl =
      thumbnailIdx != null && parsed.imageUrls[thumbnailIdx]
        ? parsed.imageUrls[thumbnailIdx]
        : selectedImgUrls[0] ?? null;

    const detailSelUrls = selectedImgUrls.filter((u) => u !== thumbUrl);

    // 선택 대표/갤러리 이미지를 O4O 로 복사 — 외부 http/https URL 이 등록 데이터에 남지 않도록.
    let o4oThumb: string | null = null;
    let o4oDetailUrls: string[] = [];
    if (selectedImgUrls.length > 0) {
      setNavStatus('copying');
      setNavError('');
      try {
        const shopOrigin = (sourceUrl.trim() || adminProduct?.shopDomain) || undefined;
        const res = await supplierApi.copyImages(selectedImgUrls, shopOrigin);
        const map = new Map(res.results.filter((r) => r.ok && r.url).map((r) => [r.originalUrl, r.url as string]));
        o4oThumb = thumbUrl ? map.get(thumbUrl) ?? null : null;
        o4oDetailUrls = detailSelUrls.map((u) => map.get(u)).filter((u): u is string => !!u);
        if (!o4oThumb && o4oDetailUrls.length === 0) {
          setNavStatus('idle');
          setNavError('선택 이미지를 O4O 저장소로 복사하지 못했습니다. 내 쇼핑몰 주소가 올바른지 확인해 주세요.');
          return;
        }
      } catch (e) {
        setNavStatus('idle');
        setNavError(e instanceof Error ? e.message : '이미지 복사에 실패했습니다.');
        return;
      }
    }

    const draft: ImportDraft = {
      marketingName: name,
      brandName: brand,
      manufacturerName: manufacturer,
      specification,
      originCountry,
      consumerReferencePrice: price,
      consumerShortDesc: parsed.shortDescription ?? '',
      consumerDetailDesc: detailDesc,
      // O4O https URL 만 전달 (외부 URL 미전달)
      thumbnailUrl: o4oThumb,
      thumbnailCorrectedDataUrl: undefined,
      detailImageUrls: o4oDetailUrls.slice(0, 10),
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
    setNavStatus('idle');
    // 상위 분기(+보존된 정밀 유형)를 정식 wizard 로 전달. 세부 미지정 의약품은 regulatoryType=DRUG 만.
    const params = new URLSearchParams();
    if (effective.productKey) params.set('productType', effective.productKey);
    if (effective.regulatoryType) params.set('regulatoryType', effective.regulatoryType);
    const qs = params.toString();
    navigate(qs ? `/supplier/products/new?${qs}` : '/supplier/products/new');
  }, [
    parsed,
    navStatus,
    name,
    brand,
    manufacturer,
    specification,
    originCountry,
    price,
    detailDesc,
    selectedImages,
    thumbnailIdx,
    sourceUrl,
    adminProduct,
    navigate,
    o4oCategoryId,
    o4oPriceGeneral,
    o4oIsPublic,
    o4oServiceKeys,
    o4oRegulatoryType,
    effective,
  ]);

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

  // 상세 이미지 후보 — 관리자 HTML 에서 직접 추출(원본 https 쇼핑몰 URL).
  const detailCandidates = parsed?.detailImageCandidates ?? [];

  const toggleDetailImage = useCallback((idx: number) => {
    setSelectedDetailImages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const selectAllDetailImages = useCallback(() => {
    setSelectedDetailImages(new Set(detailCandidates.map((_, i) => i)));
  }, [detailCandidates]);

  const clearAllDetailImages = useCallback(() => {
    setSelectedDetailImages(new Set());
  }, []);

  // 선택 이미지를 O4O 저장소로 복사한 뒤, 표준 폭 <img>(가운데 정렬)로 에디터 본문 하단에 삽입.
  //   외부 URL 이 아닌 O4O https URL 을 삽입한다(원본 사이트 차단/변경에 영향받지 않음).
  //   에디터(.editor-image 클래스)가 표준 반응형 폭을 적용한다(WO §10).
  const handleInsertDetailImages = useCallback(async () => {
    if (selectedDetailImages.size === 0 || !detailImagesConfirmed || imageCopyStatus === 'copying') return;

    const chosen = detailCandidates.filter((_, i) => selectedDetailImages.has(i)); // 이미 원본 순서

    setImageCopyStatus('copying');
    setImageCopyError('');
    try {
      const shopOrigin = (sourceUrl.trim() || adminProduct?.shopDomain) ?? undefined;
      // 상세설명 이미지는 원본 해상도 보존(긴 세로 이미지를 축소하지 않음 → 본문 폭 표시 시 선명).
      const res = await supplierApi.copyImages(
        chosen.map((c) => c.originalUrl),
        shopOrigin,
        { preserveOriginal: true },
      );
      // originalUrl → O4O url 매핑
      const map = new Map(res.results.filter((r) => r.ok && r.url).map((r) => [r.originalUrl, r.url as string]));
      const productName = name.trim() || '상품';
      const html = chosen
        .map((c, i) => {
          const o4oUrl = map.get(c.originalUrl);
          if (!o4oUrl) return '';
          const alt = escapeHtmlAttr(c.alt || `${productName} 상세설명 이미지 ${i + 1}`);
          return `<p><img src="${escapeHtmlAttr(o4oUrl)}" alt="${alt}" class="editor-image img-align-center" /></p>`;
        })
        .filter(Boolean)
        .join('');

      if (!html) {
        setImageCopyStatus('error');
        setImageCopyError('선택한 이미지를 O4O 저장소로 복사하지 못했습니다. 쇼핑몰 주소가 올바른지 확인해 주세요.');
        return;
      }

      setDetailDesc((prev) => (prev ? prev + html : html));
      if (res.copied < chosen.length) {
        setImageCopyError(`${chosen.length}개 중 ${res.copied}개만 복사되어 삽입했습니다. 일부 이미지는 가져오지 못했습니다.`);
      }
      setSelectedDetailImages(new Set());
      setDetailImagesConfirmed(false);
      setImageCopyStatus('idle');
    } catch (e) {
      setImageCopyStatus('error');
      setImageCopyError(e instanceof Error ? e.message : '이미지 복사에 실패했습니다.');
    }
  }, [selectedDetailImages, detailImagesConfirmed, imageCopyStatus, detailCandidates, sourceUrl, adminProduct, name]);

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
    setAdminProduct(null);
    setImageCopyStatus('idle');
    setImageCopyError('');
    setNavStatus('idle');
    setNavError('');
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
          내 쇼핑몰 관리자 상품 가져오기
        </h1>
        {/* WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1 */}
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          본인이 운영하거나 상품 정보 사용 권한을 가진 쇼핑몰의 <strong>관리자 상품 데이터만</strong> 가져올 수 있습니다.
          현재 <strong>Firstmall 관리자 상품 수정 페이지</strong>를 지원합니다.
        </div>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          관리자 HTML 은 <strong>브라우저에서만 분석</strong>되며 <strong>원본 관리자 데이터는 서버·DB·로그에 저장하지 않습니다.</strong>
          선택한 이미지만 O4O 저장소로 복사됩니다. 자동 등록이 아니며, 정식 제품 등록 입력을 돕는 보조 기능입니다.
        </div>
        <div className="mt-2">
          <strong className="text-sm text-slate-700">사용 방법</strong>
          <ol className="mt-1 ml-4 list-decimal text-sm text-slate-500 space-y-0.5">
            <li>제품 유형을 먼저 선택합니다</li>
            <li>쇼핑몰 관리자에서 상품 수정 페이지를 열고 Ctrl+U 로 HTML을 확인합니다</li>
            <li>전체 HTML을 복사해 붙여넣거나 HTML 파일을 불러옵니다</li>
            <li>[관리자 상품 데이터 분석] → 이미지 선택 → [정식 등록으로 계속]</li>
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
          1. 관리자 상품 HTML 입력
        </h2>

        <p className="mb-3 text-sm text-slate-500">
          쇼핑몰 관리자 상품 수정 페이지의 HTML을 붙여넣거나 <strong>HTML 파일을 불러오세요.</strong>
          관리자 페이지에서 Ctrl+U(페이지 소스 보기) → 전체 복사가 가장 정확합니다.
        </p>

        {/* Shop domain */}
        <label className="mb-1 block text-sm font-medium text-slate-700">
          내 쇼핑몰 주소 <span className="font-normal text-slate-400">(이미지 주소 기준 — 자동 감지되며 필요 시 수정)</span>
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://myshop.co.kr"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        {/* HTML textarea + file load */}
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">관리자 HTML *</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            HTML 파일 불러오기 (.html / .txt)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,.txt,text/html,text/plain"
            onChange={handleFileLoad}
            className="hidden"
          />
        </div>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={12}
          placeholder="관리자 상품 수정 페이지의 HTML을 붙여넣으세요"
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
            관리자 상품 데이터 분석
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
                    {adminProduct.subInfo.filter((s) => s.label || s.value).map((s, i) => (
                      <span key={i}><strong className="text-slate-700">{s.label || '항목'}:</strong> {s.value}</span>
                    ))}
                  </div>
                  {adminProduct.keyword && (
                    <p className="mt-1 truncate text-[11px] text-slate-400">검색어: {adminProduct.keyword}</p>
                  )}
                </div>
              )}
              <p className="text-[11px] text-slate-400">
                가져오지 않는 관리자 전용 정보(재고·가격정책·옵션·배송·노출설정·주문/회원 등)는 분석에서 제외됩니다.
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
                      selectedImages.has(idx)
                        ? 'border-emerald-500'
                        : 'border-slate-200 opacity-50'
                    }`}
                  >
                    {/* 프록시 미리보기 (http 외부 URL 직접 삽입 금지 → 혼합 콘텐츠 회피) */}
                    <ProxiedImg
                      url={url}
                      shopOrigin={(sourceUrl.trim() || adminProduct?.shopDomain) || undefined}
                      alt={`상품 이미지 ${idx + 1}`}
                      imgClassName="aspect-square w-full object-cover"
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

          {/* 상세설명 이미지 (관리자 HTML 추출) — 선택 시 O4O 저장소로 복사 후 삽입
              WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1 */}
          <div className="mt-6 rounded-lg border border-slate-200 p-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">
              상세설명 이미지
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              관리자 상세설명에서 추출한 이미지입니다. 사용할 이미지를 선택하면 <strong>O4O 저장소로 복사</strong>한 뒤
              아래 상세설명 편집기에 본문 폭으로 삽입합니다.
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
                          shopOrigin={(sourceUrl.trim() || adminProduct?.shopDomain) || undefined}
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
                    disabled={selectedDetailImages.size === 0 || !detailImagesConfirmed || imageCopyStatus === 'copying'}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {imageCopyStatus === 'copying' ? 'O4O 저장소로 복사 중…' : '선택 이미지를 O4O로 복사 후 상세설명에 넣기'}
                  </button>
                  {imageCopyError && (
                    <p className="mt-2 text-xs text-amber-700">{imageCopyError}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    원본 순서대로 O4O 저장소(https)로 복사한 뒤 본문 폭·가운데 정렬로 상세설명 하단에 추가됩니다. 추가 후 순서 변경·삭제·편집할 수 있습니다.
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
/*  ProxiedImg — 서버 SSRF-safe 프록시 미리보기 (혼합 콘텐츠 회피)          */
/*  WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1                  */
/* ------------------------------------------------------------------ */

function ProxiedImg({
  url,
  shopOrigin,
  alt,
  imgClassName,
  onStatus,
}: {
  url: string;
  shopOrigin?: string;
  alt: string;
  imgClassName?: string;
  /** 미리보기 성공(true)/실패(false) 보고 — 부모가 선택 가능 여부 판단 */
  onStatus?: (ok: boolean) => void;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [src, setSrc] = useState<string | null>(null);
  const objRef = useRef<string | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  const load = useCallback(async () => {
    setState('loading');
    if (objRef.current) {
      URL.revokeObjectURL(objRef.current);
      objRef.current = null;
    }
    try {
      const obj = await supplierApi.proxyImageObjectUrl(url, shopOrigin);
      objRef.current = obj;
      setSrc(obj);
      setState('ok');
      statusRef.current?.(true);
    } catch {
      setState('fail');
      statusRef.current?.(false);
    }
  }, [url, shopOrigin]);

  useEffect(() => {
    load();
    return () => {
      if (objRef.current) URL.revokeObjectURL(objRef.current);
    };
  }, [load]);

  if (state === 'loading') {
    return (
      <div className={`flex aspect-[3/4] w-full items-center justify-center bg-slate-50 text-[11px] text-slate-400 ${imgClassName ?? ''}`}>
        불러오는 중…
      </div>
    );
  }
  if (state === 'fail' || !src) {
    return (
      <div className={`flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 bg-slate-50 px-2 text-center text-[11px] text-slate-500 ${imgClassName ?? ''}`}>
        <span>미리보기 실패</span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); load(); }}
          className="rounded border border-slate-300 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-white"
        >
          재시도
        </button>
      </div>
    );
  }
  return <img src={src} alt={alt} className={imgClassName} loading="lazy" />;
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
