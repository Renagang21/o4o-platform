/**
 * SupplierProductCreatePage - 공급자 신규 제품 검토 요청 (3-Step Wizard · Candidate 제출)
 *
 * WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1
 *
 * Step 1: 기본 정보 (상품명, 카테고리, 브랜드, 제조사, 바코드 optional, 규제)
 * Step 2: 기본 공급가 초안 (offerDraft — 승격 후 Offer 생성 시 참고)
 * Step 3: 이미지/설명/검토 요청
 *
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1:
 *   이 화면은 더 이상 ProductMaster/Offer 를 만들지 않는다. 제출 = POST /supplier/product-candidates (Candidate).
 *   운영자 검토·승격(Promotion Core) 후 Master 가 생성되고, 공급자는 그 Master 에 from-master 로 Offer 를 연결한다.
 *   이미지는 미디어 라이브러리(master-less 업로드)에 올린 URL 만 Candidate 에 보존한다 — Master 확정 전 ProductImage write 0.
 *   바코드 조회에서 기존 Master 가 발견되면 Candidate 를 만들지 않고 from-master 화면으로 보낸다.
 *   Import Assistant(상세페이지 소스 자동 입력) 초안도 같은 Candidate 흐름으로 제출된다.
 *
 * WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1:
 *   상세/성분 이미지 라이브러리 선택 + 에디터 이미지 기능 연결
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RichTextEditor, type MediaInsert } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import {
  supplierApi,
  productApi,
  type AdminMaster,
  type CategoryTreeItem,
} from '../../lib/api';
import { mediaApi } from '../../lib/api/media';
import { ProductForm, type ProductFormData } from '../../components/product';
import MediaPickerModal from '../../components/common/MediaPickerModal';
import SupplierActivationGate from '../../components/supplier/SupplierActivationGate';
import { loadAndClearDraft } from '../../lib/product-import/storage';
import { GuideBlock } from '@o4o/shared-space-ui';
// WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2
import { getSupplierProductType } from '../../lib/supplierProductTypes';
import { fetchGuidePageContent } from '../../api/guideContent';

const GUIDE_PAGE_KEY = 'supplier.product.editor';
const SERVICE_KEY = 'neture';

// WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1: 정보-우선 — 공급 방식은 승격 후 Offer 연결 시 설정
const STEPS = ['기본 정보', '기본 공급가(초안)', '이미지 / 설명'];

interface FormData {
  barcode: string;
  packagingName: string;
  marketingName: string;
  categoryId: string;
  brandName: string;
  manufacturerName: string;
  distributionType: string;
  serviceKeys: string[];
  priceGeneral: string;
  consumerReferencePrice: string;
  stockQty: string;
  regulatoryType: string;
  regulatoryName: string;
  mfdsPermitNumber: string;
  specification: string;
  originCountry: string;
  // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
  isFeatured: boolean;
}

function flattenCategories(
  categories: CategoryTreeItem[],
  depth = 0
): { id: string; name: string; depth: number; isRegulated: boolean }[] {
  const result: { id: string; name: string; depth: number; isRegulated: boolean }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth, isRegulated: cat.isRegulated });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1:
 * 실패 시 백엔드 error code 를 조치 가능한 한국어 안내로 바꾼다. 매핑에 없는 코드는 원문을 유지한다.
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1:
 *   Candidate 제출(POST /supplier/product-candidates) 오류 코드 기준으로 갱신.
 */
const CREATE_ERROR_MESSAGE: Record<string, string> = {
  SUPPLIER_NOT_ACTIVE: '공급자 계정이 아직 활성화되지 않았습니다. 승인 완료 후 요청할 수 있습니다.',
  SUPPLIER_NOT_FOUND: '공급자 정보를 찾을 수 없습니다. 공급자 등록 상태를 확인해 주세요.',
  CANDIDATE_NAME_REQUIRED: '상품명을 입력해 주세요.',
  INVALID_REGULATORY_TYPE: '선택한 규제 유형이 올바르지 않습니다.',
  DRUG_CATEGORY_REQUIRED: '의약품은 일반의약품/전문의약품 구분이 필요합니다. 제품 유형을 다시 선택해 주세요.',
  INVALID_CATEGORY_ID: '카테고리를 다시 선택해 주세요.',
  INVALID_BRAND_ID: '브랜드 정보가 올바르지 않습니다. 브랜드명을 다시 입력해 주세요.',
  INVALID_PRICE: '공급가/소비자 참고가는 0 이상의 숫자여야 합니다.',
  INVALID_URL: '이미지 주소가 올바르지 않습니다. 이미지를 다시 선택해 주세요.',
  TOO_MANY_IMAGES: '상세 이미지는 최대 20장까지 등록할 수 있습니다.',
  FIELD_TOO_LONG: '입력값이 허용 길이를 초과했습니다. 상품명·설명 길이를 줄여 주세요.',
  FORBIDDEN_FIELD: '허용되지 않은 항목이 포함되어 있습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.',
  INTERNAL_ERROR: '서버 오류로 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

function createErrorMessage(code: string | null | undefined, message?: string | null): string {
  if (!code) return '제품 정보 검토 요청에 실패했습니다.';
  return CREATE_ERROR_MESSAGE[code] ?? (message ? `${message} (${code})` : `제품 정보 검토 요청에 실패했습니다. (${code})`);
}

export default function SupplierProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoSearchDone = useRef(false);

  // WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1: Import Assistant에서 전달된 초안 읽기 (single-use)
  const importDraft = useMemo(() => loadAndClearDraft(), []);

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2: 진입에서 선택한 제품 유형
  const productType = useMemo(() => getSupplierProductType(searchParams.get('productType')), [searchParams]);
  // 의약품류(약국 대상) 또는 미분류 → 검토 중심(자동 공급오퍼/이벤트/펀딩 연결 제외)
  const isReviewOriented = !!productType && (productType.pharmacyTarget === true || productType.key === 'unclassified');
  // 검토 요청 완료 상태 (성공 시 Candidate 안내 패널 표시 — Master/Offer 는 아직 없다)
  const [registered, setRegistered] = useState<{ name: string; candidateId: string | null; identifierValue: string | null } | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    barcode: '',
    packagingName: '',
    // (query prefill 은 유지 — 기존 Master 선택은 이제 Product Library → from-master 화면이 담당한다)
    marketingName: importDraft?.marketingName ?? searchParams.get('name') ?? '',
    // WO-O4O-SUPPLIER-IMPORT-O4O-SETTINGS-STEP-V1: O4O 등록 설정 pre-fill
    categoryId: importDraft?.categoryId ?? searchParams.get('categoryId') ?? '',
    brandName: importDraft?.brandName ?? searchParams.get('brandName') ?? '',
    manufacturerName: importDraft?.manufacturerName ?? searchParams.get('manufacturerName') ?? '',
    distributionType: importDraft?.isPublic
      ? 'PUBLIC'
      : (importDraft?.serviceKeys?.length ? 'SERVICE' : 'PRIVATE'),
    serviceKeys: importDraft?.serviceKeys ?? [],
    priceGeneral: importDraft?.priceGeneral ?? '',
    consumerReferencePrice: importDraft?.consumerReferencePrice ?? '',
    stockQty: '',
    // WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1: 등록 진입에서 선택한 유형 prefill
    regulatoryType: importDraft?.regulatoryType ?? searchParams.get('regulatoryType') ?? 'GENERAL',
    regulatoryName: '',
    mfdsPermitNumber: '',
    specification: importDraft?.specification ?? '',
    originCountry: importDraft?.originCountry ?? '',
    // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
    isFeatured: false,
  });

  const [guideTitle, setGuideTitle] = useState<string | null>(null);
  const [guideDesc, setGuideDesc] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
      .then(sections => {
        if (cancelled) return;
        const raw = sections['guideblock-page-help'];
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.title) setGuideTitle(parsed.title);
          if (parsed.description) setGuideDesc(parsed.description);
          if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
        } catch { /* use fallback */ }
      })
      .catch(() => { /* use fallback */ });
    return () => { cancelled = true; };
  }, []);

  // Barcode search state
  const [searching, setSearching] = useState(false);
  const [master, setMaster] = useState<AdminMaster | null>(null);
  const [barcodeChecked, setBarcodeChecked] = useState(false);

  // Reference data
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  // 필수 선택 항목(카테고리) 조회 실패를 빈 select로 방치하지 않는다 — 오류+재시도, 제출 차단.
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoriesReloadKey, setCategoriesReloadKey] = useState(0);

  // Description editor — WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1: draft 초기값 지원
  const [consumerShortDesc, setConsumerShortDesc] = useState(
    importDraft?.consumerDetailDesc || importDraft?.consumerShortDesc || '',
  );

  // Images — WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: 3구역 분리
  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 라이브러리 선택 지원
  // WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 상세/성분도 라이브러리 지원
  type ThumbnailSource = { kind: 'file'; file: File; preview: string } | { kind: 'library'; url: string } | null;
  type ImageItem = { kind: 'file'; file: File; preview: string } | { kind: 'library'; url: string };

  function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, b64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)![1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], filename, { type: mime });
  }

  // WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1: draft 이미지 URL → library 항목으로 초기화
  // WO-NETURE-PRODUCT-IMPORT-ASSISTANT-USABILITY-FIX-V1: 보정 data URL 지원
  const [thumbnailSource, setThumbnailSource] = useState<ThumbnailSource>(() => {
    if (importDraft?.thumbnailCorrectedDataUrl) {
      const file = dataUrlToFile(importDraft.thumbnailCorrectedDataUrl, 'thumbnail-corrected.jpg');
      return { kind: 'file', file, preview: importDraft.thumbnailCorrectedDataUrl };
    }
    return importDraft?.thumbnailUrl ? { kind: 'library', url: importDraft.thumbnailUrl } : null;
  });
  const [showThumbnailPicker, setShowThumbnailPicker] = useState(false);
  const [contentItems, setContentItems] = useState<ImageItem[]>(
    importDraft?.contentImageUrls?.map((url) => ({ kind: 'library' as const, url })) ?? [],
  );
  // content 라이브러리 선택 대상
  const [imagePickerTarget, setImagePickerTarget] = useState<'content' | null>(null);
  // 에디터 인라인 이미지 라이브러리 선택 콜백
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((media: MediaInsert) => void) | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load categories on mount (재시도 가능)
  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(false);
    productApi.getCategories()
      .then((cats) => { if (!cancelled) setCategories(cats); })
      .catch(() => {
        // 조회 실패는 '카테고리 없음'이 아니다 — 오류 표시 후 재시도 가능.
        if (!cancelled) { setCategories([]); setCategoriesError(true); }
      })
      .finally(() => { if (!cancelled) setCategoriesLoading(false); });
    return () => { cancelled = true; };
  }, [categoriesReloadKey]);

  // Auto-search from URL barcode param
  useEffect(() => {
    const raw = searchParams.get('barcode');
    // 'null'/'undefined' 는 링크 생성 실수로 들어온 값이다 — 바코드로 조회하지 않는다.
    const barcodeParam = raw && raw !== 'null' && raw !== 'undefined' ? raw : null;
    if (barcodeParam && !autoSearchDone.current) {
      autoSearchDone.current = true;
      setForm((prev) => ({ ...prev, barcode: barcodeParam }));
      searchBarcode(barcodeParam);
    }
  }, [searchParams]);

  const flatCats = flattenCategories(categories);
  const selectedCategory = flatCats.find((c) => c.id === form.categoryId);
  const isRegulated = selectedCategory?.isRegulated ?? false;

  // Barcode search
  const searchBarcode = async (code?: string) => {
    const bc = (code || form.barcode).trim();
    if (!bc) return;
    setSearching(true);
    setMaster(null);
    setBarcodeChecked(false);

    try {
      const result = await productApi.getMasterByBarcode(bc);
      // 조회 성공 시에만 checked 처리(성공적으로 '없음'과 '조회 실패'를 구분).
      setBarcodeChecked(true);
      if (result) {
        setMaster(result);
        setForm((prev) => ({
          ...prev,
          marketingName: prev.marketingName || result.marketingName || result.regulatoryName || '',
          manufacturerName: prev.manufacturerName || result.manufacturerName || '',
        }));
      }
    } catch {
      // 조회 실패를 '새 상품'으로 오인시키지 않는다 — checked 미설정 + 안내.
      toast.error('바코드 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // WO-NETURE-SUPPLIER-PRODUCT-PRICE-INPUT-FIX-V1: stable initialData to prevent circular update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const productFormInitialData = useMemo(() => ({
    priceGeneral: form.priceGeneral ? Number(form.priceGeneral) : null,
    consumerReferencePrice: form.consumerReferencePrice ? Number(form.consumerReferencePrice) : null,
    stockQuantity: Number(form.stockQty) || 0,
    isPublic: form.distributionType === 'PUBLIC',
    distributionType: form.distributionType,
    serviceKeys: form.serviceKeys,
  }), [currentStep]); // only recompute when step changes (remount)

  // WO-O4O-NETURE-PRODUCT-FORM-UNIFICATION-V1: ProductForm onChange → parent form sync
  const handleProductFormChange = (data: ProductFormData) => {
    setForm((prev) => ({
      ...prev,
      priceGeneral: data.priceGeneral != null ? String(data.priceGeneral) : '',
      consumerReferencePrice: data.consumerReferencePrice != null ? String(data.consumerReferencePrice) : '',
      stockQty: data.stockQuantity ? String(data.stockQuantity) : '',
      distributionType: data.distributionType || prev.distributionType,
      serviceKeys: data.serviceKeys || prev.serviceKeys,
      // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
      isFeatured: data.isFeatured ?? prev.isFeatured,
    }));
  };

  // Step validation
  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!form.marketingName.trim()) return '상품명을 입력해주세요.';
      if (categoriesError) return '카테고리 목록을 불러오지 못했습니다. 카테고리 항목의 [다시 시도]로 목록을 불러온 뒤 진행해 주세요.';
      if (!form.categoryId) return '카테고리를 선택해주세요.';
      if (isRegulated && (!form.regulatoryType || !form.regulatoryName.trim())) {
        return '규제 카테고리 상품은 규제 유형과 규제명이 필수입니다.';
      }
    }
    if (step === 2) {
      const priceGeneral = Number(form.priceGeneral);
      if (!priceGeneral || priceGeneral <= 0) return '공급가를 입력해주세요.';
    }
    return null;
  };

  const goNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setSubmitError(error);
      return;
    }
    setSubmitError('');
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setSubmitError('');
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // 기존 Master 발견 시 — Candidate 대신 from-master(Offer 직접 연결)로 이동
  const goToFromMaster = () => {
    if (!master) return;
    navigate(`/supplier/products/from-master?masterId=${encodeURIComponent(master.id)}`, {
      state: {
        master: {
          id: master.id,
          barcode: master.barcode ?? null,
          name: master.marketingName || master.name || master.regulatoryName || '',
          regulatoryName: master.regulatoryName ?? '',
          regulatoryType: master.regulatoryType ?? null,
          manufacturerName: master.manufacturerName ?? '',
          specification: master.specification ?? null,
          category: master.categoryId ? { id: master.categoryId, name: selectedCategory?.name ?? '' } : null,
          brand: master.brandId ? { id: master.brandId, name: master.brandName ?? '' } : null,
          primaryImageUrl: null,
        },
      },
    });
  };

  // Submit — Candidate 제출 (Master/Offer 생성 없음)
  const handleSubmit = async () => {
    if (barcodeChecked && master) {
      setSubmitError('이미 등록된 제품입니다. [기존 제품에 공급 연결]로 진행해 주세요.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    // 1) 이미지: 파일은 미디어 라이브러리(master-less)에 먼저 업로드해 URL 로 바꾼다. 라이브러리 항목은 URL 그대로.
    //    실패한 파일은 Candidate 에서 제외하고 안내한다(제출 자체는 계속).
    let imageFailures = 0;
    let imageUrl: string | null = null;
    if (thumbnailSource?.kind === 'file') {
      const up = await mediaApi.upload(thumbnailSource.file, true, undefined, 'product-thumbnail');
      if (up.success && up.data?.url) imageUrl = up.data.url; else imageFailures += 1;
    } else if (thumbnailSource?.kind === 'library') {
      imageUrl = thumbnailSource.url;
    }
    const contentImageUrls: string[] = [];
    for (const item of contentItems) {
      if (item.kind === 'library') { contentImageUrls.push(item.url); continue; }
      const up = await mediaApi.upload(item.file, true, undefined, 'description');
      if (up.success && up.data?.url) contentImageUrls.push(up.data.url); else imageFailures += 1;
    }

    // 2) 규제 정보: 제품 유형(진입 선택) → regulatoryType/drugCategory. 규제 카테고리면 규제명·허가번호 포함.
    const regulatoryType = (productType?.regulatoryType || form.regulatoryType || 'GENERAL') as
      'GENERAL' | 'COSMETIC' | 'HEALTH_FUNCTIONAL' | 'QUASI_DRUG' | 'MEDICAL_DEVICE' | 'DRUG';
    const drugCategory = regulatoryType === 'DRUG' ? (productType?.drugCategory ?? 'otc') : null;
    const regulatoryName = (isRegulated ? form.regulatoryName : form.packagingName).trim() || null;

    const result = await supplierApi.submitProductCandidate({
      name: form.marketingName.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: form.categoryId || null,
      brandName: form.brandName.trim() || null,
      manufacturerName: form.manufacturerName.trim() || null,
      specification: form.specification.trim() || null,
      originCountry: form.originCountry.trim() || null,
      regulatoryType,
      drugCategory,
      regulatoryName,
      mfdsPermitNumber: isRegulated ? (form.mfdsPermitNumber.trim() || null) : null,
      imageUrl,
      contentImageUrls,
      offerDraft: {
        priceGeneral: form.priceGeneral ? Number(form.priceGeneral) : null,
        consumerReferencePrice: form.consumerReferencePrice ? Number(form.consumerReferencePrice) : null,
        consumerShortDescription: consumerShortDesc || null,
        // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
        isFeatured: form.isFeatured,
      },
    });
    setSubmitting(false);

    if (result.success) {
      if (imageFailures > 0) {
        toast.error(`검토 요청은 접수됐지만 이미지 ${imageFailures}건은 업로드되지 않아 제외됐습니다.`);
      }
      if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
      contentItems.forEach((item) => { if (item.kind === 'file') URL.revokeObjectURL(item.preview); });
      setRegistered({
        name: form.marketingName.trim(),
        candidateId: result.data?.candidateId ?? null,
        identifierValue: result.data?.identifierValue ?? null,
      });
    } else {
      setSubmitError(createErrorMessage(result.error, result.message));
    }
  };

  // Image handlers — WO-NETURE-IMAGE-ASSET-STRUCTURE-V1
  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 파일/라이브러리 통합
  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
    setThumbnailSource({ kind: 'file', file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const handleThumbnailFromLibrary = (asset: { url: string }) => {
    if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
    setThumbnailSource({ kind: 'library', url: asset.url });
    setShowThumbnailPicker(false);
  };

  const removeThumbnail = () => {
    if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
    setThumbnailSource(null);
  };

  // WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: ImageItem 기반 핸들러
  const handleMultiImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setItems: React.Dispatch<React.SetStateAction<ImageItem[]>>,
  ) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    const newItems: ImageItem[] = newFiles.map((f) => ({ kind: 'file' as const, file: f, preview: URL.createObjectURL(f) }));
    setItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeImageItem = (
    idx: number,
    items: ImageItem[],
    setItems: React.Dispatch<React.SetStateAction<ImageItem[]>>,
  ) => {
    const item = items[idx];
    if (item.kind === 'file') URL.revokeObjectURL(item.preview);
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // 에디터 인라인 이미지: masterId 없으므로 미디어 라이브러리에 업로드
  const editorImageUpload = useCallback(async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, undefined, 'description');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드 실패');
  }, []);

  // 검토 요청 완료 — Candidate 상태임을 분명히 한다 (Master/Offer 아직 없음 · HUB 미노출)
  if (registered) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h1 className="text-xl font-bold text-blue-800">제품 정보 검토 요청 완료</h1>
          <p className="text-sm text-blue-700 mt-1">
            <strong>{registered.name || '제품'}</strong>의 제품 정보가 검토 대기열에 접수되었습니다
            {productType ? ` (유형: ${productType.label})` : ''}.
          </p>
          <p className="text-xs text-blue-700/80 mt-2">
            아직 <strong>공급 상품(Offer)으로 등록된 것은 아닙니다.</strong> 운영자가 제품 정보를 검토해 표준 제품(ProductMaster)으로
            확정하면, 제품 라이브러리에서 해당 제품을 선택해 공급가·공급 방식을 설정하고 공급을 시작할 수 있습니다.
            {productType?.rx && ' 처방의약품은 승격 후에도 약국 대상 서비스 공급으로만 연결됩니다.'}
          </p>
          {(registered.candidateId || registered.identifierValue) && (
            <p className="mt-2 text-[11px] text-blue-600/70 font-mono">
              {registered.identifierValue ? `식별자 ${registered.identifierValue} · ` : ''}요청 ID {registered.candidateId ?? '-'}
            </p>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">다음 작업</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <button onClick={() => navigate('/supplier/products/register')} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50">
              다른 제품 검토 요청
            </button>
            <button onClick={() => navigate('/supplier/products/library')} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50">
              제품 라이브러리에서 기존 제품 공급 연결
            </button>
            <button onClick={() => navigate('/supplier/products')} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50">
              내 공급 상품 목록
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            검토 결과는 운영자 승격 후 제품 라이브러리 검색에 반영됩니다. 공급 오퍼·이벤트 오퍼·펀딩은 공급 상품 등록 후의 별도 활동입니다.
          </p>
        </div>
      </div>
    );
  }

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-SOURCE-IMPORT-ENTRY-AUDIT-V1:
  //   기존 Import Assistant(등록 도우미) 재연결 — 외부 상세페이지 소스를 붙여넣어 폼을 자동 채운다.
  //   입력 중인 값이 있으면 명시적 확인 후 이동(이동 시 현재 입력은 도우미 흐름으로 대체됨).
  const goToSourceImport = () => {
    const hasInput =
      !!form.marketingName.trim() ||
      !!form.packagingName.trim() ||
      !!form.brandName.trim() ||
      !!form.manufacturerName.trim() ||
      !!consumerShortDesc.trim();
    if (hasInput && !window.confirm('현재 입력한 내용이 있습니다. 상세페이지 소스 자동 입력으로 이동하면 지금까지 입력한 값은 저장되지 않습니다. 계속할까요?')) {
      return;
    }
    // WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-PRODUCT-TYPE-PASSTHROUGH-V1:
    //   앞 단계에서 선택된 제품 유형을 도우미로 전달 → 도우미가 미리 선택해 보여준다(재선택 불필요).
    const params = new URLSearchParams();
    if (productType) {
      params.set('productType', productType.key);
      if (productType.regulatoryType) params.set('regulatoryType', productType.regulatoryType);
    }
    const qs = params.toString();
    navigate(qs ? `/supplier/products/import-assistant?${qs}` : '/supplier/products/import-assistant');
  };

  return (
    <SupplierActivationGate mode="gate">
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">신규 제품 검토 요청</h1>
          <p className="text-slate-500 mt-1">아직 표준 제품에 없는 제품 정보를 제출합니다. 운영자 검토 후 공급 연결이 가능합니다.</p>
        </div>
        {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-SOURCE-IMPORT-ENTRY-AUDIT-V1: 소스 자동 입력 진입 복원 */}
        <button
          type="button"
          onClick={goToSourceImport}
          title="상품 상세페이지에서 '페이지 소스 보기'를 열어 소스 전체를 복사해 붙여넣으면, 추출 가능한 항목이 등록 폼에 자동 입력됩니다. 자동으로 채워진 내용은 등록 전 반드시 확인하세요."
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          ⚡ 상세페이지 소스로 자동 입력
        </button>
      </div>

      {/* GuideBlock */}
      <GuideBlock
        variant="info"
        title={guideTitle ?? '제품 정보를 검토 요청으로 제출합니다.'}
        description={guideDesc ?? '이 화면은 공급 상품을 바로 만들지 않습니다. 제출한 제품 정보는 운영자 검토 후 표준 제품으로 확정되며, 그 뒤 제품 라이브러리에서 선택해 공급가·공급 방식을 설정합니다. 이미 표준 제품에 있는 제품은 제품 라이브러리에서 바로 공급 연결하세요.'}
        steps={guideSteps ?? [
          'Step 1: 상품명, 카테고리, 브랜드, 규제 정보를 입력합니다 (바코드가 있으면 조회해 기존 제품 여부를 확인)',
          'Step 2: 기본 공급가 초안을 입력합니다 (승격 후 Offer 연결 시 참고값)',
          'Step 3: 대표 이미지와 상세 설명을 첨부하고 검토 요청을 제출합니다',
        ]}
        compact
      />

      {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2: 제품 유형별 안내/경고 */}
      {productType && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          productType.rx
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : isReviewOriented
              ? 'border-blue-200 bg-blue-50 text-blue-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}>
          <div className="font-semibold">선택한 제품 유형: {productType.label}</div>
          <p className="mt-1 leading-relaxed">
            {productType.key === 'non_drug' && '일반 매장 및 약국 매장 유형에 공급 가능한 일반 제품입니다.'}
            {productType.key === 'quasi_drug' && '의약외품입니다. 품목/신고 관련 정보 입력을 권장합니다.'}
            {productType.key === 'otc_drug' && '비처방 의약품(OTC)입니다. 약국 매장 유형 중심으로 검토되며, 일반 매장 노출·온라인 판매는 제한될 수 있습니다.'}
            {productType.key === 'rx_drug' && '처방의약품입니다. 일반 판매·고객 노출·이벤트 오퍼·유통참여형 펀딩으로 자동 연결되지 않으며, 운영자 검토 후 약국 대상 유통 정보 단위로만 관리됩니다.'}
            {productType.key === 'unclassified' && '분류가 확정되지 않은 제품입니다. 등록 후 운영자가 검토해 유형을 확정합니다.'}
          </p>
          {productType.pharmacyTarget && (
            <p className="mt-1 text-xs opacity-80">
              O4O는 유통 정보화 플랫폼으로, 의약품도 제품/유통 단위로만 다룹니다. 재고·유효기간·일련번호·이력추적은 입력받지 않습니다.
            </p>
          )}
        </div>
      )}

      {/* WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1: Import Assistant 초안 알림 */}
      {importDraft && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          Import Assistant에서 가져온 데이터입니다. 검토 후 등록해주세요.
        </div>
      )}

      {/* ==================== Step Indicator ==================== */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, idx) => {
          const step = idx + 1;
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          return (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
                isActive ? 'bg-emerald-600 text-white' :
                isDone ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-slate-400'
              }`}>
                {isDone ? '✓' : step}
              </div>
              <span className={`text-sm font-medium truncate ${
                isActive ? 'text-emerald-700' : isDone ? 'text-emerald-600' : 'text-slate-400'
              }`}>{label}</span>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ==================== Step 1: 기본 정보 ==================== */}
      {currentStep === 1 && (
        <>
          {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1: 정보-우선 안내 */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            먼저 <strong>상품 정보</strong>를 등록합니다. 공급 방식(전체 공개 / 서비스 공급)은 저장 후 상품 상세에서 별도로 설정할 수 있으며,
            공급 방식이 설정되기 전까지 이 상품은 <strong>HUB에 노출되지 않습니다</strong>.
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
              <p className="mt-1 text-xs text-slate-400">포장에 인쇄된 공식 상품명 (상품 식별 기준, 입력 권장)</p>
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
                  <p className="mt-0.5 text-xs text-red-600">카테고리는 필수 항목입니다. 다시 시도해 주세요.</p>
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
                <option value="">{categoriesLoading ? '카테고리 불러오는 중...' : '카테고리 선택'}</option>
                {flatCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {'\u00A0\u00A0'.repeat(cat.depth)}{cat.name}
                  </option>
                ))}
              </select>
              )}
              {isRegulated && (
                <p className="mt-1 text-sm text-amber-600">규제 카테고리 — 아래 규제 정보 입력이 필요합니다</p>
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
                <input
                  type="text"
                  name="brandName"
                  value={form.brandName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="브랜드명 입력 (자동 매칭/생성)"
                />
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
                  onChange={(e) => { handleChange(e); setBarcodeChecked(false); setMaster(null); }}
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
                    이미 등록된 제품입니다: <strong>{master.marketingName || master.name || master.regulatoryName}</strong>
                    {master.isMfdsVerified && ' (MFDS 검증됨)'}
                  </p>
                  <p className="text-xs text-emerald-700/80 mt-1">검토 요청 대신 기존 제품에 바로 공급을 연결하세요.</p>
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
      )}

      {/* ==================== Step 2: 기본 공급가 (WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1) ====================
           정보-우선: 등록 단계에서는 기본 공급가만 입력하고, 공급 방식(전체 공개/서비스 공급)은 등록 후 별도 설정한다. */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">기본 공급가 (초안)</h3>
          <p className="text-xs text-slate-500 mb-5">
            검토 요청에 함께 보관되는 <strong>참고 초안</strong>입니다. 실제 공급가·공급 방식·재고는 운영자 승격 후
            제품 라이브러리에서 공급 연결할 때 확정합니다.
          </p>
          <ProductForm
            mode="create"
            initialData={productFormInitialData}
            onChange={handleProductFormChange}
            hideDistribution
            hideStock
          />
        </div>
      )}

      {/* ==================== Step 3: 이미지 / 설명 / 등록 ==================== */}
      {currentStep === 3 && (
        <>
          {/* Images */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">상품 이미지</h3>

            {/* 1. 대표 이미지 (썸네일) — WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">대표 이미지 (썸네일)</span>
                <span className="text-xs text-slate-400">1000x1000 정사각형 권장, 최대 1장</span>
              </div>
              {thumbnailSource ? (
                <div className="relative group w-32 h-32 rounded-lg overflow-hidden border-2 border-emerald-300">
                  <img
                    src={thumbnailSource.kind === 'file' ? thumbnailSource.preview : thumbnailSource.url}
                    alt="썸네일 미리보기"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">대표</span>
                  <button type="button" onClick={removeThumbnail} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="block w-32 h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
                    <span className="text-slate-400 text-xs text-center">클릭하여<br />추가</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowThumbnailPicker(true)}
                    className="px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                  >
                    라이브러리에서<br />선택
                  </button>
                </div>
              )}
            </div>

            {/* 2. 성분/라벨 이미지 (콘텐츠) — WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">성분/라벨 이미지</span>
                <span className="text-xs text-slate-400">성분표, 라벨, 인증마크 등 (AI 텍스트 추출 대상)</span>
              </div>
              {contentItems.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {contentItems.map((item, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={item.kind === 'file' ? item.preview : item.url} alt={`콘텐츠 ${idx + 1}`} className="w-full h-full object-cover" />
                      {item.kind === 'library' && <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-[9px] px-1 py-0.5 rounded">LIB</span>}
                      <button type="button" onClick={() => removeImageItem(idx, contentItems, setContentItems)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex-1 block border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                  <input type="file" accept="image/*" multiple onChange={(e) => handleMultiImageSelect(e, setContentItems)} className="hidden" />
                  <div className="text-slate-400 text-sm">
                    <p className="font-medium">파일에서 추가</p>
                    {contentItems.length > 0 && <p className="mt-1 text-xs text-emerald-600">{contentItems.length}장 선택됨</p>}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setImagePickerTarget('content')}
                  className="px-4 py-3 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors whitespace-nowrap"
                >
                  라이브러리에서<br />선택
                </button>
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-semibold text-slate-800">소비자용 상품 설명</h3>
            <p className="text-xs text-slate-500">검토 요청과 함께 보관되며, 승격 후 Offer 연결 시 소비자용 설명 초안으로 사용됩니다.</p>

            {/* WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 에디터 이미지 기능 연결 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">소비자용 간이 설명</label>
              <RichTextEditor
                value={consumerShortDesc}
                onChange={(c) => setConsumerShortDesc(c.html)}
                placeholder="소비자에게 보이는 간이 설명을 입력하세요..."
                minHeight="120px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
              />
            </div>

          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">추가 정보 (선택)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">제품 규격</label>
                <input
                  type="text"
                  name="specification"
                  value={form.specification}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="예: 500mg x 60정"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">원산지</label>
                <input
                  type="text"
                  name="originCountry"
                  value={form.originCountry}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="예: 대한민국"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== Error / Navigation ==================== */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex gap-3">
        {currentStep > 1 ? (
          <button
            onClick={goBack}
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium"
          >
            이전
          </button>
        ) : (
          <button
            onClick={() => navigate('/supplier/products')}
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium"
          >
            취소
          </button>
        )}

        {currentStep < 3 ? (
          <button
            onClick={goNext}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
          >
            {submitting ? '요청 중...' : '제품 정보 검토 요청'}
          </button>
        )}
      </div>
      {/* WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 대표 이미지 라이브러리 선택 */}
      <MediaPickerModal
        open={showThumbnailPicker}
        onClose={() => setShowThumbnailPicker(false)}
        onSelect={handleThumbnailFromLibrary}
        title="대표 이미지 선택"
        defaultFolder="product-thumbnail"
      />
      {/* WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 성분 이미지 라이브러리 선택 */}
      <MediaPickerModal
        open={imagePickerTarget !== null}
        onClose={() => setImagePickerTarget(null)}
        onSelect={(asset) => {
          setContentItems(prev => [...prev, { kind: 'library', url: asset.url }]);
          setImagePickerTarget(null);
        }}
        title="성분/라벨 이미지 선택"
        defaultFolder="description"
      />
      {/* WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 에디터 인라인 이미지 라이브러리 선택 */}
      <MediaPickerModal
        open={!!mediaPickerTarget}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(asset) => {
          mediaPickerTarget?.({ type: 'image', url: asset.url, title: asset.originalName });
          setMediaPickerTarget(null);
        }}
        title="설명 이미지 선택"
        defaultFolder="description"
      />
    </div>
    </SupplierActivationGate>
  );
}
