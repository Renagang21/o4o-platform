import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { MediaInsert } from '@o4o/content-editor';
import {
  parseFirstmallAdmin,
  looksLikeFirstmallAdmin,
} from '../../../lib/product-import/firstmall-admin-parser';
import type { ImportDraft, ParsedProductData, FirstmallAdminProduct } from '../../../lib/product-import/types';
import {
  getSupplierProductType,
  type SupplierProductTypeDef,
} from '../../../lib/supplierProductTypes';
import { productApi, type CategoryTreeItem } from '../../../lib/api';
import { mediaApi } from '../../../lib/api/media';
import { NON_DRUG, mapImportProduct, flattenCats, type TopChoice } from './importHelpers';
import { useSupplierImportTransfers } from './useSupplierImportTransfers';

export function useSupplierProductImport(onApplyDraft?: (draft: ImportDraft) => void) {
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
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((media: MediaInsert) => void) | null>(
    null,
  );

  // Image selection
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [thumbnailIdx, setThumbnailIdx] = useState<number | null>(null);
  // 상품 이미지 후보의 실제 자연 크기 (원본 크기 표시 — 대표는 등록 시 1000x1000 표준화)
  const [imgNaturalSizes, setImgNaturalSizes] = useState<Record<number, { w: number; h: number }>>(
    {},
  );

  // 상세설명 이미지 가져오기 (WO-O4O-NETURE-SUPPLIER-PRODUCT-IMPORT-ASSISTANT-DETAIL-IMAGE-IMPORT-V1)
  //   selectedDetailImages: detailImageCandidates 배열 인덱스 기준 선택 집합
  const [selectedDetailImages, setSelectedDetailImages] = useState<Set<number>>(new Set());
  const [detailImagesConfirmed, setDetailImagesConfirmed] = useState(false);

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

  const embedded = Boolean(onApplyDraft);
  // 앞 단계 전달 유형 → 상위 분기 미리 선택(정밀 유형 보존). 미전달/직접 진입은 사용자가 상위만 선택.
  useEffect(() => {
    const incoming = getSupplierProductType(searchParams.get('productType') ?? (embedded ? 'non_drug' : null));
    if (!incoming) return;
    if (incoming.key === 'otc_drug' || incoming.key === 'rx_drug') {
      setTopChoice('drug');
      setPassedType(incoming);
    } else if (incoming.key === 'non_drug' || incoming.key === 'quasi_drug') {
      setTopChoice('non_drug');
      setPassedType(incoming); // 의약외품은 비의약품 하위 — 정밀 유형 보존(임의 강등 금지)
    }
    // unclassified/미전달은 사용자가 직접 선택
  }, [searchParams, embedded]);

  const selectTop = (choice: TopChoice) => {
    setTopChoice(choice);
    // 다른 상위 분기로 바꾸면 전달된 정밀 유형 폐기(사용자 override)
    setPassedType((prev) => {
      if (!prev) return null;
      const prevBucket: TopChoice =
        prev.key === 'otc_drug' || prev.key === 'rx_drug' ? 'drug' : 'non_drug';
      return prevBucket === choice ? prev : null;
    });
  };

  // 정식 Wizard 로 넘길 유효 유형/규제값 — 도우미는 상위만, 세부 미지정 의약품은 regulatoryType=DRUG 로만 전달.
  const effective = useMemo<{ productKey?: string; regulatoryType?: string }>(() => {
    if (topChoice === 'non_drug') {
      const keep =
        passedType && (passedType.key === 'non_drug' || passedType.key === 'quasi_drug')
          ? passedType
          : NON_DRUG;
      return { productKey: keep.key, regulatoryType: keep.regulatoryType || 'GENERAL' };
    }
    if (topChoice === 'drug') {
      const keep =
        passedType && (passedType.key === 'otc_drug' || passedType.key === 'rx_drug')
          ? passedType
          : null;
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

  const detailCandidates = useMemo(() => parsed?.detailImageCandidates ?? [], [parsed]);
  const transfer = useSupplierImportTransfers({
    onApplyDraft,
    navigate,
    sourceUrl,
    parsed,
    adminProduct,
    name,
    brand,
    manufacturer,
    specification,
    originCountry,
    price,
    detailDesc,
    setDetailDesc,
    selectedImages,
    thumbnailIdx,
    selectedDetailImages,
    setSelectedDetailImages,
    detailImagesConfirmed,
    setDetailImagesConfirmed,
    o4oCategoryId,
    o4oPriceGeneral,
    o4oIsPublic,
    o4oServiceKeys,
    o4oRegulatoryType,
    effective,
    detailCandidates,
  });
  const {
    navStatus,
    setNavStatus,
    navError,
    setNavError,
    imageCopyStatus,
    setImageCopyStatus,
    imageCopyError,
    setImageCopyError,
    handleNavigateToCreate,
    handleInsertDetailImages,
  } = transfer;
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
      setError(
        'Firstmall 관리자 상품 수정 페이지 HTML로 보이지 않습니다. 관리자에서 상품 수정 화면의 전체 HTML(Ctrl+U)을 복사해 주세요.',
      );
      return;
    }

    setError('');

    const admin = parseFirstmallAdmin(html, sourceUrl || undefined);
    setAdminProduct(admin);
    // 도메인 자동 감지 시 입력칸 prefill (사용자 확인용)
    if (!sourceUrl && admin.shopDomain) setSourceUrl(admin.shopDomain);

    const result = mapImportProduct(admin);
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
    setImgNaturalSizes({});

    // 상세설명 이미지: 정상 후보 기본 전체 선택(사용자가 해제 가능)
    setSelectedDetailImages(new Set((result.detailImageCandidates ?? []).map((_, i) => i)));
    setDetailImagesConfirmed(false);
    setImageCopyStatus('idle');
    setImageCopyError('');
    setNavStatus('idle');
    setNavError('');
  }, [
    html,
    sourceUrl,
    topChoice,
    setImageCopyStatus,
    setImageCopyError,
    setNavStatus,
    setNavError,
  ]);

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
    setImgNaturalSizes({});
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
  }, [setImageCopyStatus, setImageCopyError, setNavStatus, setNavError]);

  return {
    navigate,
    sourceUrl,
    setSourceUrl,
    html,
    setHtml,
    fileInputRef,
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
    mediaPickerTarget,
    setMediaPickerTarget,
    selectedImages,
    thumbnailIdx,
    setThumbnailIdx,
    imgNaturalSizes,
    setImgNaturalSizes,
    selectedDetailImages,
    setSelectedDetailImages,
    detailImagesConfirmed,
    setDetailImagesConfirmed,
    error,
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
    topChoice,
    passedType,
    selectTop,
    effective,
    flatCats,
    selectedCatIsRegulated,
    editorImageUpload,
    handleParse,
    handleFileLoad,
    toggleImage,
    detailCandidates,
    toggleDetailImage,
    selectAllDetailImages,
    clearAllDetailImages,
    handleReset,
    navStatus,
    setNavStatus,
    navError,
    setNavError,
    imageCopyStatus,
    setImageCopyStatus,
    imageCopyError,
    setImageCopyError,
    handleNavigateToCreate,
    handleInsertDetailImages,
  };
}
