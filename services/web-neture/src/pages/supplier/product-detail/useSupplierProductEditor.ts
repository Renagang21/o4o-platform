import { useState, useEffect, useCallback, useRef } from 'react';
import {
  supplierApi,
  productApi,
  type SupplierProduct,
  type CategoryTreeItem,
  type BrandItem,
} from '../../../lib/api';
import type { ProductFormData } from '../../../components/product';
import { toast } from '@o4o/error-handling';
import { offerSaveErrorMessage } from './productDetailHelpers';

export function useSupplierProductEditor(
  product: SupplierProduct | null,
  open: boolean,
  onClose: () => void,
  onSaved?: () => void,
) {
  // WO-NETURE-PRODUCT-DRAWER-DUAL-EDIT-ENTRY-V1: dual edit mode
  const [editMode, setEditMode] = useState<'b2c' | 'b2b' | null>(null);
  const isEditing = editMode !== null;
  const [showSecondaryEdit, setShowSecondaryEdit] = useState(false);
  const b2bEditRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);
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

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setEditMode(null);
      setShowSecondaryEdit(false);
      setShowDirtyConfirm(false);
      formRef.current = null;
      isDirtyRef.current = false;
    }
  }, [product]);

  const handleFormChange = useCallback((data: ProductFormData, dirty: boolean) => {
    formRef.current = data;
    isDirtyRef.current = dirty;
  }, []);

  // WO-NETURE-PRODUCT-DRAWER-DUAL-EDIT-ENTRY-V1: startEdit initializes fields and sets mode
  const startEdit = useCallback(
    (mode: 'b2c' | 'b2b') => {
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
        setTimeout(
          () => b2bEditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          150,
        );
      }
    },
    [product],
  );

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
          toast.error(`저장 실패: ${offerSaveErrorMessage(bizResult.error)}`);
        } else {
          setEditMode(null);
          setShowSecondaryEdit(false);
          onSaved?.();
        }
      } catch (error) {
        console.error('[ProductDetailDrawer] B2B save error:', error);
        toast.error('저장 중 오류가 발생했습니다');
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
      // 1. 공급 조건 + isPublic + B2C 설명 업데이트 (Master 기준정보 제외)
      // WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1:
      //   상품명·카테고리·브랜드·사양·원산지는 ProductMaster 기준정보다.
      //   공급자 offer 수정은 공급 조건 수정이지 master 편집이 아니므로 전송하지 않는다
      //   (서버도 무시한다 — offer.service resolveMasterWriteFields).
      const payload = {
        priceGeneral: form.priceGeneral ?? undefined,
        priceGold: form.priceGold,
        consumerReferencePrice: form.consumerReferencePrice,
        stockQuantity: form.stockQuantity,
        isActive: form.isActive,
        // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: isPublic 직접 전달
        isPublic: form.isPublic,
        // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
        isFeatured: form.isFeatured,
        // WO-NETURE-PRODUCT-DRAWER-B2C-EDIT-RESTORE-V1: B2C 설명 저장 복구
        consumerShortDescription: editConsumerShort.trim() || null,
        consumerDetailDescription: editConsumerDetail.trim() || null,
        // WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1:
        // serviceKeys 는 상품 정보 저장에서 제외 — 공급 방식 변경은 [공급 방식 변경] 모달(distribution API)로만 처리.
      };
      const result = await supplierApi.updateProduct(product.id, payload);

      if (!result.success) {
        toast.error(`저장 실패: ${offerSaveErrorMessage(result.error)}`);
        setSaving(false);
        return;
      }

      // 2. B2B 설명 업데이트 (전용 엔드포인트)
      const bizShort = editBizShort.trim() || null;
      const bizDetail = editBizDetail.trim() || null;
      if (
        editBizShort !== (product.businessShortDescription || '') ||
        editBizDetail !== (product.businessDetailDescription || '')
      ) {
        const bizResult = await supplierApi.updateBusinessContent(product.id, {
          businessShortDescription: bizShort,
          businessDetailDescription: bizDetail,
        });
        if (!bizResult.success) {
          // WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1:
          //   console.warn 만 남기면 공급자는 B2B 설명이 저장된 줄 안다.
          toast.error(`B2B 설명 저장 실패: ${offerSaveErrorMessage(bizResult.error)}`);
        }
      }

      // WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1:
      // serviceKeys 변경 시 auto submitForApproval 우회 제거 — 공급 방식 변경/승인요청은 distribution API 단일 경로.

      setEditMode(null);
      setShowSecondaryEdit(false);
      onSaved?.();
    } catch (error) {
      console.error('[ProductDetailDrawer] save error:', error);
      toast.error('저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  return {
    editMode,
    isEditing,
    showSecondaryEdit,
    setShowSecondaryEdit,
    b2bEditRef,
    saving,
    showDirtyConfirm,
    setShowDirtyConfirm,
    editCategory,
    editBrand,
    editSpec,
    editOrigin,
    editBizShort,
    setEditBizShort,
    editBizDetail,
    setEditBizDetail,
    editConsumerShort,
    setEditConsumerShort,
    editConsumerDetail,
    setEditConsumerDetail,
    categories,
    brands,
    handleFormChange,
    startEdit,
    cancelEdit,
    handleClose,
    handleSave,
  };
}
