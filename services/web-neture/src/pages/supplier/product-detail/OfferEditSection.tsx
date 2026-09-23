/**
 * OfferEditSection — Supplier Offer 편집 모드 본문
 *
 * WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §A (2026-09-23)
 *   ProductDetailDrawer 분해. 공급자가 편집하는 축은 SupplierProductOffer 뿐이다 —
 *   카테고리·브랜드·사양·원산지는 ProductMaster 기준정보라 읽기 전용으로만 표시한다.
 *   저장·취소 액션과 approvalActions 는 Drawer 가 계속 소유한다(Operator 승인 화면 계약 보존).
 */
import type { Dispatch, ReactElement, RefObject, SetStateAction } from 'react';
import { Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { FormField } from '@o4o/operator-ux-core';
import { RichTextEditor, type MediaInsert } from '@o4o/content-editor';
import { ProductForm, type ProductFormData } from '../../../components/product';
import type { SupplierProduct, ProductImage, CategoryTreeItem, BrandItem } from '../../../lib/api';
import type { useContentTemplates } from '../../../hooks/useContentTemplates';

export interface OfferEditSectionProps {
  product: SupplierProduct;
  isEditing: boolean;
  editMode: 'b2c' | 'b2b' | null;
  showSecondaryEdit: boolean;
  setShowSecondaryEdit: Dispatch<SetStateAction<boolean>>;
  saving: boolean;
  b2bEditRef: RefObject<HTMLDivElement | null>;
  images: ProductImage[];
  categories: CategoryTreeItem[];
  brands: BrandItem[];
  editCategory: string | null;
  editBrand: string | null;
  editSpec: string;
  editOrigin: string;
  editBizShort: string;
  setEditBizShort: Dispatch<SetStateAction<string>>;
  editBizDetail: string;
  setEditBizDetail: Dispatch<SetStateAction<string>>;
  editConsumerShort: string;
  setEditConsumerShort: Dispatch<SetStateAction<string>>;
  editConsumerDetail: string;
  setEditConsumerDetail: Dispatch<SetStateAction<string>>;
  editorImageUpload: (file: File) => Promise<string>;
  setMediaPickerTarget: Dispatch<SetStateAction<((media: MediaInsert) => void) | null>>;
  tpl: ReturnType<typeof useContentTemplates>;
  canCreatePublicTemplate: boolean;
  toFormData: (p: SupplierProduct) => Partial<ProductFormData>;
  handleFormChange: (data: ProductFormData, dirty: boolean) => void;
  INPUT_CLASS: string;
}

export default function OfferEditSection({
  product,
  isEditing,
  editMode,
  showSecondaryEdit,
  setShowSecondaryEdit,
  saving,
  b2bEditRef,
  images,
  categories,
  brands,
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
  editorImageUpload,
  setMediaPickerTarget,
  tpl,
  canCreatePublicTemplate,
  toFormData,
  handleFormChange,
  INPUT_CLASS,
}: OfferEditSectionProps): ReactElement {
  return (
    <>
        {/* ── 편집 모드 배너 (WO-NETURE-PRODUCT-DRAWER-DUAL-EDIT-ENTRY-V1) ── */}
        {isEditing && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
            editMode === 'b2c' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'
          }`}>
            <Pencil size={14} />
            {editMode === 'b2c' ? 'B2C 편집 모드' : 'B2B 편집 모드'}
          </div>
        )}

        {/* ── B2B 모드: B2B 설명 우선 표시 ── */}
        {isEditing && editMode === 'b2b' && (
          <div ref={b2bEditRef} className="mb-5 p-4 bg-teal-50/40 border border-teal-200 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-teal-600 uppercase tracking-wider">판매자 지원 설명 (B2B)</h4>

            <FormField label="B2B 간단 소개">
              <RichTextEditor
                value={editBizShort}
                onChange={(c) => setEditBizShort(c.html)}
                editable={!saving}
                placeholder="거래처용 간단 소개"
                minHeight="80px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
                existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
              />
            </FormField>

            <FormField label="B2B 상세 설명">
              <RichTextEditor
                value={editBizDetail}
                onChange={(c) => setEditBizDetail(c.html)}
                editable={!saving}
                placeholder="거래처용 상세 설명"
                minHeight="150px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
                existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                showTemplateActions
                templateCategory="product"
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
            </FormField>
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

        {/* ── 수정 모드: 공통 기본 정보 (WO-NETURE-SUPPLIER-PRODUCT-DRAWER-EDIT-ORDER-V1) ── */}
        {isEditing && (editMode === 'b2c' || showSecondaryEdit) && (
          <div className="mb-5 p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">기본 정보 (O4O 기준정보 · 읽기 전용)</h4>

            {/*
              WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1
              카테고리·브랜드·사양·원산지는 ProductMaster 기준정보다. 같은 master 에 연결된
              다른 공급자·다른 서비스가 함께 쓰는 값이라 공급자 화면에서 덮어쓰지 않는다.
              입력을 남겨두면 저장된 것처럼 보이므로 읽기 전용으로 표시한다.
            */}
            <p className="text-xs text-slate-500">
              O4O 기준 상품정보입니다. 공급자 화면에서는 수정되지 않습니다 — 수정이 필요하면 운영자에게 요청하세요.
            </p>

            <FormField label="카테고리">
              <input
                type="text"
                value={categories.find((c) => c.id === editCategory)?.name || '미지정'}
                disabled
                readOnly
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField label="브랜드">
              <input
                type="text"
                value={brands.find((b) => b.id === editBrand)?.name || '미지정'}
                disabled
                readOnly
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField label="사양">
              <input type="text" value={editSpec || '미지정'} disabled readOnly className={INPUT_CLASS} />
            </FormField>

            <FormField label="원산지">
              <input type="text" value={editOrigin || '미지정'} disabled readOnly className={INPUT_CLASS} />
            </FormField>
          </div>
        )}

        {/* ── 수정 모드: ProductForm (상품명 · 가격 · 재고 · 노출 설정) ── */}
        {isEditing && (editMode === 'b2c' || showSecondaryEdit) && (
          <div className="mb-5 p-4 bg-amber-50/40 border border-amber-200 rounded-xl">
            <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">상품명 · 가격 · 재고 · 노출 설정</h4>
            <ProductForm
              mode="edit"
              initialData={toFormData(product)}
              onChange={handleFormChange}
              disabled={saving}
              hideDistribution
              masterNameReadOnly
            />
          </div>
        )}

        {/* ── 수정 모드: 소비자 공개 설명 (B2C) ── */}
        {isEditing && (editMode === 'b2c' || showSecondaryEdit) && (
          <div className="mb-5 p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">소비자 공개 설명 (B2C)</h4>

            <FormField label="소비자 간단 소개">
              <RichTextEditor
                value={editConsumerShort}
                onChange={(c) => setEditConsumerShort(c.html)}
                editable={!saving}
                placeholder="소비자에게 보이는 간단 소개"
                minHeight="80px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
                existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
              />
            </FormField>

            <FormField label="소비자 상세 설명">
              <RichTextEditor
                value={editConsumerDetail}
                onChange={(c) => setEditConsumerDetail(c.html)}
                editable={!saving}
                placeholder="소비자에게 보이는 상세 설명"
                minHeight="150px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
                existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                showTemplateActions
                templateCategory="product"
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
            </FormField>
          </div>
        )}

        {/* ── 수정 모드: 판매자 지원 설명 (B2B) — B2C 모드의 보조 섹션으로만 표시 (B2B 모드는 위에서 우선 렌더링) ── */}
        {isEditing && editMode === 'b2c' && showSecondaryEdit && (
          <div className="mb-5 p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">판매자 지원 설명 (B2B)</h4>

            <FormField label="B2B 간단 소개">
              <RichTextEditor
                value={editBizShort}
                onChange={(c) => setEditBizShort(c.html)}
                editable={!saving}
                placeholder="거래처용 간단 소개"
                minHeight="80px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
                existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
              />
            </FormField>

            <FormField label="B2B 상세 설명">
              <RichTextEditor
                value={editBizDetail}
                onChange={(c) => setEditBizDetail(c.html)}
                editable={!saving}
                placeholder="거래처용 상세 설명"
                minHeight="150px"
                onImageUpload={editorImageUpload}
                onMediaLibraryPick={(insertMedia) => setMediaPickerTarget(() => insertMedia)}
                existingImages={images.filter((i) => i.type !== 'thumbnail').map((i) => ({ id: i.id, url: i.imageUrl }))}
                showTemplateActions
                templateCategory="product"
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
            </FormField>
          </div>
        )}
    </>
  );
}
