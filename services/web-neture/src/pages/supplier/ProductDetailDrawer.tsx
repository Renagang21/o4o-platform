/**
 * ProductDetailDrawer — 상품 상세 정보 슬라이드 Drawer (조회 + 수정)
 *
 * WO-O4O-NETURE-SUPPLIER-DRAWER-V1
 * WO-O4O-NETURE-SUPPLIER-DRAWER-EDITABLE-V1
 * WO-O4O-NETURE-PRODUCT-FORM-UNIFICATION-V1 — ProductForm 통합
 * WO-O4O-TEMPLATE-ADOPTION-NETURE-PRODUCT-V1 — B2B 상세 설명 에디터에 템플릿 기능 연결
 * WO-NETURE-PRODUCT-DRAWER-DUAL-EDIT-ENTRY-V1 — 공개/B2C + 판매/B2B 편집 진입점 2개 구조
 *
 * 조회 모드: read-only 섹션
 * 수정 모드: ProductForm mode="edit" 사용 (editMode: 'b2c' | 'b2b')
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Pencil, Trash2, ImagePlus, Loader2, Sparkles, Plus, Briefcase, ChevronDown, ChevronRight } from 'lucide-react';
import { supplierApi, type SupplierProduct, productApi, type ProductImage, type CategoryTreeItem, type BrandItem, type SpotPricePolicy } from '../../lib/api';
import { ProductForm, type ProductFormData } from '../../components/product';
import { RichTextEditor, ContentRenderer } from '@o4o/content-editor';
import { useContentTemplates } from '../../hooks/useContentTemplates';
import { useAuth } from '../../contexts';
import MediaPickerModal from '../../components/common/MediaPickerModal';
import {
  DISTRIBUTION_TYPE_BADGE,
  REGULATORY_TYPE_LABELS,
  REGULATORY_TYPE_BADGE,
  VISIBILITY_STATUS,
  getVisibilityStatus,
} from '../../lib/productConstants';

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
    priceGold: p.priceGold ?? null,
    consumerReferencePrice: p.consumerReferencePrice ?? null,
    stockQuantity: p.stockQuantity ?? 0,
    isActive: p.isActive,
    // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: 두 축 분리
    isPublic: (p as any).isPublic ?? (p.distributionType === 'PUBLIC'),
    serviceKeys: p.serviceKeys || [],
    distributionType: p.distributionType || 'PRIVATE',
  };
}

// ─── Component ───

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

export default function ProductDetailDrawer({ product, open, onClose, onSaved, approvalActions }: ProductDetailDrawerProps) {
  // WO-NETURE-PRODUCT-DRAWER-DUAL-EDIT-ENTRY-V1: dual edit mode
  const [editMode, setEditMode] = useState<'b2c' | 'b2b' | null>(null);
  const isEditing = editMode !== null;
  const [showSecondaryEdit, setShowSecondaryEdit] = useState(false);
  const b2bEditRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);

  // Template integration (WO-O4O-TEMPLATE-ADOPTION-NETURE-PRODUCT-V1)
  const { user } = useAuth();
  const tpl = useContentTemplates();
  const canCreatePublicTemplate = user?.roles?.some(
    (r: string) => r.includes('admin') || r.includes('operator') || r.includes('super_admin'),
  ) ?? false;

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
  const [editBizShort, setEditBizShort] = useState('');
  const [editBizDetail, setEditBizDetail] = useState('');
  // WO-NETURE-PRODUCT-DRAWER-B2C-EDIT-RESTORE-V1: B2C description editing state
  const [editConsumerShort, setEditConsumerShort] = useState('');
  const [editConsumerDetail, setEditConsumerDetail] = useState('');
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // WO-NETURE-SUPPLIER-TAG-AI-B2C-ALIGNMENT-V1: AI tag management state
  const [aiTags, setAiTags] = useState<Array<{ id: string; tag: string; confidence: number; source: string }>>([]);
  const [manualTags, setManualTags] = useState<Array<{ id: string; tag: string; confidence: number; source: string }>>([]);
  const [suggestedTags, setSuggestedTags] = useState<Array<{ tag: string; confidence: number }>>([]);
  const [suggestAttempted, setSuggestAttempted] = useState(false);
  const [aiTagLoading, setAiTagLoading] = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [manualTagInput, setManualTagInput] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  // V2: multi-select AI suggestions in edit mode
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  // WO-NETURE-DESCRIPTION-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1
  const [mediaPickerTarget, setMediaPickerTarget] = useState<((url: string) => void) | null>(null);
  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1
  const [showImagePicker, setShowImagePicker] = useState(false);

  // WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1: 스팟 정책 state
  const [spotPolicies, setSpotPolicies] = useState<SpotPricePolicy[]>([]);
  const [spotLoading, setSpotLoading] = useState(false);
  const [spotFormOpen, setSpotFormOpen] = useState(false);
  const [spotForm, setSpotForm] = useState({ policyName: '', spotPrice: '', startAt: '', endAt: '' });
  const [spotSaving, setSpotSaving] = useState(false);

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

  // Load AI tags when drawer opens
  useEffect(() => {
    if (product?.masterId && open) {
      setAiTagLoading(true);
      productApi.getAiTags(product.masterId).then((data) => {
        setAiTags(data.aiTags);
        setManualTags(data.manualTags);
        setAiTagLoading(false);
      });
    }
    if (!open) {
      setAiTags([]);
      setManualTags([]);
      setSuggestedTags([]);
      setManualTagInput('');
      setSelectedSuggestions(new Set());
    }
  }, [product?.masterId, open]);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setEditMode(null);
      setShowSecondaryEdit(false);
      setShowDirtyConfirm(false);
      formRef.current = null;
      isDirtyRef.current = false;
      setSuggestedTags([]);
      setManualTagInput('');
      setSelectedSuggestions(new Set());
    }
  }, [product]);

  const handleFormChange = useCallback((data: ProductFormData, dirty: boolean) => {
    formRef.current = data;
    isDirtyRef.current = dirty;
  }, []);

  // WO-NETURE-PRODUCT-DRAWER-DUAL-EDIT-ENTRY-V1: startEdit initializes fields and sets mode
  const startEdit = useCallback((mode: 'b2c' | 'b2b') => {
    if (!product) return;
    setEditCategory(product.categoryId || null);
    setEditBrand(product.brandId || null);
    setEditSpec(product.specification || '');
    setEditOrigin(product.originCountry || '');
    setEditBizShort(product.businessShortDescription || '');
    setEditBizDetail(product.businessDetailDescription || '');
    setEditConsumerShort(product.consumerShortDescription || '');
    setEditConsumerDetail(product.consumerDetailDescription || '');
    productApi.getCategories().then(setCategories);
    productApi.getBrands().then(setBrands);
    setShowSecondaryEdit(false);
    setEditMode(mode);
    if (mode === 'b2b') {
      setTimeout(() => b2bEditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, [product]);

  const cancelEdit = useCallback(() => {
    setEditMode(null);
    setShowSecondaryEdit(false);
  }, []);

  const handleClose = useCallback(() => {
    if (isEditing && isDirtyRef.current) {
      setShowDirtyConfirm(true);
      return;
    }
    setEditMode(null);
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
    if (!product) return;

    // IR-NETURE-PRODUCT-DETAIL-DRAWER-B2B-SAVE-NO-RESPONSE-V1:
    // B2B 전용 편집 모드에서는 ProductForm이 미렌더링되어 formRef가 null.
    // B2B 설명만 별도 저장한다.
    if (!formRef.current && editMode === 'b2b') {
      setSaving(true);
      try {
        const bizShort = editBizShort.trim() || null;
        const bizDetail = editBizDetail.trim() || null;
        const bizResult = await supplierApi.updateBusinessContent(product.id, {
          businessShortDescription: bizShort,
          businessDetailDescription: bizDetail,
        });
        if (!bizResult.success) {
          alert(`저장 실패: ${bizResult.error || '알 수 없는 오류'}`);
        } else {
          setEditMode(null);
          setShowSecondaryEdit(false);
          onSaved?.();
        }
      } catch (error) {
        console.error('[ProductDetailDrawer] B2B save error:', error);
        alert('저장 중 오류가 발생했습니다');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!formRef.current) {
      console.warn('[ProductDetailDrawer] formRef.current is null — form not ready');
      return;
    }
    const form = formRef.current;
    setSaving(true);

    try {
      // 1. 기본 필드 + isPublic + Master 필드 업데이트
      const payload = {
        marketingName: form.marketingName || undefined,
        priceGeneral: form.priceGeneral ?? undefined,
        priceGold: form.priceGold,
        consumerReferencePrice: form.consumerReferencePrice,
        stockQuantity: form.stockQuantity,
        isActive: form.isActive,
        // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: isPublic 직접 전달
        isPublic: form.isPublic,
        // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: Master-level fields
        // WO-NETURE-SUPPLIER-PRODUCT-SAVE-ERROR-RESOLUTION-V1: empty string → null (UUID 컬럼 보호)
        categoryId: editCategory || null,
        brandId: editBrand || null,
        specification: editSpec || null,
        originCountry: editOrigin || null,
        // WO-NETURE-PRODUCT-DRAWER-B2C-EDIT-RESTORE-V1: B2C 설명 저장 복구
        consumerShortDescription: editConsumerShort.trim() || null,
        consumerDetailDescription: editConsumerDetail.trim() || null,
      };
      console.log('[ProductDetailDrawer] save payload:', payload);

      const result = await supplierApi.updateProduct(product.id, payload);
      console.log('[ProductDetailDrawer] save result:', result);

      if (!result.success) {
        alert(`저장 실패: ${result.error || '알 수 없는 오류'}`);
        setSaving(false);
        return;
      }

      // 2. B2B 설명 업데이트 (전용 엔드포인트)
      const bizShort = editBizShort.trim() || null;
      const bizDetail = editBizDetail.trim() || null;
      if (editBizShort !== (product.businessShortDescription || '') || editBizDetail !== (product.businessDetailDescription || '')) {
        const bizResult = await supplierApi.updateBusinessContent(product.id, {
          businessShortDescription: bizShort,
          businessDetailDescription: bizDetail,
        });
        if (!bizResult.success) {
          console.warn('[ProductDetailDrawer] B2B content save failed:', bizResult.error);
        }
      }

      // 3. 새로운 serviceKeys가 추가되었으면 승인 요청
      if (form.serviceKeys?.length) {
        const existingKeys = new Set(product.serviceKeys || []);
        const newKeys = form.serviceKeys.filter(k => !existingKeys.has(k));
        if (newKeys.length > 0) {
          await supplierApi.submitForApproval([product.id]);
        }
      }

      setEditMode(null);
      setShowSecondaryEdit(false);
      onSaved?.();
    } catch (error) {
      console.error('[ProductDetailDrawer] save error:', error);
      alert('저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  // WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1: 스팟 정책 로드
  useEffect(() => {
    if (!product?.id || !open) return;
    setSpotLoading(true);
    supplierApi.listSpotPolicies(product.id).then(setSpotPolicies).finally(() => setSpotLoading(false));
  }, [product?.id, open]);

  const handleSpotCreate = async () => {
    if (!product?.id) return;
    setSpotSaving(true);
    const result = await supplierApi.createSpotPolicy({
      offerId: product.id,
      policyName: spotForm.policyName,
      spotPrice: Number(spotForm.spotPrice),
      startAt: spotForm.startAt,
      endAt: spotForm.endAt,
    });
    if (result.success) {
      setSpotFormOpen(false);
      setSpotForm({ policyName: '', spotPrice: '', startAt: '', endAt: '' });
      const updated = await supplierApi.listSpotPolicies(product.id);
      setSpotPolicies(updated);
    } else {
      alert(result.error || '스팟 정책 생성 실패');
    }
    setSpotSaving(false);
  };

  const handleSpotStatusChange = async (policyId: string, status: 'ACTIVE' | 'CANCELLED') => {
    if (!product?.id) return;
    const result = await supplierApi.changeSpotPolicyStatus(policyId, status);
    if (result.success) {
      const updated = await supplierApi.listSpotPolicies(product.id);
      setSpotPolicies(updated);
    } else {
      alert(result.error || '상태 변경 실패');
    }
  };

  // WO-NETURE-SUPPLIER-TAG-AI-B2C-ALIGNMENT-V1: AI tag handlers
  // WO-NETURE-AI-TAG-EDITING-OVERRIDE-INPUT-V1: 편집 중 값을 override로 전달
  // WO-NETURE-B2C-B2B-TAG-RECOMMENDATION-STRATEGY-V1: purpose별 AI 태그 추천
  const handleAiSuggest = async (purpose: 'b2c' | 'b2b') => {
    if (!product?.masterId) return;
    setAiSuggestLoading(true);
    setSuggestedTags([]);
    setSuggestAttempted(false);

    const overrides = isEditing
      ? {
          consumerShortDescription: editConsumerShort.trim() || null,
          consumerDetailDescription: editConsumerDetail.trim() || null,
          businessShortDescription: editBizShort.trim() || null,
          businessDetailDescription: editBizDetail.trim() || null,
        }
      : undefined;

    const suggestions = await productApi.suggestAiTags(product.masterId, overrides, purpose);
    setSuggestedTags(suggestions);
    setSuggestAttempted(true);
    setAiSuggestLoading(false);
  };

  const handleAcceptSuggestion = async (tag: string) => {
    if (!product?.masterId) return;
    setAddingTag(true);
    const result = await productApi.addManualTag(product.masterId, tag);
    if (result.success) {
      setSuggestedTags((prev) => prev.filter((s) => s.tag !== tag));
      const data = await productApi.getAiTags(product.masterId);
      setAiTags(data.aiTags);
      setManualTags(data.manualTags);
      onSaved?.();
    }
    setAddingTag(false);
  };

  // V2: multi-select AI suggestion handlers
  const handleAcceptSelectedSuggestions = async () => {
    if (!product?.masterId || selectedSuggestions.size === 0) return;
    setAddingTag(true);
    const tagsToAdd = Array.from(selectedSuggestions);
    const result = await productApi.addManualTagsBatch(product.masterId, tagsToAdd);
    if (result.success) {
      setSuggestedTags((prev) => prev.filter((s) => !selectedSuggestions.has(s.tag)));
      setSelectedSuggestions(new Set());
      const data = await productApi.getAiTags(product.masterId);
      setAiTags(data.aiTags);
      setManualTags(data.manualTags);
      onSaved?.();
    }
    setAddingTag(false);
  };

  const toggleSuggestion = (tag: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const handleAddManualTag = async () => {
    const tag = manualTagInput.trim();
    if (!tag || !product?.masterId) return;
    setAddingTag(true);
    const result = await productApi.addManualTag(product.masterId, tag);
    if (result.success) {
      setManualTagInput('');
      const data = await productApi.getAiTags(product.masterId);
      setAiTags(data.aiTags);
      setManualTags(data.manualTags);
      onSaved?.();
    }
    setAddingTag(false);
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!product?.masterId) return;
    const result = await productApi.deleteAiTag(product.masterId, tagId);
    if (result.success) {
      setAiTags((prev) => prev.filter((t) => t.id !== tagId));
      setManualTags((prev) => prev.filter((t) => t.id !== tagId));
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

  // Editor inline image upload — RichTextEditor onImageUpload callback
  const editorImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!product?.masterId) throw new Error('No product');
    const res = await productApi.uploadProductImage(product.masterId, file, 'content');
    if (res.success && res.data) {
      // Refresh images list so existingImages stays in sync
      const updated = await productApi.getProductImages(product.masterId);
      setImages(updated);
      return res.data.imageUrl;
    }
    throw new Error(res.error || 'Upload failed');
  }, [product?.masterId]);

  const handleImageDelete = async (imageId: string) => {
    if (!product?.masterId) return;
    const ok = await productApi.deleteProductImage(imageId, product.masterId);
    if (ok) {
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      onSaved?.();
    }
  };

  // WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 라이브러리 이미지 선택 핸들러
  const handleMediaPickerSelect = async (asset: { url: string }) => {
    if (!product?.masterId) return;
    setShowImagePicker(false);
    setUploading(true);
    const res = await productApi.registerImageFromUrl(product.masterId, asset.url, uploadType);
    if (res.success) {
      const updated = await productApi.getProductImages(product.masterId);
      setImages(updated);
      onSaved?.();
    }
    setUploading(false);
  };

  const thumbnail = images.find((i) => i.type === 'thumbnail');
  const detailImages = images.filter((i) => i.type === 'detail');
  const contentImages = images.filter((i) => i.type === 'content');

  if (!open || !product) return null;

  const regType = product.regulatoryType || 'GENERAL';
  const regLabel = REGULATORY_TYPE_LABELS[regType] || regType;
  const regBadge = REGULATORY_TYPE_BADGE[regType] || REGULATORY_TYPE_BADGE.GENERAL;
  const regBadgeCls = `${regBadge.bg} ${regBadge.text}`;

  const distBadge = DISTRIBUTION_TYPE_BADGE[product.distributionType] || DISTRIBUTION_TYPE_BADGE.PUBLIC;
  const distCfg = { label: distBadge.label, cls: `${distBadge.bg} ${distBadge.text}` };
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit('b2c')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="소비자 공개 정보 편집 (공통 + B2C)"
                  aria-label="공개/B2C 편집"
                >
                  <Pencil size={14} />
                  <span className="hidden sm:inline">공개</span>
                </button>
                <button
                  onClick={() => startEdit('b2b')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
                  title="판매자 지원 정보 편집 (B2B)"
                  aria-label="판매/B2B 편집"
                >
                  <Briefcase size={14} />
                  <span className="hidden sm:inline">판매</span>
                </button>
              </div>
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

          {/* ── 편집 모드 배너 (WO-NETURE-PRODUCT-DRAWER-DUAL-EDIT-ENTRY-V1) ── */}
          {isEditing && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              editMode === 'b2c' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'
            }`}>
              {editMode === 'b2c' ? <Pencil size={14} /> : <Briefcase size={14} />}
              {editMode === 'b2c' ? '공개/B2C 편집 모드' : '판매/B2B 편집 모드'}
            </div>
          )}

          {/* ── B2B 모드: B2B 설명 우선 표시 ── */}
          {isEditing && editMode === 'b2b' && (
            <div ref={b2bEditRef} className="mb-5 p-4 bg-teal-50/40 border border-teal-200 rounded-xl space-y-4">
              <h4 className="text-xs font-semibold text-teal-600 uppercase tracking-wider">판매자 지원 설명 (B2B)</h4>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">B2B 간단 소개</label>
                <RichTextEditor
                  value={editBizShort}
                  onChange={(c) => setEditBizShort(c.html)}
                  editable={!saving}
                  placeholder="거래처용 간단 소개"
                  minHeight="80px"
                  onImageUpload={editorImageUpload}
                  onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
                  existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">B2B 상세 설명</label>
                <RichTextEditor
                  value={editBizDetail}
                  onChange={(c) => setEditBizDetail(c.html)}
                  editable={!saving}
                  placeholder="거래처용 상세 설명"
                  minHeight="150px"
                  onImageUpload={editorImageUpload}
                  onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
                  existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                  showTemplateActions
                  templates={tpl.templates}
                  templatesLoading={tpl.loading}
                  templatesSaving={tpl.saving}
                  onLoadTemplates={tpl.loadTemplates}
                  onSaveAsTemplate={(name, category, isPublic) =>
                    tpl.saveTemplate(editBizDetail, name, category, isPublic)
                  }
                  onUseTemplate={tpl.recordUse}
                  canCreatePublicTemplate={canCreatePublicTemplate}
                />
              </div>
            </div>
          )}

          {/* ── 보조 섹션 토글 ── */}
          {isEditing && (
            <button
              onClick={() => setShowSecondaryEdit(!showSecondaryEdit)}
              className="mb-4 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showSecondaryEdit ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {editMode === 'b2c' ? 'B2B 설명도 편집' : '기본 정보 / B2C도 편집'}
            </button>
          )}

          {/* ── 수정 모드: ProductForm ── */}
          {isEditing && (editMode === 'b2c' || showSecondaryEdit) && (
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

          {/* ── 수정 모드: 공통 기본 정보 ── */}
          {isEditing && (editMode === 'b2c' || showSecondaryEdit) && (
            <div className="mb-5 p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">기본 정보</h4>

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
            </div>
          )}

          {/* ── 수정 모드: 소비자 공개 설명 (B2C) ── */}
          {isEditing && (editMode === 'b2c' || showSecondaryEdit) && (
            <div className="mb-5 p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-4">
              <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">소비자 공개 설명 (B2C)</h4>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">소비자 간단 소개</label>
                <RichTextEditor
                  value={editConsumerShort}
                  onChange={(c) => setEditConsumerShort(c.html)}
                  editable={!saving}
                  placeholder="소비자에게 보이는 간단 소개"
                  minHeight="80px"
                  onImageUpload={editorImageUpload}
                  onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
                  existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">소비자 상세 설명</label>
                <RichTextEditor
                  value={editConsumerDetail}
                  onChange={(c) => setEditConsumerDetail(c.html)}
                  editable={!saving}
                  placeholder="소비자에게 보이는 상세 설명"
                  minHeight="150px"
                  onImageUpload={editorImageUpload}
                  onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
                  existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                  showTemplateActions
                  templates={tpl.templates}
                  templatesLoading={tpl.loading}
                  templatesSaving={tpl.saving}
                  onLoadTemplates={tpl.loadTemplates}
                  onSaveAsTemplate={(name, category, isPublic) =>
                    tpl.saveTemplate(editConsumerDetail, name, category, isPublic)
                  }
                  onUseTemplate={tpl.recordUse}
                  canCreatePublicTemplate={canCreatePublicTemplate}
                />
              </div>
            </div>
          )}

          {/* ── 수정 모드: 판매자 지원 설명 (B2B) — B2C 모드의 보조 섹션으로만 표시 (B2B 모드는 위에서 우선 렌더링) ── */}
          {isEditing && editMode === 'b2c' && showSecondaryEdit && (
            <div className="mb-5 p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">판매자 지원 설명 (B2B)</h4>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">B2B 간단 소개</label>
                <RichTextEditor
                  value={editBizShort}
                  onChange={(c) => setEditBizShort(c.html)}
                  editable={!saving}
                  placeholder="거래처용 간단 소개"
                  minHeight="80px"
                  onImageUpload={editorImageUpload}
                  onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
                  existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">B2B 상세 설명</label>
                <RichTextEditor
                  value={editBizDetail}
                  onChange={(c) => setEditBizDetail(c.html)}
                  editable={!saving}
                  placeholder="거래처용 상세 설명"
                  minHeight="150px"
                  onImageUpload={editorImageUpload}
                  onMediaLibraryPick={(insertImage) => setMediaPickerTarget(() => insertImage)}
                  existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                  showTemplateActions
                  templates={tpl.templates}
                  templatesLoading={tpl.loading}
                  templatesSaving={tpl.saving}
                  onLoadTemplates={tpl.loadTemplates}
                  onSaveAsTemplate={(name, category, isPublic) =>
                    tpl.saveTemplate(editBizDetail, name, category, isPublic)
                  }
                  onUseTemplate={tpl.recordUse}
                  canCreatePublicTemplate={canCreatePublicTemplate}
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
                  <button
                    onClick={() => setShowImagePicker(true)}
                    disabled={uploading}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded disabled:opacity-50"
                  >
                    <ImagePlus size={12} />
                    라이브러리
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

          {/* ── 후편집 체크리스트 (WO-NETURE-BULK-PRODUCT-POST-IMPORT-CURATION-FLOW-V1) ── */}
          {(() => {
            const curationItems = [
              { label: '카테고리', done: !!product.categoryId, partial: false },
              {
                label: 'B2C 설명',
                done: !!(product.consumerShortDescription && product.consumerDetailDescription),
                partial: !!(product.consumerShortDescription) !== !!(product.consumerDetailDescription),
              },
              {
                label: 'B2B 설명',
                done: !!(product.businessShortDescription && product.businessDetailDescription),
                partial: !!(product.businessShortDescription) !== !!(product.businessDetailDescription),
              },
              {
                label: '태그',
                done: (product.tags?.length || 0) >= 3,
                partial: (product.tags?.length || 0) > 0 && (product.tags?.length || 0) < 3,
              },
              {
                label: '가격',
                done: (product.priceGeneral ?? 0) > 0,
                partial: (product.priceGeneral ?? 0) > 0 && product.priceGold == null,
              },
            ];
            const isNeedsCuration = product.completenessStatus === 'DRAFT' || product.completenessStatus === 'INCOMPLETE';
            if (!isNeedsCuration) return null;
            return (
              <div className="mb-4 p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">후편집 상태</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                      <div className={`h-full ${scoreBgColor} rounded-full`} style={{ width: `${score}%` }} />
                    </div>
                    <span className={`text-xs font-medium ${scoreColor}`}>{score}%</span>
                    <Badge className={compCfg.cls}>{compCfg.label}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {curationItems.map((item) => (
                    <span key={item.label} className="flex items-center gap-1 text-xs">
                      {item.done && !item.partial ? (
                        <span className="text-emerald-600 font-bold">&#10003;</span>
                      ) : item.partial ? (
                        <span className="text-amber-600 font-bold">&#9651;</span>
                      ) : (
                        <span className="text-slate-400 font-bold">&#10007;</span>
                      )}
                      <span className={item.done && !item.partial ? 'text-emerald-700' : item.partial ? 'text-amber-700' : 'text-slate-500'}>
                        {item.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── 노출 상태 배너 (WO-NETURE-SUPPLIER-PRODUCT-VISIBILITY-STATUS-UX-ALIGNMENT-V1) ── */}
          {!isEditing && (() => {
            const visKey = getVisibilityStatus(product);
            const vis = VISIBILITY_STATUS[visKey];
            const isVisible = visKey === 'VISIBLE';
            return (
              <div className={`mb-4 px-3 py-2.5 rounded-lg flex items-start gap-2 text-sm border ${
                isVisible ? 'bg-emerald-50 border-emerald-200'
                  : visKey === 'REJECTED' ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <span className={`inline-block w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${
                  isVisible ? 'bg-emerald-500'
                    : visKey === 'REJECTED' ? 'bg-red-500'
                    : visKey === 'PENDING' ? 'bg-amber-500'
                    : 'bg-slate-400'
                }`} />
                <div>
                  <span className={`font-medium ${vis.text}`}>{vis.label}</span>
                  <p className="text-xs text-slate-600 mt-0.5">{vis.description}</p>
                </div>
              </div>
            );
          })()}

          {/* ── 기본 정보 (read-only) ── */}
          {!isEditing && (
            <Section title="기본 정보">
              <InfoRow label="바코드"><span className="font-mono">{product.barcode}</span></InfoRow>
              <InfoRow label="상품명">{product.name || product.masterName || '-'}</InfoRow>
              {product.regulatoryName && product.regulatoryName !== product.name && (
                <InfoRow label="규제명">{product.regulatoryName}</InfoRow>
              )}
              <InfoRow label="브랜드">{product.brandName || '-'}</InfoRow>
              <InfoRow label="카테고리">
                {product.categoryName || <span className="text-amber-600 font-medium">미지정</span>}
              </InfoRow>
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

          {/* ── 소비자 공개 설명 (B2C) ── */}
          {!isEditing && (
            <Section title="소비자 공개 설명 (B2C)">
              {!product.consumerShortDescription && !product.consumerDetailDescription && (
                <p className="text-xs text-amber-600 mb-2">소비자 공개용 설명이 비어 있습니다. 편집 모드에서 입력해 주세요.</p>
              )}
              {product.consumerShortDescription ? (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
                  <ContentRenderer html={product.consumerShortDescription} className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-3" />
                </div>
              ) : (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
                  <p className="text-sm text-slate-400 italic">미작성</p>
                </div>
              )}
              {product.consumerDetailDescription ? (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
                  <ContentRenderer html={product.consumerDetailDescription} className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-5" variant="product-detail" />
                </div>
              ) : (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
                  <p className="text-sm text-slate-400 italic">미작성</p>
                </div>
              )}
            </Section>
          )}

          {/* ── 판매자 지원 설명 (B2B) ── */}
          {!isEditing && (
            <Section title="판매자 지원 설명 (B2B)">
              {!product.businessShortDescription && !product.businessDetailDescription && (
                <p className="text-xs text-amber-600 mb-2">판매자 지원 설명이 비어 있습니다. 편집 모드에서 입력해 주세요.</p>
              )}
              {product.businessShortDescription ? (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
                  <ContentRenderer html={product.businessShortDescription} className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-3" />
                </div>
              ) : (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">간단 소개</span>
                  <p className="text-sm text-slate-400 italic">미작성</p>
                </div>
              )}
              {product.businessDetailDescription ? (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
                  <ContentRenderer html={product.businessDetailDescription} className="text-sm text-slate-700 prose prose-sm max-w-none line-clamp-5" variant="product-detail" />
                </div>
              ) : (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">상세 설명</span>
                  <p className="text-sm text-slate-400 italic">미작성</p>
                </div>
              )}
            </Section>
          )}

          {/* ── 태그 관리 (V2: 편집/읽기 모드 모두 표시, 후편집 4단계) ── */}
          <Section title="태그 관리">
            {/* WO-NETURE-BULK-PRODUCT-POST-IMPORT-CURATION-FLOW-V1: 태그 추천 안내 */}
            {(!product.categoryId || (!product.consumerShortDescription && !product.consumerDetailDescription)) && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-3">
                카테고리와 설명을 먼저 입력하면 더 정확한 태그가 추천됩니다.
              </p>
            )}
            {aiTagLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 size={16} className="animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* 기존 AI 태그 */}
                {aiTags.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-slate-400 block mb-1.5">자동 생성 태그</span>
                    <div className="flex flex-wrap gap-1">
                      {aiTags.map((t) => (
                        <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                          {t.tag}
                          <span className="text-blue-400 text-[10px]">{Math.round(t.confidence * 100)}%</span>
                          <button
                            onClick={() => handleDeleteTag(t.id)}
                            className="text-blue-300 hover:text-red-500 ml-0.5"
                            title="삭제"
                          >&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 수동 태그 */}
                {manualTags.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-slate-400 block mb-1.5">수동 태그</span>
                    <div className="flex flex-wrap gap-1">
                      {manualTags.map((t) => (
                        <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                          {t.tag}
                          <button
                            onClick={() => handleDeleteTag(t.id)}
                            className="text-green-300 hover:text-red-500 ml-0.5"
                            title="삭제"
                          >&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {aiTags.length === 0 && manualTags.length === 0 && (
                  <p className="text-sm text-slate-400 mb-3">등록된 태그가 없습니다</p>
                )}

                {/* 추천 결과 0건 안내 */}
                {suggestAttempted && suggestedTags.length === 0 && (
                  <p className="text-xs text-slate-500 mb-3">추천할 새 태그가 없습니다. 설명을 보강하거나 수동으로 태그를 입력하세요.</p>
                )}

                {/* AI 추천 결과 — V2: 편집 모드에서는 multi-select */}
                {suggestedTags.length > 0 && (
                  <div className="mb-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                    <span className="text-xs font-medium text-amber-700 block mb-1.5">
                      AI 추천 태그 {isEditing ? '(선택 후 일괄 추가)' : '(클릭하여 추가)'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {suggestedTags.map((s, i) => (
                        isEditing ? (
                          <button
                            key={i}
                            onClick={() => toggleSuggestion(s.tag)}
                            disabled={addingTag}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-xs transition-colors disabled:opacity-50 ${
                              selectedSuggestions.has(s.tag)
                                ? 'bg-amber-200 border-amber-400 text-amber-900 font-medium'
                                : 'bg-white border-amber-300 text-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            {selectedSuggestions.has(s.tag) && '\u2713 '}{s.tag}
                            <span className="text-amber-400 text-[10px]">{Math.round(s.confidence * 100)}%</span>
                          </button>
                        ) : (
                          <button
                            key={i}
                            onClick={() => handleAcceptSuggestion(s.tag)}
                            disabled={addingTag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-300 text-amber-800 rounded text-xs hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            <Plus size={10} />
                            {s.tag}
                            <span className="text-amber-400 text-[10px]">{Math.round(s.confidence * 100)}%</span>
                          </button>
                        )
                      ))}
                    </div>
                    {isEditing && selectedSuggestions.size > 0 && (
                      <button
                        onClick={handleAcceptSelectedSuggestions}
                        disabled={addingTag}
                        className="mt-2 px-3 py-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                      >
                        {addingTag ? '추가 중...' : `선택 추가 (${selectedSuggestions.size}개)`}
                      </button>
                    )}
                  </div>
                )}

                {/* 액션 버튼: B2C/B2B 전략 분리 (WO-NETURE-B2C-B2B-TAG-RECOMMENDATION-STRATEGY-V1) */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => handleAiSuggest('b2c')}
                    disabled={aiSuggestLoading || !product?.masterId}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {aiSuggestLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    B2C 추가 추천
                  </button>
                  <button
                    onClick={() => handleAiSuggest('b2b')}
                    disabled={aiSuggestLoading || !product?.masterId}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {aiSuggestLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    B2B 추가 추천
                  </button>
                </div>

                {/* 수동 태그 입력 */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualTagInput}
                    onChange={(e) => setManualTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualTagInput.trim()) {
                        e.preventDefault();
                        handleAddManualTag();
                      }
                    }}
                    placeholder="태그 직접 입력 후 Enter"
                    disabled={addingTag}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                  />
                  <button
                    onClick={handleAddManualTag}
                    disabled={addingTag || !manualTagInput.trim()}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
              </>
            )}
          </Section>

          {/* ── 가격 점검 (후편집 마지막 단계) ── */}
          {!isEditing && (
            <Section title="가격 점검">
              <InfoRow label="공급가">{formatPrice(product.priceGeneral)}</InfoRow>
              <InfoRow label="소비자 참고가">{formatPrice(product.consumerReferencePrice)}</InfoRow>
              <InfoRow label="서비스가">
                {product.priceGold != null ? formatPrice(product.priceGold) : <span className="text-slate-400 italic text-xs">미설정</span>}
              </InfoRow>
              <p className="text-[11px] text-slate-400 mt-2">주문 단가는 공급가 기준입니다.</p>
            </Section>
          )}

          {/* ── 스팟 가격 정책 (WO-NETURE-SPOT-PRICE-POLICY-FOUNDATION-V1) ── */}
          {!isEditing && (
            <Section title="스팟 가격 정책">
              {spotLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> 로딩 중...</div>
              ) : spotPolicies.length === 0 && !spotFormOpen ? (
                <div className="text-center py-3">
                  <p className="text-xs text-slate-400 mb-2">등록된 스팟 정책이 없습니다</p>
                  <button onClick={() => setSpotFormOpen(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ 스팟 정책 추가</button>
                </div>
              ) : (
                <>
                  {spotPolicies.map((p) => {
                    const now = new Date();
                    const isExpired = p.status === 'ACTIVE' && new Date(p.endAt) < now;
                    const statusLabel = isExpired ? '만료' : p.status === 'DRAFT' ? '초안' : p.status === 'ACTIVE' ? '활성' : '취소';
                    const statusCls = isExpired ? 'bg-slate-100 text-slate-500' : p.status === 'DRAFT' ? 'bg-amber-50 text-amber-700' : p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500';
                    return (
                      <div key={p.id} className="border border-slate-100 rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{p.policyName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCls}`}>{statusLabel}</span>
                        </div>
                        <div className="text-sm font-semibold text-purple-700 mb-1">\u20a9{Number(p.spotPrice).toLocaleString()}</div>
                        <div className="text-[11px] text-slate-400">{new Date(p.startAt).toLocaleDateString()} ~ {new Date(p.endAt).toLocaleDateString()}</div>
                        {p.status === 'DRAFT' && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleSpotStatusChange(p.id, 'ACTIVE')} className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium">활성화</button>
                            <button onClick={() => handleSpotStatusChange(p.id, 'CANCELLED')} className="text-[11px] text-red-500 hover:text-red-600 font-medium">취소</button>
                          </div>
                        )}
                        {p.status === 'ACTIVE' && !isExpired && (
                          <div className="mt-2">
                            <button onClick={() => handleSpotStatusChange(p.id, 'CANCELLED')} className="text-[11px] text-red-500 hover:text-red-600 font-medium">정책 취소</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!spotFormOpen && (
                    <button onClick={() => setSpotFormOpen(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1">+ 스팟 정책 추가</button>
                  )}
                </>
              )}
              {spotFormOpen && (
                <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-3 mt-2">
                  <h5 className="text-xs font-semibold text-slate-600 mb-2">새 스팟 정책</h5>
                  <div className="space-y-2">
                    <input type="text" placeholder="정책명 (예: 4월 프로모션)" value={spotForm.policyName} onChange={(e) => setSpotForm((f) => ({ ...f, policyName: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
                    <input type="number" placeholder="스팟 가격 (원)" value={spotForm.spotPrice} onChange={(e) => setSpotForm((f) => ({ ...f, spotPrice: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">시작일</label>
                        <input type="date" value={spotForm.startAt} onChange={(e) => setSpotForm((f) => ({ ...f, startAt: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">종료일</label>
                        <input type="date" value={spotForm.endAt} onChange={(e) => setSpotForm((f) => ({ ...f, endAt: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleSpotCreate} disabled={spotSaving || !spotForm.policyName || !spotForm.spotPrice || !spotForm.startAt || !spotForm.endAt} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
                        {spotSaving ? '저장 중...' : '생성'}
                      </button>
                      <button onClick={() => { setSpotFormOpen(false); setSpotForm({ policyName: '', spotPrice: '', startAt: '', endAt: '' }); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200">취소</button>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-2">스팟 가격은 기간 한정 특별 공급가입니다. 상시 가격(공급가/서비스가)과 별도로 관리됩니다.</p>
            </Section>
          )}

          {/* ── 재고·기타 ── */}
          {!isEditing && (
            <Section title="재고 · 기타">
              <InfoRow label="재고 수량">
                {product.stockQuantity != null ? Number(product.stockQuantity).toLocaleString() : '0'}
              </InfoRow>
              <InfoRow label="등록일">{formatDate(product.createdAt)}</InfoRow>
              <InfoRow label="수정일">{formatDate(product.updatedAt)}</InfoRow>
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
          {/* WO-NETURE-LEGACY-NETURE-SERVICE-SELECTION-DATA-CLEANUP-V1: neture 필터링 */}
          {(() => {
            const filteredKeys = product.serviceKeys?.filter((sk) => sk !== 'neture') || [];
            const filteredApprovals = product.serviceApprovals?.filter((sa) => sa.serviceKey !== 'neture') || [];
            return (filteredKeys.length > 0 || filteredApprovals.length > 0) ? (
            <Section title="서비스">
              {filteredKeys.length > 0 && (
                <InfoRow label="등록 서비스">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {filteredKeys.map((sk) => (
                      <Badge key={sk} className="bg-slate-100 text-slate-600">{sk}</Badge>
                    ))}
                  </div>
                </InfoRow>
              )}
              {filteredApprovals.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-sm text-slate-500">서비스별 승인</span>
                  {filteredApprovals.map((sa) => (
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
          ) : null;
          })()}

          {/* ── KPA 2차 심사 상태 (WO-KPA-SOCIETY-SECOND-REVIEW-BRIDGE-FOUNDATION-V1) ── */}
          {product.kpaReviewStatus && (
            <Section title="KPA 2차 심사">
              <InfoRow label="심사 상태">
                <Badge className={
                  product.kpaReviewStatus === 'approved' ? 'bg-green-50 text-green-700'
                    : product.kpaReviewStatus === 'pending' ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
                }>
                  {product.kpaReviewStatus === 'approved' ? '승인' : product.kpaReviewStatus === 'pending' ? '심사 대기' : '반려'}
                </Badge>
              </InfoRow>
              {product.kpaReviewReason && (
                <InfoRow label="반려 사유">
                  <span className="text-xs text-red-600">{product.kpaReviewReason}</span>
                </InfoRow>
              )}
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
      {/* WO-NETURE-DESCRIPTION-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 공용 미디어 선택기 (설명 이미지용) */}
      <MediaPickerModal
        open={!!mediaPickerTarget}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(asset) => {
          mediaPickerTarget?.(asset.url);
          setMediaPickerTarget(null);
        }}
        defaultFolder="description"
      />
      {/* WO-NETURE-PRODUCT-PRIMARY-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1: 공용 미디어 선택기 (상품 이미지용) */}
      <MediaPickerModal
        open={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={handleMediaPickerSelect}
        title="상품 이미지 선택"
        defaultFolder="description"
      />
    </>
  );
}
