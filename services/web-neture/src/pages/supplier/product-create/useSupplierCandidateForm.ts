import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  productApi,
  type AdminMaster,
  type BrandItem,
  type CategoryTreeItem,
} from '../../../lib/api';
import type { ProductFormData } from '../../../components/product';
import type { ImportDraft } from '../../../lib/product-import/types';
import { toast } from '@o4o/error-handling';
import { getSupplierProductType } from '../../../lib/supplierProductTypes';
import {
  applySupplierProductDraft,
  type SupplierProductApplyMode,
  type SupplierProductCandidateDraft,
} from '../../../lib/supplier-product-authoring';
import { flattenCategories, type SupplierCandidateForm } from './candidateFormHelpers';

export function useSupplierCandidateForm(importDraft: ImportDraft | null) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoSearchDone = useRef(false);

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2: 진입에서 선택한 제품 유형
  const productType = useMemo(
    () => getSupplierProductType(searchParams.get('productType')),
    [searchParams],
  );
  // 의약품류(약국 대상) 또는 미분류 → 검토 중심(자동 공급오퍼/이벤트/펀딩 연결 제외)
  const isReviewOriented =
    !!productType && (productType.pharmacyTarget === true || productType.key === 'unclassified');
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<SupplierCandidateForm>({
    barcode: '',
    packagingName: '',
    // (query prefill 은 유지 — 기존 Master 선택은 이제 Product Library → from-master 화면이 담당한다)
    marketingName: importDraft?.marketingName ?? searchParams.get('name') ?? '',
    // WO-O4O-SUPPLIER-IMPORT-O4O-SETTINGS-STEP-V1: O4O 등록 설정 pre-fill
    categoryId: importDraft?.categoryId ?? searchParams.get('categoryId') ?? '',
    brandId: '',
    brandName: importDraft?.brandName ?? searchParams.get('brandName') ?? '',
    manufacturerName: importDraft?.manufacturerName ?? searchParams.get('manufacturerName') ?? '',
    distributionType: importDraft?.isPublic
      ? 'PUBLIC'
      : importDraft?.serviceKeys?.length
        ? 'SERVICE'
        : 'PRIVATE',
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
  // WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.10: 브랜드 선택 목록(실패 시 텍스트 입력만)
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // Description editor — WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1: draft 초기값 지원
  const [consumerShortDesc, setConsumerShortDesc] = useState(
    importDraft?.consumerDetailDesc || importDraft?.consumerShortDesc || '',
  );

  const [submitError, setSubmitError] = useState('');
  // Load categories on mount (재시도 가능)
  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(false);
    productApi
      .getCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {
        // 조회 실패는 '카테고리 없음'이 아니다 — 오류 표시 후 재시도 가능.
        if (!cancelled) {
          setCategories([]);
          setCategoriesError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoriesReloadKey]);

  useEffect(() => {
    let cancelled = false;
    productApi.getBrands().then((list) => {
      if (!cancelled) setBrands(list.filter((b) => b.isActive !== false));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const flatCats = flattenCategories(categories);
  const selectedCategory = flatCats.find((c) => c.id === form.categoryId);
  const isRegulated = selectedCategory?.isRegulated ?? false;

  // Barcode search
  const searchBarcode = useCallback(
    async (code?: string) => {
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
            marketingName:
              prev.marketingName || result.marketingName || result.regulatoryName || '',
            manufacturerName: prev.manufacturerName || result.manufacturerName || '',
          }));
        }
      } catch {
        // 조회 실패를 '새 상품'으로 오인시키지 않는다 — checked 미설정 + 안내.
        toast.error('바코드 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setSearching(false);
      }
    },
    [form.barcode],
  );

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
  }, [searchParams, searchBarcode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.3:
  //   검증된 Draft → 폼(저장 없음). regulatoryType 은 진입 유형이 있으면 잠근다.
  //   바코드가 새로 채워지면 기존 Master 조회 → 발견 시 [기존 제품에 공급 연결] 안내(Candidate 대신 from-master).
  const handleApplyDraft = (
    draft: SupplierProductCandidateDraft,
    mode: SupplierProductApplyMode,
  ): string[] => {
    const result = applySupplierProductDraft(form, draft, {
      mode,
      lockRegulatoryType: !!productType?.regulatoryType,
      currentDescription: consumerShortDesc,
    });
    setForm(result.form);
    if (result.description !== null) setConsumerShortDesc(result.description);
    const notes = [...result.notes];
    if (result.changedFields.includes('barcode') && result.form.barcode.trim()) {
      setBarcodeChecked(false);
      setMaster(null);
      void searchBarcode(result.form.barcode);
      notes.push(
        '바코드로 기존 표준 제품 여부를 조회합니다. 이미 있는 제품이면 검토 요청 대신 공급 연결로 안내합니다.',
      );
    }
    if (result.changedFields.length === 0)
      notes.push('적용할 새 값이 없습니다(빈 칸이 없거나 결과가 모두 null).');
    return notes;
  };

  // WO-NETURE-SUPPLIER-PRODUCT-PRICE-INPUT-FIX-V1: stable initialData to prevent circular update
  // Snapshot per step: typing in ProductForm must not replace its initialData.
  const priceSnapshot = useRef<{ step: number; data: Partial<ProductFormData> } | null>(null);
  if (!priceSnapshot.current || priceSnapshot.current.step !== currentStep) {
    priceSnapshot.current = {
      step: currentStep,
      data: {
        priceGeneral: form.priceGeneral ? Number(form.priceGeneral) : null,
        consumerReferencePrice: form.consumerReferencePrice
          ? Number(form.consumerReferencePrice)
          : null,
        stockQuantity: Number(form.stockQty) || 0,
        isPublic: form.distributionType === 'PUBLIC',
        distributionType: form.distributionType,
        serviceKeys: form.serviceKeys,
      },
    };
  }
  const productFormInitialData = priceSnapshot.current.data;

  // WO-O4O-NETURE-PRODUCT-FORM-UNIFICATION-V1: ProductForm onChange → parent form sync
  const handleProductFormChange = (data: ProductFormData) => {
    setForm((prev) => ({
      ...prev,
      priceGeneral: data.priceGeneral != null ? String(data.priceGeneral) : '',
      consumerReferencePrice:
        data.consumerReferencePrice != null ? String(data.consumerReferencePrice) : '',
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
      if (categoriesError)
        return '카테고리 목록을 불러오지 못했습니다. 카테고리 항목의 [다시 시도]로 목록을 불러온 뒤 진행해 주세요.';
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
          category: master.categoryId
            ? { id: master.categoryId, name: selectedCategory?.name ?? '' }
            : null,
          brand: master.brandId ? { id: master.brandId, name: master.brandName ?? '' } : null,
          primaryImageUrl: null,
        },
      },
    });
  };

  // WO-O4O-NETURE-SUPPLIER-PRODUCT-SOURCE-IMPORT-ENTRY-AUDIT-V1:
  //   기존 Import Assistant(등록 도우미) 재연결 — 외부 상세페이지 소스를 붙여넣어 폼을 자동 채운다.
  // 같은 폼을 유지한 채 도우미를 연다. 초안·파일·AI 결과를 저장소에 복제하지 않는다.
  const [sourceImportOpen, setSourceImportOpen] = useState(false);
  const goToSourceImport = () => setSourceImportOpen(true);
  const applySourceImport = (draft: ImportDraft) => {
    setForm((prev) => ({ ...prev,
      marketingName: prev.marketingName || draft.marketingName,
      brandName: prev.brandName || draft.brandName,
      manufacturerName: prev.manufacturerName || draft.manufacturerName,
      specification: prev.specification || draft.specification,
      originCountry: prev.originCountry || draft.originCountry,
      categoryId: prev.categoryId || draft.categoryId || '',
      priceGeneral: prev.priceGeneral || draft.priceGeneral || '',
      consumerReferencePrice: prev.consumerReferencePrice || draft.consumerReferencePrice,
      regulatoryType: prev.regulatoryType,
    }));
    setConsumerShortDesc((prev) => prev || draft.consumerDetailDesc || draft.consumerShortDesc);
    setCurrentStep(1);
    setSourceImportOpen(false);
  };

  return {
    navigate,
    productType,
    isReviewOriented,
    currentStep,
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
    consumerShortDesc,
    setConsumerShortDesc,
    submitError,
    setSubmitError,
    flatCats,
    isRegulated,
    searchBarcode,
    handleChange,
    handleApplyDraft,
    productFormInitialData,
    handleProductFormChange,
    goNext,
    goBack,
    goToFromMaster,
    goToSourceImport,
    sourceImportOpen,
    setSourceImportOpen,
    applySourceImport,
  };
}
