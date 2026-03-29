/**
 * ProductDetailDrawer — 상품 상세 정보 슬라이드 Drawer (조회 + 수정)
 *
 * WO-O4O-NETURE-SUPPLIER-DRAWER-V1
 * WO-O4O-NETURE-SUPPLIER-DRAWER-EDITABLE-V1
 * WO-O4O-NETURE-PRODUCT-FORM-UNIFICATION-V1 — ProductForm 통합
 *
 * 조회 모드: read-only 섹션
 * 수정 모드: ProductForm mode="edit" 사용
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Pencil, Trash2, ImagePlus, Loader2 } from 'lucide-react';
import { supplierApi, type SupplierProduct, productApi, type ProductImage, type CategoryTreeItem, type BrandItem } from '../../lib/api';
import { ProductForm, type ProductFormData } from '../../components/product';

interface ProductDetailDrawerProps {
  product: SupplierProduct | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** Operator 승인 페이지용: Drawer footer에 승인/반려 버튼 표시 */
  approvalActions?: {
    onApprove: () => void;
    onReject: () => void;
    loading?: boolean;
  };
}

// ─── Helpers ───

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 text-right">{children}</span>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

const REGULATORY_TYPE_LABELS: Record<string, string> = {
  DRUG: '의약품',
  HEALTH_FUNCTIONAL: '건강기능식품',
  QUASI_DRUG: '의약외품',
  COSMETIC: '화장품',
  GENERAL: '일반',
};

const REGULATORY_TYPE_BADGE: Record<string, string> = {
  DRUG: 'bg-red-50 text-red-700',
  HEALTH_FUNCTIONAL: 'bg-amber-50 text-amber-700',
  QUASI_DRUG: 'bg-yellow-50 text-yellow-700',
  COSMETIC: 'bg-violet-50 text-violet-700',
  GENERAL: 'bg-slate-100 text-slate-600',
};

const DISTRIBUTION_BADGE: Record<string, { label: string; cls: string }> = {
  PUBLIC: { label: '전체 공개', cls: 'bg-blue-50 text-blue-700' },
  PRIVATE: { label: '비공개', cls: 'bg-amber-50 text-amber-700' },
  SERVICE: { label: '서비스', cls: 'bg-green-50 text-green-700' },
};

const COMPLETENESS_BADGE: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: '승인됨', cls: 'bg-green-50 text-green-700' },
  READY: { label: '준비 완료', cls: 'bg-blue-50 text-blue-700' },
  INCOMPLETE: { label: '미완성', cls: 'bg-amber-50 text-amber-700' },
  DRAFT: { label: '초안', cls: 'bg-slate-100 text-slate-600' },
};

function formatPrice(v: number | null | undefined): string {
  if (v == null) return '-';
  return `${Number(v).toLocaleString()}원`;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: flatten category tree for <select>
function flattenCategories(
  categories: CategoryTreeItem[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

function toFormData(p: SupplierProduct): Partial<ProductFormData> {
  return {
    marketingName: p.name || p.masterName || '',
    priceGeneral: p.priceGeneral ?? null,
    consumerReferencePrice: p.consumerReferencePrice ?? null,
    stockQuantity: p.stockQuantity ?? 0,
    isActive: p.isActive,
    distributionType: p.distributionType || 'PUBLIC',
    serviceKeys: p.serviceKeys?.length ? p.serviceKeys : ['neture'],
  };
}

// ─── Component ───

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

export default function ProductDetailDrawer({ product, open, onClose, onSaved, approvalActions }: ProductDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);

  // Image state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'thumbnail' | 'detail' | 'content'>('detail');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track ProductForm data via ref to avoid re-render loops
  const formRef = useRef<ProductFormData | null>(null);
  const isDirtyRef = useRef(false);

  // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: Master field editing state
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editBrand, setEditBrand] = useState<string | null>(null);
  const [editSpec, setEditSpec] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [editBizShort, setEditBizShort] = useState('');
  const [editBizDetail, setEditBizDetail] = useState('');
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // Load images when drawer opens
  useEffect(() => {
    if (product?.masterId && open) {
      setLoadingImages(true);
      productApi.getProductImages(product.masterId).then((data) => {
        setImages(data);
        setLoadingImages(false);
      });
    }
    if (!open) {
      setImages([]);
    }
  }, [product?.masterId, open]);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setIsEditing(false);
      setShowDirtyConfirm(false);
      formRef.current = null;
      isDirtyRef.current = false;
    }
  }, [product]);

  const handleFormChange = useCallback((data: ProductFormData, dirty: boolean) => {
    formRef.current = data;
    isDirtyRef.current = dirty;
  }, []);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleClose = useCallback(() => {
    if (isEditing && isDirtyRef.current) {
      setShowDirtyConfirm(true);
      return;
    }
    setIsEditing(false);
    onClose();
  }, [isEditing, onClose]);

  // ESC key handler
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          if (isDirtyRef.current) {
            setShowDirtyConfirm(true);
          } else {
            cancelEdit();
          }
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, isEditing, cancelEdit, onClose]);

  const handleSave = async () => {
    if (!product || !formRef.current) return;
    const form = formRef.current;
    setSaving(true);

    // 1. 기본 필드 + distributionType + Master 필드 업데이트
    const result = await supplierApi.updateProduct(product.id, {
      marketingName: form.marketingName || undefined,
      priceGeneral: form.priceGeneral ?? undefined,
      consumerReferencePrice: form.consumerReferencePrice,
      stockQuantity: form.stockQuantity,
      isActive: form.isActive,
      distributionType: form.distributionType as any,
      // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: Master-level fields
      categoryId: editCategory,
      brandId: editBrand,
      specification: editSpec || null,
      originCountry: editOrigin || null,
      tags: editTags,
    });

    // 2. B2B 설명 업데이트 (전용 엔드포인트)
    if (result.success) {
      const bizShort = editBizShort.trim() ? `<p>${editBizShort.trim()}</p>` : null;
      const bizDetail = editBizDetail.trim() ? `<p>${editBizDetail.trim()}</p>` : null;
      const prevBizShort = stripHtml(product.businessShortDescription);
      const prevBizDetail = stripHtml(product.businessDetailDescription);
      if (editBizShort.trim() !== prevBizShort || editBizDetail.trim() !== prevBizDetail) {
        await supplierApi.updateBusinessContent(product.id, {
          businessShortDescription: bizShort,
          businessDetailDescription: bizDetail,
        });
      }
    }

    // 3. 새로운 serviceKeys가 추가되었으면 승인 요청
    if (result.success && form.serviceKeys?.length) {
      const existingKeys = new Set(product.serviceKeys || []);
      const newKeys = form.serviceKeys.filter(k => !existingKeys.has(k));
      if (newKeys.length > 0) {
        await supplierApi.submitForApproval([product.id], form.serviceKeys);
      }
    }

    setSaving(false);
    if (result.success) {
      setIsEditing(false);
      onSaved?.();
    }
  };

  // Image handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product?.masterId) return;
    setUploading(true);
    const res = await productApi.uploadProductImage(product.masterId, file, uploadType);
    if (res.success) {
      const updated = await productApi.getProductImages(product.masterId);
      setImages(updated);
      onSaved?.();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageDelete = async (imageId: string) => {
    if (!product?.masterId) return;
    const ok = await productApi.deleteProductImage(imageId, product.masterId);
    if (ok) {
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      onSaved?.();
    }
  };

  const thumbnail = images.find((i) => i.type === 'thumbnail');
  const detailImages = images.filter((i) => i.type === 'detail');
  const contentImages = images.filter((i) => i.type === 'content');

  if (!open || !product) return null;

  const regType = product.regulatoryType || 'GENERAL';
  const regLabel = REGULATORY_TYPE_LABELS[regType] || regType;
  const regBadgeCls = REGULATORY_TYPE_BADGE[regType] || REGULATORY_TYPE_BADGE.GENERAL;

  const distCfg = DISTRIBUTION_BADGE[product.distributionType] || DISTRIBUTION_BADGE.PUBLIC;
  const compCfg = COMPLETENESS_BADGE[product.completenessStatus || 'DRAFT'] || COMPLETENESS_BADGE.DRAFT;

  const score = product.completenessScore || 0;
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-500';
  const scoreBgColor = score >= 80 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <>
      {/* Dirty confirm dialog */}
      {showDirtyConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[360px]">
            <h3 className="text-base font-bold text-slate-900 mb-2">저장하지 않은 변경사항</h3>
            <p className="text-sm text-slate-600 mb-4">저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDirtyConfirm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                계속 편집
              </button>
              <button
                onClick={() => {
                  setShowDirtyConfirm(false);
                  cancelEdit();
                  onClose();
                }}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                변경 취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 truncate">
              {product.name || product.masterName || '(이름 없음)'}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{product.barcode}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing && !approvalActions && (
              <button
                onClick={() => {
                  // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: initialize Master fields on edit
                  setEditCategory(product.categoryId || null);
                  setEditBrand(product.brandId || null);
                  setEditSpec(product.specification || '');
                  setEditOrigin(product.originCountry || '');
                  setEditTags(product.tags || []);
                  setTagInput('');
                  setEditBizShort(stripHtml(product.businessShortDescription) || '');
                  setEditBizDetail(stripHtml(product.businessDetailDescription) || '');
                  productApi.getCategories().then(setCategories);
                  productApi.getBrands().then(setBrands);
                  setIsEditing(true);
                }}
                className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"
                title="수정"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg"
              aria-label="닫기"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── 수정 모드: ProductForm ── */}
          {isEditing && (
            <div className="mb-5 p-4 bg-amber-50/40 border border-amber-200 rounded-xl">
              <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">수정</h4>
              <ProductForm
                mode="edit"
                initialData={toFormData(product)}
                onChange={handleFormChange}
                disabled={saving}
              />
            </div>
          )}

          {/* ── 수정 모드: Master 필드 + B2B 설명 (WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1) ── */}
          {isEditing && (
            <div className="mb-5 p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">기본 정보 수정</h4>

              {/* 카테고리 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
                <select
                  value={editCategory || ''}
                  onChange={(e) => setEditCategory(e.target.value || null)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                >
                  <option value="">선택 안함</option>
                  {flattenCategories(categories).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {'  '.repeat(cat.depth)}{cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 브랜드 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">브랜드</label>
                <select
                  value={editBrand || ''}
                  onChange={(e) => setEditBrand(e.target.value || null)}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                >
                  <option value="">선택 안함</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* 사양 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">사양</label>
                <input
                  type="text"
                  value={editSpec}
                  onChange={(e) => setEditSpec(e.target.value)}
                  disabled={saving}
                  placeholder="예: 500mg × 60정"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              {/* 원산지 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">원산지</label>
                <input
                  type="text"
                  value={editOrigin}
                  onChange={(e) => setEditOrigin(e.target.value)}
                  disabled={saving}
                  placeholder="예: 대한민국"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">태그</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {editTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setEditTags((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-slate-600"
                      >×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim().replace(/,$/, '');
                      if (newTag && !editTags.includes(newTag)) {
                        setEditTags((prev) => [...prev, newTag]);
                      }
                      setTagInput('');
                    }
                  }}
                  disabled={saving}
                  placeholder="태그 입력 후 Enter"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              {/* B2B 설명 */}
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2">B2B 설명</h4>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">B2B 간단 소개</label>
                <textarea
                  value={editBizShort}
                  onChange={(e) => setEditBizShort(e.target.value)}
                  disabled={saving}
                  rows={2}
                  placeholder="거래처용 간단 소개"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">B2B 상세 설명</label>
                <textarea
                  value={editBizDetail}
                  onChange={(e) => setEditBizDetail(e.target.value)}
                  disabled={saving}
                  rows={4}
                  placeholder="거래처용 상세 설명"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── 이미지 섹션 ── */}
          <Section title="이미지">
            {loadingImages ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : images.length === 0 && !isEditing ? (
              <p className="text-sm text-slate-400">등록된 이미지가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {/* 썸네일 */}
                {thumbnail && (
                  <div className="relative group">
                    <img
                      src={thumbnail.imageUrl}
                      alt="대표 이미지"
                      className="w-full rounded-lg object-cover max-h-[240px]"
                    />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 text-white text-[10px] font-medium rounded">
                      대표
                    </span>
                    {isEditing && (
                      <button
                        onClick={() => handleImageDelete(thumbnail.id)}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* 상세 이미지 */}
                {detailImages.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5">상세 이미지</span>
                    <div className="grid grid-cols-3 gap-2">
                      {detailImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.imageUrl}
                            alt="상세"
                            className="rounded-lg aspect-square object-cover w-full"
                          />
                          {isEditing && (
                            <button
                              onClick={() => handleImageDelete(img.id)}
                              className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="삭제"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 콘텐츠 이미지 */}
                {contentImages.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5">콘텐츠 이미지</span>
                    <div className="grid grid-cols-3 gap-2">
                      {contentImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.imageUrl}
                            alt="콘텐츠"
                            className="rounded-lg aspect-square object-cover w-full"
                          />
                          {isEditing && (
                            <button
                              onClick={() => handleImageDelete(img.id)}
                              className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="삭제"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 수정 모드: 이미지 추가 */}
            {isEditing && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as 'thumbnail' | 'detail' | 'content')}
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                    disabled={uploading}
                  >
                    <option value="thumbnail">대표 이미지</option>
                    <option value="detail">상세 이미지</option>
                    <option value="content">콘텐츠 이미지</option>
                  </select>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ImagePlus size={12} />
                    )}
                    {uploading ? '업로드 중...' : '추가'}
                  </button>
                </div>
                {uploadType === 'thumbnail' && thumbnail && (
                  <p className="text-[11px] text-amber-600">기존 대표 이미지가 교체됩니다</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}
          </Section>

          {/* ── 기본 정보 (read-only) ── */}
          {!isEditing && (
            <Section title="기본 정보">
              <InfoRow label="바코드"><span className="font-mono">{product.barcode}</span></InfoRow>
              <InfoRow label="상품명">{product.name || product.masterName || '-'}</InfoRow>
              {product.regulatoryName && product.regulatoryName !== product.name && (
                <InfoRow label="규제명">{product.regulatoryName}</InfoRow>
              )}
              <InfoRow label="브랜드">{product.brandName || '-'}</InfoRow>
              <InfoRow label="카테고리">{product.categoryName || '-'}</InfoRow>
              {product.specification && (
                <InfoRow label="사양">{product.specification}</InfoRow>
              )}
              {product.originCountry && (
                <InfoRow label="원산지">{product.originCountry}</InfoRow>
              )}
              <InfoRow label="규제 유형">
                <Badge className={regBadgeCls}>{regLabel}</Badge>
              </InfoRow>
              {regType !== 'GENERAL' && (
                <>
                  <InfoRow label="MFDS 허가번호">
                    <span className="font-mono">{product.mfdsPermitNumber || '-'}</span>
                  </InfoRow>
                  {product.manufacturerName && (
                    <InfoRow label="제조사">{product.manufacturerName}</InfoRow>
                  )}
                </>
              )}
            </Section>
          )}

          {/* ── 가격 (read-only) ── */}
          {!isEditing && (
            <Section title="가격">
              <InfoRow label="공급가">{formatPrice(product.priceGeneral)}</InfoRow>
              <InfoRow label="소비자 참고가">{formatPrice(product.consumerReferencePrice)}</InfoRow>
              {product.priceGold != null && (
                <InfoRow label="Gold 가격">{formatPrice(product.priceGold)}</InfoRow>
              )}
              {product.pricePlatinum != null && (
                <InfoRow label="Platinum 가격">{formatPrice(product.pricePlatinum)}</InfoRow>
              )}
            </Section>
          )}

          {/* ── 상태 ── */}
          <Section title="상태">
            {!isEditing && (
              <InfoRow label="활성">
                <Badge className={product.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}>
                  {product.isActive ? '활성' : '비활성'}
                </Badge>
              </InfoRow>
            )}
            <InfoRow label="유통 방식">
              <Badge className={distCfg.cls}>{distCfg.label}</Badge>
            </InfoRow>
            <InfoRow label="승인">
              <Badge className={
                product.approvalStatus === 'approved' ? 'bg-green-50 text-green-700'
                  : product.approvalStatus === 'pending' ? 'bg-amber-50 text-amber-700'
                  : product.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }>
                {product.approvalStatus === 'approved' ? '승인' : product.approvalStatus === 'pending' ? '대기' : product.approvalStatus === 'rejected' ? '거부' : product.approvalStatus || '-'}
              </Badge>
            </InfoRow>
            <InfoRow label="완성도">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${scoreBgColor} rounded-full`} style={{ width: `${score}%` }} />
                </div>
                <span className={`text-xs font-medium ${scoreColor}`}>{score}%</span>
                <Badge className={compCfg.cls}>{compCfg.label}</Badge>
              </div>
            </InfoRow>
          </Section>

          {/* ── 서비스 ── */}
          {(product.serviceKeys?.length || product.serviceApprovals?.length) ? (
            <Section title="서비스">
              {product.serviceKeys && product.serviceKeys.length > 0 && (
                <InfoRow label="등록 서비스">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {product.serviceKeys.map((sk) => (
                      <Badge key={sk} className="bg-slate-100 text-slate-600">{sk}</Badge>
                    ))}
                  </div>
                </InfoRow>
              )}
              {product.serviceApprovals && product.serviceApprovals.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-sm text-slate-500">서비스별 승인</span>
                  {product.serviceApprovals.map((sa) => (
                    <div key={sa.serviceKey}>
                      <div className="flex items-center justify-between pl-3">
                        <span className="text-xs text-slate-600">{sa.serviceKey}</span>
                        <Badge className={
                          sa.status === 'approved' ? 'bg-green-50 text-green-700'
                            : sa.status === 'pending' ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }>
                          {sa.status === 'approved' ? '승인' : sa.status === 'pending' ? '대기' : '반려'}
                        </Badge>
                      </div>
                      {sa.reason && (
                        <p className="text-xs text-red-600 pl-3 mt-0.5">반려 사유: {sa.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <InfoRow label="대기 요청">{product.pendingRequestCount ?? 0}건</InfoRow>
              <InfoRow label="활성 서비스">{product.activeServiceCount ?? 0}개</InfoRow>
            </Section>
          ) : null}

          {/* ── 설명 ── */}
          {(product.consumerShortDescription || product.consumerDetailDescription) && (
            <Section title="설명">
              {product.consumerShortDescription && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
                  <p className="text-sm text-slate-700 line-clamp-3">
                    {stripHtml(product.consumerShortDescription)}
                  </p>
                </div>
              )}
              {product.consumerDetailDescription && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
                  <p className="text-sm text-slate-700 line-clamp-5">
                    {stripHtml(product.consumerDetailDescription)}
                  </p>
                </div>
              )}
            </Section>
          )}

          {/* ── 재고·기타 ── */}
          {!isEditing && (
            <Section title="재고 · 기타">
              <InfoRow label="재고 수량">
                {product.stockQuantity != null ? Number(product.stockQuantity).toLocaleString() : '0'}
              </InfoRow>
              {product.tags && product.tags.length > 0 && (
                <InfoRow label="태그">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {product.tags.slice(0, 5).map((tag, i) => (
                      <Badge key={i} className="bg-slate-100 text-slate-600">{tag}</Badge>
                    ))}
                    {product.tags.length > 5 && (
                      <span className="text-xs text-slate-400">+{product.tags.length - 5}</span>
                    )}
                  </div>
                </InfoRow>
              )}
              <InfoRow label="등록일">{formatDate(product.createdAt)}</InfoRow>
              <InfoRow label="수정일">{formatDate(product.updatedAt)}</InfoRow>
            </Section>
          )}
        </div>

        {/* Footer — 수정 모드 시 취소/저장 */}
        {isEditing && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}

        {/* Footer — 승인 모드 (Operator 승인 페이지용) */}
        {!isEditing && approvalActions && product?.approvalStatus === 'pending' && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
            <button
              onClick={approvalActions.onReject}
              disabled={approvalActions.loading}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
            >
              반려
            </button>
            <button
              onClick={approvalActions.onApprove}
              disabled={approvalActions.loading}
              className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              {approvalActions.loading ? '처리 중...' : '승인'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
