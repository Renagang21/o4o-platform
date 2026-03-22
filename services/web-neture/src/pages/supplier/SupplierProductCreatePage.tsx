/**
 * SupplierProductCreatePage - 공급자 상품 등록 (3-Step Wizard)
 *
 * WO-O4O-SUPPLIER-PRODUCT-CREATE-PAGE-V1
 *
 * Step 1: 바코드 조회
 * Step 2: ProductMaster 정보 입력 (master 없을 때만)
 * Step 3: Offer 정보 (가격, 유통방식)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import {
  supplierApi,
  productApi,
  type AdminMaster,
  type CategoryTreeItem,
  type BrandItem,
} from '../../lib/api';

type Step = 'barcode' | 'master' | 'offer';

interface MasterFormData {
  marketingName: string;
  regulatoryType: string;
  regulatoryName: string;
  manufacturerName: string;
  mfdsPermitNumber: string;
  categoryId: string;
  brandId: string;
  specification: string;
  originCountry: string;
  tags: string;
}

interface OfferFormData {
  priceGeneral: string;
  consumerReferencePrice: string;
  distributionType: string;
}

// Flatten category tree for select dropdown
function flattenCategories(
  categories: CategoryTreeItem[],
  depth = 0
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

export default function SupplierProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>('barcode');
  const autoSearchDone = useRef(false);

  // Step 1: Barcode
  const [barcode, setBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [master, setMaster] = useState<AdminMaster | null>(null);
  const [masterNotFound, setMasterNotFound] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Step 2: Master form
  const [masterForm, setMasterForm] = useState<MasterFormData>({
    marketingName: '',
    regulatoryType: '건강기능식품',
    regulatoryName: '',
    manufacturerName: '',
    mfdsPermitNumber: '',
    categoryId: '',
    brandId: '',
    specification: '',
    originCountry: '',
    tags: '',
  });

  // Step 3: Offer form
  const [offerForm, setOfferForm] = useState<OfferFormData>({
    priceGeneral: '',
    consumerReferencePrice: '',
    distributionType: 'PUBLIC',
  });

  // Reference data
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  const [consumerShortDesc, setConsumerShortDesc] = useState('');
  const [consumerDetailDesc, setConsumerDetailDesc] = useState('');

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Load categories and brands on mount
  useEffect(() => {
    productApi.getCategories().then(setCategories);
    productApi.getBrands().then(setBrands);
  }, []);

  // WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1: Auto-search from URL barcode param
  useEffect(() => {
    const barcodeParam = searchParams.get('barcode');
    if (barcodeParam && !autoSearchDone.current) {
      autoSearchDone.current = true;
      setBarcode(barcodeParam);
      // Trigger search
      (async () => {
        setSearching(true);
        setSearchError('');
        setMaster(null);
        setMasterNotFound(false);
        const result = await productApi.getMasterByBarcode(barcodeParam.trim());
        setSearching(false);
        if (result) {
          setMaster(result);
          setStep('offer');
        } else {
          setMasterNotFound(true);
        }
      })();
    }
  }, [searchParams]);

  const flatCats = flattenCategories(categories);

  // Step 1: Search barcode
  const handleSearch = async () => {
    if (!barcode.trim()) return;
    setSearching(true);
    setSearchError('');
    setMaster(null);
    setMasterNotFound(false);

    const result = await productApi.getMasterByBarcode(barcode.trim());
    setSearching(false);

    if (result) {
      setMaster(result);
      setStep('offer'); // Master exists → skip to offer
    } else {
      setMasterNotFound(true);
      // Pre-fill barcode info hint
      setSearchError('');
    }
  };

  // Step 1 → Step 2: Go to manual master creation
  const goToMasterStep = () => {
    setStep('master');
  };

  // Step 2 → Step 3
  const goToOfferStep = () => {
    // Validate required fields
    if (!masterForm.regulatoryName.trim() || !masterForm.manufacturerName.trim()) {
      return;
    }
    setStep('offer');
  };

  // Step 3: Submit
  const handleSubmit = async () => {
    const priceGeneral = Number(offerForm.priceGeneral);
    if (!priceGeneral || priceGeneral <= 0) {
      setSubmitError('일반 공급가를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const manualData = !master ? {
      regulatoryType: masterForm.regulatoryType,
      regulatoryName: masterForm.regulatoryName,
      manufacturerName: masterForm.manufacturerName,
      marketingName: masterForm.marketingName || undefined,
      mfdsPermitNumber: masterForm.mfdsPermitNumber || undefined,
      categoryId: masterForm.categoryId || null,
      brandId: masterForm.brandId || null,
      specification: masterForm.specification || null,
      originCountry: masterForm.originCountry || null,
      tags: masterForm.tags ? masterForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    } : undefined;

    const result = await supplierApi.createProduct({
      barcode: barcode.trim(),
      distributionType: offerForm.distributionType,
      manualData,
      priceGeneral,
      consumerReferencePrice: offerForm.consumerReferencePrice ? Number(offerForm.consumerReferencePrice) : null,
      consumerShortDescription: consumerShortDesc || null,
      consumerDetailDescription: consumerDetailDesc || null,
    });
    setSubmitting(false);

    if (result.success) {
      // Upload images if any (after offer creation to get masterId)
      const masterId = result.data?.masterId;
      if (masterId && imageFiles.length > 0) {
        let uploadFailed = 0;
        for (const file of imageFiles) {
          const uploadResult = await productApi.uploadProductImage(masterId, file);
          if (!uploadResult.success) uploadFailed++;
        }
        if (uploadFailed > 0) {
          console.warn(`[Image Upload] ${uploadFailed}/${imageFiles.length} images failed to upload`);
        }
      }
      // Cleanup previews
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      navigate('/workspace/supplier/products');
    } else {
      setSubmitError(result.error || '상품 등록에 실패했습니다.');
    }
  };

  // Image handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;

    setImageFiles((prev) => [...prev, ...newFiles]);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMasterForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOfferChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOfferForm((prev) => ({ ...prev, [name]: value }));
  };

  // Step indicator
  const steps = [
    { key: 'barcode', label: '바코드 조회' },
    { key: 'master', label: 'Master 정보' },
    { key: 'offer', label: 'Offer 등록' },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">상품 등록</h1>
        <p className="text-slate-500 mt-1">바코드를 입력하여 새 상품을 등록합니다</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${idx <= currentIdx ? 'text-emerald-600' : 'text-slate-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                idx <= currentIdx ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{idx + 1}</span>
              <span className="text-sm font-medium whitespace-nowrap">{s.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* ==================== Step 1: Barcode ==================== */}
      {step === 'barcode' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">바코드</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={barcode}
                onChange={(e) => { setBarcode(e.target.value); setMasterNotFound(false); setSearchError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="상품 바코드를 입력하세요"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-mono"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching || !barcode.trim()}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
              >
                {searching ? '검색중...' : '검색'}
              </button>
            </div>
          </div>

          {searchError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {searchError}
            </div>
          )}

          {masterNotFound && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <p className="text-sm text-amber-800 font-medium">
                해당 바코드의 ProductMaster가 없습니다.
              </p>
              <p className="text-sm text-amber-700">
                직접 상품 정보를 입력하여 새 Master를 생성할 수 있습니다.
              </p>
              <button
                onClick={goToMasterStep}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
              >
                직접 입력하기
              </button>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
            <p>바코드를 입력하면 ProductMaster에서 상품 정보를 자동으로 조회합니다.</p>
            <p className="mt-1">등록되지 않은 바코드는 직접 정보를 입력하여 새로 생성할 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* ==================== Step 2: Master Info (new master only) ==================== */}
      {step === 'master' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">ProductMaster 정보 입력</h3>
              <p className="text-sm text-slate-500 mt-1">바코드: <span className="font-mono">{barcode}</span></p>
            </div>

            {/* Required fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  마케팅명
                </label>
                <input
                  type="text"
                  name="marketingName"
                  value={masterForm.marketingName}
                  onChange={handleMasterChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="소비자에게 노출되는 상품명"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    규제 유형 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="regulatoryType"
                    value={masterForm.regulatoryType}
                    onChange={handleMasterChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="건강기능식품">건강기능식품</option>
                    <option value="의약외품">의약외품</option>
                    <option value="화장품">화장품</option>
                    <option value="의료기기">의료기기</option>
                    <option value="일반">일반</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    허가번호
                  </label>
                  <input
                    type="text"
                    name="mfdsPermitNumber"
                    value={masterForm.mfdsPermitNumber}
                    onChange={handleMasterChange}
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
                  value={masterForm.regulatoryName}
                  onChange={handleMasterChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="식약처에 등록된 공식 제품명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  제조사 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="manufacturerName"
                  value={masterForm.manufacturerName}
                  onChange={handleMasterChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="제조사명"
                />
              </div>
            </div>

            {/* Extended fields */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium text-slate-600">추가 정보 (선택)</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
                  <select
                    name="categoryId"
                    value={masterForm.categoryId}
                    onChange={handleMasterChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">미지정</option>
                    {flatCats.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {'  '.repeat(cat.depth)}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">브랜드</label>
                  <select
                    name="brandId"
                    value={masterForm.brandId}
                    onChange={handleMasterChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">미지정</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">제품 규격</label>
                  <input
                    type="text"
                    name="specification"
                    value={masterForm.specification}
                    onChange={handleMasterChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="예: 500mg × 60정"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">원산지</label>
                  <input
                    type="text"
                    name="originCountry"
                    value={masterForm.originCountry}
                    onChange={handleMasterChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="예: 대한민국"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">태그</label>
                <input
                  type="text"
                  name="tags"
                  value={masterForm.tags}
                  onChange={handleMasterChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="쉼표로 구분 (예: 비타민, 건강, 영양제)"
                />
              </div>
            </div>

            {/* Image upload */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-slate-600 mb-2">상품 이미지</h4>

              {/* Preview grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={src} alt={`미리보기 ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                          대표
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <label className="block border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div className="text-slate-400 text-sm">
                  <p className="font-medium">클릭하여 이미지 추가</p>
                  <p className="mt-1 text-xs">JPG, PNG, WebP (최대 10MB)</p>
                  {imagePreviews.length > 0 && (
                    <p className="mt-1 text-xs text-emerald-600">{imagePreviews.length}장 선택됨 · 첫 번째가 대표 이미지</p>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('barcode'); setMasterNotFound(false); }}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium"
            >
              이전
            </button>
            <button
              onClick={goToOfferStep}
              disabled={!masterForm.regulatoryName.trim() || !masterForm.manufacturerName.trim()}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* ==================== Step 3: Offer ==================== */}
      {step === 'offer' && (
        <div className="space-y-4">
          {/* Master summary */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-6 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800">상품 정보 요약</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">바코드</p>
                <p className="font-mono text-slate-800">{barcode}</p>
              </div>
              <div>
                <p className="text-slate-500">상품명</p>
                <p className="font-medium text-slate-800">
                  {master ? (master.marketingName || master.regulatoryName) : (masterForm.marketingName || masterForm.regulatoryName)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">카테고리</p>
                <p className="text-slate-800">
                  {master
                    ? (master.category?.name || '-')
                    : (flatCats.find((c) => c.id === masterForm.categoryId)?.name || '-')}
                </p>
              </div>
              <div>
                <p className="text-slate-500">브랜드</p>
                <p className="text-slate-800">
                  {master
                    ? (master.brand?.name || master.brandName || '-')
                    : (brands.find((b) => b.id === masterForm.brandId)?.name || '-')}
                </p>
              </div>
            </div>
            {master && (
              <span className={`inline-flex px-2 py-0.5 text-xs rounded ${
                master.isMfdsVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {master.isMfdsVerified ? 'MFDS 검증됨' : 'MFDS 미검증'}
              </span>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-semibold text-slate-800">공급가 설정</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                일반 공급가 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="priceGeneral"
                value={offerForm.priceGeneral}
                onChange={handleOfferChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">소비자 참고가 (원)</label>
              <input
                type="number"
                name="consumerReferencePrice"
                value={offerForm.consumerReferencePrice}
                onChange={handleOfferChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="선택"
                min="0"
              />
            </div>
          </div>

          {/* WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1: B2C Description */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-semibold text-slate-800">소비자용 상품 설명</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">소비자용 간이 설명</label>
              <RichTextEditor
                value={consumerShortDesc}
                onChange={(c) => setConsumerShortDesc(c.html)}
                placeholder="소비자에게 보이는 간이 설명을 입력하세요..."
                minHeight="120px"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">소비자용 상세 설명</label>
              <RichTextEditor
                value={consumerDetailDesc}
                onChange={(c) => setConsumerDetailDesc(c.html)}
                placeholder="소비자에게 보이는 상세 설명을 입력하세요..."
                minHeight="200px"
              />
            </div>
          </div>

          {/* Distribution type */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">유통 설정</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">유통 정책</label>
              <div className="space-y-2">
                {[
                  { value: 'PUBLIC', label: '공개', desc: '모든 판매자에게 자동 노출' },
                  { value: 'SERVICE', label: '서비스', desc: '서비스 참여 승인 후 노출' },
                  { value: 'PRIVATE', label: '비공개', desc: '지정된 판매자에게만 노출' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      offerForm.distributionType === opt.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="distributionType"
                      value={opt.value}
                      checked={offerForm.distributionType === opt.value}
                      onChange={(e) => setOfferForm((prev) => ({ ...prev, distributionType: e.target.value }))}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-slate-800">{opt.label}</p>
                      <p className="text-sm text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(master ? 'barcode' : 'master')}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium"
            >
              이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
            >
              {submitting ? '등록중...' : '상품 등록'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
