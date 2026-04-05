/**
 * SupplierProductCreatePage - 공급자 상품 등록 (3-Step Wizard)
 *
 * WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1
 * WO-O4O-TEMPLATE-ADOPTION-NETURE-PRODUCT-V1: 상세 설명 에디터에 템플릿 기능 연결
 *
 * Step 1: 기본 정보 (상품명, 카테고리, 브랜드, 제조사, 바코드 optional, 규제)
 * Step 2: 가격/유통/서비스 (공급가, 소비자참고가, 유통정책, 서비스선택)
 * Step 3: 이미지/설명/등록
 *
 * WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1:
 *   상세/성분 이미지 라이브러리 선택 + 에디터 이미지 기능 연결
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import {
  supplierApi,
  productApi,
  type AdminMaster,
  type CategoryTreeItem,
} from '../../lib/api';
import { mediaApi } from '../../lib/api/media';
import { ProductForm, type ProductFormData } from '../../components/product';
import { useContentTemplates } from '../../hooks/useContentTemplates';
import { useAuth } from '../../contexts';
import MediaPickerModal from '../../components/common/MediaPickerModal';

const STEPS = ['기본 정보', '가격 / 유통', '이미지 / 설명'];

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

export default function SupplierProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoSearchDone = useRef(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    barcode: '',
    packagingName: '',
    marketingName: '',
    categoryId: '',
    brandName: '',
    manufacturerName: '',
    distributionType: 'PRIVATE',
    serviceKeys: [],
    priceGeneral: '',
    consumerReferencePrice: '',
    stockQty: '',
    regulatoryType: 'GENERAL',
    regulatoryName: '',
    mfdsPermitNumber: '',
    specification: '',
    originCountry: '',
  });

  // Barcode search state
  const [searching, setSearching] = useState(false);
  const [master, setMaster] = useState<AdminMaster | null>(null);
  const [barcodeChecked, setBarcodeChecked] = useState(false);

  // Reference data
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);

  // Description editors
  const [consumerShortDesc, setConsumerShortDesc] = useState('');
  const [consumerDetailDesc, setConsumerDetailDesc] = useState('');

  // Images — WO-NETURE-IMAGE-ASSET-STRUCTURE-V1: 3구역 분리
  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 라이브러리 선택 지원
  // WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 상세/성분도 라이브러리 지원
  type ThumbnailSource = { kind: 'file'; file: File; preview: string } | { kind: 'library'; url: string } | null;
  type ImageItem = { kind: 'file'; file: File; preview: string } | { kind: 'library'; url: string };
  const [thumbnailSource, setThumbnailSource] = useState<ThumbnailSource>(null);
  const [showThumbnailPicker, setShowThumbnailPicker] = useState(false);
  const [detailItems, setDetailItems] = useState<ImageItem[]>([]);
  const [contentItems, setContentItems] = useState<ImageItem[]>([]);
  // detail/content 라이브러리 선택 대상
  const [imagePickerTarget, setImagePickerTarget] = useState<'detail' | 'content' | null>(null);
  // 에디터 인라인 이미지 라이브러리 선택 콜백
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((url: string) => void) | null>(null);

  // Template integration (WO-O4O-TEMPLATE-ADOPTION-NETURE-PRODUCT-V1)
  const { user } = useAuth();
  const tpl = useContentTemplates();
  const canCreatePublicTemplate = user?.roles?.some(
    (r: string) => r.includes('admin') || r.includes('operator') || r.includes('super_admin'),
  ) ?? false;

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load categories on mount
  useEffect(() => {
    productApi.getCategories().then(setCategories);
  }, []);

  // Auto-search from URL barcode param
  useEffect(() => {
    const barcodeParam = searchParams.get('barcode');
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

    const result = await productApi.getMasterByBarcode(bc);
    setSearching(false);
    setBarcodeChecked(true);

    if (result) {
      setMaster(result);
      setForm((prev) => ({
        ...prev,
        marketingName: prev.marketingName || result.marketingName || result.regulatoryName || '',
        manufacturerName: prev.manufacturerName || result.manufacturerName || '',
      }));
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
    }));
  };

  // Step validation
  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!form.marketingName.trim()) return '상품명을 입력해주세요.';
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

  // Submit
  const handleSubmit = async () => {
    // Final validation
    if (form.distributionType === 'PUBLIC' && !consumerShortDesc.trim()) {
      setSubmitError('공개(PUBLIC) 유통 시 소비자용 간이 설명이 필수입니다.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const manualData: Record<string, any> = {};
    if (form.packagingName) manualData.regulatoryName = form.packagingName;
    // regulatoryType은 항상 저장
    manualData.regulatoryType = form.regulatoryType || 'GENERAL';
    if (isRegulated) {
      manualData.regulatoryName = form.regulatoryName;
      manualData.mfdsPermitNumber = form.mfdsPermitNumber || null;
    }
    if (form.manufacturerName) manualData.manufacturerName = form.manufacturerName;
    if (form.specification) manualData.specification = form.specification;
    if (form.originCountry) manualData.originCountry = form.originCountry;
    if (form.stockQty) manualData.stockQty = Number(form.stockQty);

    const result = await supplierApi.createProduct({
      barcode: form.barcode.trim() || undefined,
      marketingName: form.marketingName.trim(),
      categoryId: form.categoryId,
      brandName: form.brandName.trim() || undefined,
      distributionType: form.distributionType,
      serviceKeys: form.serviceKeys.length > 0 ? form.serviceKeys : undefined,
      manualData: Object.keys(manualData).length > 0 ? manualData : undefined,
      priceGeneral: Number(form.priceGeneral),
      consumerReferencePrice: form.consumerReferencePrice ? Number(form.consumerReferencePrice) : null,
      consumerShortDescription: consumerShortDesc || null,
      consumerDetailDescription: consumerDetailDesc || null,
    });
    setSubmitting(false);

    if (result.success) {
      const masterId = result.data?.masterId;
      if (masterId) {
        // 대표 이미지: 파일 업로드 또는 라이브러리 URL 등록
        if (thumbnailSource?.kind === 'file') {
          await productApi.uploadProductImage(masterId, thumbnailSource.file, 'thumbnail');
        } else if (thumbnailSource?.kind === 'library') {
          await productApi.registerImageFromUrl(masterId, thumbnailSource.url, 'thumbnail');
        }
        // WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: file/library 분기
        for (const item of detailItems) {
          if (item.kind === 'file') {
            await productApi.uploadProductImage(masterId, item.file, 'detail');
          } else {
            await productApi.registerImageFromUrl(masterId, item.url, 'detail');
          }
        }
        for (const item of contentItems) {
          if (item.kind === 'file') {
            await productApi.uploadProductImage(masterId, item.file, 'content');
          } else {
            await productApi.registerImageFromUrl(masterId, item.url, 'content');
          }
        }
      }
      if (thumbnailSource?.kind === 'file') URL.revokeObjectURL(thumbnailSource.preview);
      detailItems.forEach((item) => { if (item.kind === 'file') URL.revokeObjectURL(item.preview); });
      contentItems.forEach((item) => { if (item.kind === 'file') URL.revokeObjectURL(item.preview); });
      navigate('/supplier/products');
    } else {
      setSubmitError(result.error || '상품 등록에 실패했습니다.');
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">상품 등록</h1>
        <p className="text-slate-500 mt-1">상품 정보를 입력하여 새 상품을 등록합니다</p>
      </div>

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
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">카테고리 선택</option>
                {flatCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {'\u00A0\u00A0'.repeat(cat.depth)}{cat.name}
                  </option>
                ))}
              </select>
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
                <p className="mt-1 text-sm text-emerald-600">
                  기존 Master 발견: {master.marketingName || master.regulatoryName}
                  {master.isMfdsVerified && ' (MFDS 검증됨)'}
                </p>
              )}
              {barcodeChecked && !master && (
                <p className="mt-1 text-sm text-amber-600">
                  새 상품 — Master가 자동 생성됩니다
                </p>
              )}
              {!form.barcode.trim() && (
                <p className="mt-1 text-xs text-slate-400">
                  바코드를 입력하지 않으면 내부 코드가 자동 생성됩니다
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

      {/* ==================== Step 2: 가격 / 유통 / 서비스 (WO-O4O-NETURE-PRODUCT-FORM-UNIFICATION-V1) ==================== */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-5">가격 / 유통 / 서비스</h3>
          <ProductForm
            mode="create"
            initialData={productFormInitialData}
            onChange={handleProductFormChange}
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

            {/* 2. 상세 이미지 — WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">상세 이미지</span>
                <span className="text-xs text-slate-400">상품 다각도, 포장 등 (여러 장 가능)</span>
              </div>
              {detailItems.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {detailItems.map((item, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={item.kind === 'file' ? item.preview : item.url} alt={`상세 ${idx + 1}`} className="w-full h-full object-cover" />
                      {item.kind === 'library' && <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-[9px] px-1 py-0.5 rounded">LIB</span>}
                      <button type="button" onClick={() => removeImageItem(idx, detailItems, setDetailItems)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex-1 block border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                  <input type="file" accept="image/*" multiple onChange={(e) => handleMultiImageSelect(e, setDetailItems)} className="hidden" />
                  <div className="text-slate-400 text-sm">
                    <p className="font-medium">파일에서 추가</p>
                    {detailItems.length > 0 && <p className="mt-1 text-xs text-emerald-600">{detailItems.length}장 선택됨</p>}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setImagePickerTarget('detail')}
                  className="px-4 py-3 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors whitespace-nowrap"
                >
                  라이브러리에서<br />선택
                </button>
              </div>
            </div>

            {/* 3. 성분/라벨 이미지 (콘텐츠) — WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1 */}
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
            {form.distributionType === 'PUBLIC' && (
              <p className="text-sm text-amber-600">공개(PUBLIC) 유통 시 간이 설명은 필수입니다</p>
            )}

            {/* WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 에디터 이미지 기능 연결 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">소비자용 간이 설명</label>
              <RichTextEditor
                value={consumerShortDesc}
                onChange={(c) => setConsumerShortDesc(c.html)}
                placeholder="소비자에게 보이는 간이 설명을 입력하세요..."
                minHeight="120px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">소비자용 상세 설명</label>
              <RichTextEditor
                value={consumerDetailDesc}
                onChange={(c) => setConsumerDetailDesc(c.html)}
                placeholder="소비자에게 보이는 상세 설명을 입력하세요..."
                minHeight="200px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
                showTemplateActions
                templates={tpl.templates}
                templatesLoading={tpl.loading}
                templatesSaving={tpl.saving}
                onLoadTemplates={tpl.loadTemplates}
                onSaveAsTemplate={(name, category, isPublic) =>
                  tpl.saveTemplate(consumerDetailDesc, name, category, isPublic)
                }
                onUseTemplate={tpl.recordUse}
                canCreatePublicTemplate={canCreatePublicTemplate}
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
            {submitting ? '등록중...' : '상품 등록'}
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
      {/* WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 상세/성분 이미지 라이브러리 선택 */}
      <MediaPickerModal
        open={imagePickerTarget !== null}
        onClose={() => setImagePickerTarget(null)}
        onSelect={(asset) => {
          if (imagePickerTarget === 'detail') {
            setDetailItems(prev => [...prev, { kind: 'library', url: asset.url }]);
          } else if (imagePickerTarget === 'content') {
            setContentItems(prev => [...prev, { kind: 'library', url: asset.url }]);
          }
          setImagePickerTarget(null);
        }}
        title={imagePickerTarget === 'detail' ? '상세 이미지 선택' : '성분/라벨 이미지 선택'}
        defaultFolder="description"
      />
      {/* WO-NETURE-SUPPLIER-CREATE-IMAGE-LIBRARY-ALIGNMENT-V1: 에디터 인라인 이미지 라이브러리 선택 */}
      <MediaPickerModal
        open={!!mediaPickerTarget}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(asset) => {
          mediaPickerTarget?.(asset.url);
          setMediaPickerTarget(null);
        }}
        title="설명 이미지 선택"
        defaultFolder="description"
      />
    </div>
  );
}
