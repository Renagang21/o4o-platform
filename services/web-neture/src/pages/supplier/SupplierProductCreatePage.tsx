/**
 * SupplierProductCreatePage - 공급자 상품 등록 (단일 Form)
 *
 * WO-NETURE-PRODUCT-REGISTRATION-UI-ALIGN-TO-IMPORT-V1
 *
 * 3-Step Wizard → 단일 Form 전환
 * - 필수: barcode + marketingName + supplyPrice + categoryId
 * - 규제 카테고리 시 regulatoryType + regulatoryName 필수
 * - brand: text input (Import와 동일, resolveBrandId 서버 사용)
 * - distributionType 기본값: PRIVATE (Import/DB와 정렬)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import {
  supplierApi,
  productApi,
  type AdminMaster,
  type CategoryTreeItem,
} from '../../lib/api';

interface FormData {
  barcode: string;
  marketingName: string;
  categoryId: string;
  brandName: string;
  manufacturerName: string;
  distributionType: string;
  priceGeneral: string;
  consumerReferencePrice: string;
  // Regulated fields (conditional)
  regulatoryType: string;
  regulatoryName: string;
  mfdsPermitNumber: string;
  // Extra
  specification: string;
  originCountry: string;
  tags: string;
}

// Flatten category tree for select dropdown
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

  const [form, setForm] = useState<FormData>({
    barcode: '',
    marketingName: '',
    categoryId: '',
    brandName: '',
    manufacturerName: '',
    distributionType: 'PRIVATE',
    priceGeneral: '',
    consumerReferencePrice: '',
    regulatoryType: '건강기능식품',
    regulatoryName: '',
    mfdsPermitNumber: '',
    specification: '',
    originCountry: '',
    tags: '',
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
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [detailFiles, setDetailFiles] = useState<File[]>([]);
  const [detailPreviews, setDetailPreviews] = useState<string[]>([]);
  const [contentFiles, setContentFiles] = useState<File[]>([]);
  const [contentPreviews, setContentPreviews] = useState<string[]>([]);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showExtra, setShowExtra] = useState(false);

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
      // Auto-fill from existing master
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

  // Submit
  const handleSubmit = async () => {
    // Validation
    if (!form.barcode.trim()) { setSubmitError('바코드를 입력해주세요.'); return; }
    if (!form.marketingName.trim()) { setSubmitError('상품명을 입력해주세요.'); return; }
    const priceGeneral = Number(form.priceGeneral);
    if (!priceGeneral || priceGeneral <= 0) { setSubmitError('공급가를 입력해주세요.'); return; }
    if (!form.categoryId) { setSubmitError('카테고리를 선택해주세요.'); return; }
    if (isRegulated && (!form.regulatoryType || !form.regulatoryName.trim())) {
      setSubmitError('규제 카테고리 상품은 규제 유형과 규제명이 필수입니다.');
      return;
    }
    if (form.distributionType === 'PUBLIC' && !consumerShortDesc.trim()) {
      setSubmitError('공개(PUBLIC) 유통 시 소비자용 간이 설명이 필수입니다.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const manualData: Record<string, any> = {};
    if (isRegulated) {
      manualData.regulatoryType = form.regulatoryType;
      manualData.regulatoryName = form.regulatoryName;
      manualData.mfdsPermitNumber = form.mfdsPermitNumber || null;
    }
    if (form.manufacturerName) manualData.manufacturerName = form.manufacturerName;
    if (form.specification) manualData.specification = form.specification;
    if (form.originCountry) manualData.originCountry = form.originCountry;
    if (form.tags) manualData.tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    const result = await supplierApi.createProduct({
      barcode: form.barcode.trim(),
      marketingName: form.marketingName.trim(),
      categoryId: form.categoryId,
      brandName: form.brandName.trim() || undefined,
      distributionType: form.distributionType,
      manualData: Object.keys(manualData).length > 0 ? manualData : undefined,
      priceGeneral,
      consumerReferencePrice: form.consumerReferencePrice ? Number(form.consumerReferencePrice) : null,
      consumerShortDescription: consumerShortDesc || null,
      consumerDetailDescription: consumerDetailDesc || null,
    });
    setSubmitting(false);

    if (result.success) {
      // Upload images — type별 순서대로
      const masterId = result.data?.masterId;
      if (masterId) {
        if (thumbnailFile) {
          await productApi.uploadProductImage(masterId, thumbnailFile, 'thumbnail');
        }
        for (const file of detailFiles) {
          await productApi.uploadProductImage(masterId, file, 'detail');
        }
        for (const file of contentFiles) {
          await productApi.uploadProductImage(masterId, file, 'content');
        }
      }
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
      detailPreviews.forEach((url) => URL.revokeObjectURL(url));
      contentPreviews.forEach((url) => URL.revokeObjectURL(url));
      navigate('/workspace/supplier/products');
    } else {
      setSubmitError(result.error || '상품 등록에 실패했습니다.');
    }
  };

  // Image handlers — WO-NETURE-IMAGE-ASSET-STRUCTURE-V1
  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleMultiImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setPreviews: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeMultiImage = (
    idx: number,
    previews: string[],
    setFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setPreviews: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    URL.revokeObjectURL(previews[idx]);
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">상품 등록</h1>
        <p className="text-slate-500 mt-1">상품 정보를 입력하여 새 상품을 등록합니다</p>
      </div>

      {/* ==================== 필수 정보 ==================== */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-800">필수 정보</h3>

        {/* Barcode with inline search */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            바코드 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              name="barcode"
              value={form.barcode}
              onChange={(e) => { handleChange(e); setBarcodeChecked(false); setMaster(null); }}
              onKeyDown={(e) => e.key === 'Enter' && searchBarcode()}
              placeholder="상품 바코드를 입력하세요"
              className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              autoFocus
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
            placeholder="소비자에게 노출되는 상품명"
          />
        </div>

        {/* Supply Price */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            공급가 (원) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="priceGeneral"
            value={form.priceGeneral}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
            min="0"
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
      </div>

      {/* ==================== 기본 정보 ==================== */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-800">기본 정보</h3>

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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">소비자 참고가 (원)</label>
          <input
            type="number"
            name="consumerReferencePrice"
            value={form.consumerReferencePrice}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="선택"
            min="0"
          />
        </div>

        {/* Distribution type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">유통 정책</label>
          <div className="space-y-2">
            {[
              { value: 'PRIVATE', label: '비공개', desc: '지정된 판매자에게만 노출 (기본)' },
              { value: 'SERVICE', label: '서비스', desc: '서비스 참여 승인 후 노출' },
              { value: 'PUBLIC', label: '공개', desc: '모든 판매자에게 자동 노출' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  form.distributionType === opt.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="distributionType"
                  value={opt.value}
                  checked={form.distributionType === opt.value}
                  onChange={handleChange}
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

      {/* ==================== 규제 정보 (조건부) ==================== */}
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
                <option value="건강기능식품">건강기능식품</option>
                <option value="의약외품">의약외품</option>
                <option value="화장품">화장품</option>
                <option value="의료기기">의료기기</option>
                <option value="일반">일반</option>
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

      {/* ==================== 상품 이미지 (WO-NETURE-IMAGE-ASSET-STRUCTURE-V1) ==================== */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-semibold text-slate-800">상품 이미지</h3>

        {/* 1. 대표 이미지 (썸네일) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">대표 이미지 (썸네일)</span>
            <span className="text-xs text-slate-400">1000x1000 정사각형 권장, 최대 1장</span>
          </div>
          {thumbnailPreview ? (
            <div className="relative group w-32 h-32 rounded-lg overflow-hidden border-2 border-emerald-300">
              <img src={thumbnailPreview} alt="썸네일 미리보기" className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">대표</span>
              <button type="button" onClick={removeThumbnail} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
            </div>
          ) : (
            <label className="block w-32 h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors flex items-center justify-center">
              <input type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
              <span className="text-slate-400 text-xs text-center">클릭하여<br />추가</span>
            </label>
          )}
        </div>

        {/* 2. 상세 이미지 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">상세 이미지</span>
            <span className="text-xs text-slate-400">상품 다각도, 포장 등 (여러 장 가능)</span>
          </div>
          {detailPreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {detailPreviews.map((src, idx) => (
                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={src} alt={`상세 ${idx + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeMultiImage(idx, detailPreviews, setDetailFiles, setDetailPreviews)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                </div>
              ))}
            </div>
          )}
          <label className="block border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
            <input type="file" accept="image/*" multiple onChange={(e) => handleMultiImageSelect(e, setDetailFiles, setDetailPreviews)} className="hidden" />
            <div className="text-slate-400 text-sm">
              <p className="font-medium">클릭하여 상세 이미지 추가</p>
              {detailPreviews.length > 0 && <p className="mt-1 text-xs text-emerald-600">{detailPreviews.length}장 선택됨</p>}
            </div>
          </label>
        </div>

        {/* 3. 성분/라벨 이미지 (콘텐츠) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">성분/라벨 이미지</span>
            <span className="text-xs text-slate-400">성분표, 라벨, 인증마크 등 (AI 텍스트 추출 대상)</span>
          </div>
          {contentPreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {contentPreviews.map((src, idx) => (
                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={src} alt={`콘텐츠 ${idx + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeMultiImage(idx, contentPreviews, setContentFiles, setContentPreviews)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                </div>
              ))}
            </div>
          )}
          <label className="block border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
            <input type="file" accept="image/*" multiple onChange={(e) => handleMultiImageSelect(e, setContentFiles, setContentPreviews)} className="hidden" />
            <div className="text-slate-400 text-sm">
              <p className="font-medium">클릭하여 성분/라벨 이미지 추가</p>
              {contentPreviews.length > 0 && <p className="mt-1 text-xs text-emerald-600">{contentPreviews.length}장 선택됨</p>}
            </div>
          </label>
        </div>
      </div>

      {/* ==================== 소비자용 상품 설명 ==================== */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-800">소비자용 상품 설명</h3>
        {form.distributionType === 'PUBLIC' && (
          <p className="text-sm text-amber-600">공개(PUBLIC) 유통 시 간이 설명은 필수입니다</p>
        )}

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

      {/* ==================== 추가 정보 (접이식) ==================== */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <button
          type="button"
          onClick={() => setShowExtra(!showExtra)}
          className="w-full flex items-center justify-between text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <span>추가 정보 (선택)</span>
          <span>{showExtra ? '접기' : '펼치기'}</span>
        </button>

        {showExtra && (
          <div className="mt-4 space-y-4">
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">태그</label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="쉼표로 구분 (예: 비타민, 건강, 영양제)"
              />
            </div>
          </div>
        )}
      </div>

      {/* ==================== Submit ==================== */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/workspace/supplier/products')}
          className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium"
        >
          취소
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
  );
}
