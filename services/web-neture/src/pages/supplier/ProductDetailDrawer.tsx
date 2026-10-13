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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Pencil } from 'lucide-react';
import type { SupplierProduct } from '../../lib/api';
import { Section, InfoRow } from '@o4o/operator-ux-core';
import { useContentTemplates } from '../../hooks/useContentTemplates';
import { useAuth } from '../../contexts';
import MediaPickerModal from '../../components/common/MediaPickerModal';
import SupplierImageSection from './product-detail/SupplierImageSection';
import MasterReadOnlySection from './product-detail/MasterReadOnlySection';
import OfferDistributionSection from './product-detail/OfferDistributionSection';
import OfferEditSection from './product-detail/OfferEditSection';
import { useSupplierProductEditor } from './product-detail/useSupplierProductEditor';
import { useSupplierProductImages } from './product-detail/useSupplierProductImages';
import { useSupplierSpotPolicies } from './product-detail/useSupplierSpotPolicies';
import { useSupplierDistribution } from './product-detail/useSupplierDistribution';
import { useSupplierServicePrices } from './product-detail/useSupplierServicePrices';
import SupplierSpotPolicySection from './product-detail/SupplierSpotPolicySection';
import SupplierDescriptionSections from './product-detail/SupplierDescriptionSections';
import SupplierDistributionModal from './product-detail/SupplierDistributionModal';
import SupplierServicePricesModal from './product-detail/SupplierServicePricesModal';
import { formatPrice, formatDate, toFormData } from './product-detail/productDetailHelpers';
import { DISTRIBUTION_TYPE_BADGE, REGULATORY_TYPE_LABELS, REGULATORY_TYPE_BADGE, VISIBILITY_STATUS, getVisibilityStatus } from '../../lib/productConstants';

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
// WO-NETURE-PRODUCT-DRAWER-FORM-STANDARD-COMPLIANCE-V1:
//   Section / InfoRow → @o4o/operator-ux-core 로 이동
//   Badge → 본 WO 범위 외 (Form Standard §11 D7), 인라인 유지

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

// WO-NETURE-PRODUCT-DRAWER-FORM-STANDARD-COMPLIANCE-V1: 공통 input 스타일
const INPUT_CLASS =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50';

export default function ProductDetailDrawer({ product, open, onClose, onSaved, approvalActions }: ProductDetailDrawerProps) {
  const editor = useSupplierProductEditor(product, open, onClose, onSaved);
  const {
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
    handleSave
  } = editor;
  const imageManagement = useSupplierProductImages(product, open, onSaved);
  const {
    images,
    loadingImages,
    uploading,
    uploadType,
    setUploadType,
    fileInputRef,
    mediaPickerTarget,
    setMediaPickerTarget,
    showImagePicker,
    setShowImagePicker,
    handleImageUpload,
    editorImageUpload,
    handleImageDelete,
    handleMediaPickerSelect
  } = imageManagement;
  const spot = useSupplierSpotPolicies(product, open);
  const distribution = useSupplierDistribution(product, onSaved);
  const {
    setDistMgmtOpen,
    setDistForm,
    setDistConfirmRemove
  } = distribution;
  const servicePrices = useSupplierServicePrices(product, open, onSaved);
  const {
    svcPrices,
    setSvcPriceOpen,
    setSvcPriceForm
  } = servicePrices;
  const [showSupplyGuide, setShowSupplyGuide] = useState(false);
  const navigate = useNavigate();
  // Template integration (WO-O4O-TEMPLATE-ADOPTION-NETURE-PRODUCT-V1)
  const { user } = useAuth();
  const tpl = useContentTemplates();
  const canCreatePublicTemplate = user?.roles?.some(
    (r: string) => r.includes('admin') || r.includes('operator') || r.includes('super_admin'),
  ) ?? false;

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

      {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1: 공급 방식 변경 모달 */}
      <SupplierDistributionModal product={product} controller={distribution} />

      {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1: 서비스별 공급가 설정 모달 */}
      <SupplierServicePricesModal product={product} controller={servicePrices} />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300">
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
                  aria-label="B2C 편집"
                >
                  <Pencil size={14} />
                  <span className="hidden sm:inline">B2C</span>
                </button>
                <button
                  onClick={() => startEdit('b2b')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
                  title="판매자 지원 정보 편집 (B2B)"
                  aria-label="B2B 편집"
                >
                  <Pencil size={14} />
                  <span className="hidden sm:inline">B2B</span>
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

          {/* ── 반려 안내 배너 (WO-O4O-NETURE-PRODUCT-APPROVAL-REJECTION-COPY-AND-RESUBMIT-UX-V1) ──
               반려 = 끝이 아니라 보완 후 재요청 가능함을 상단에 명확히 안내(상태 체계 불변). */}
          {!isEditing && !approvalActions && (() => {
            const rejectedApprovals = (product.serviceApprovals || []).filter(
              (sa) => sa.serviceKey !== 'neture' && sa.status === 'rejected',
            );
            if (rejectedApprovals.length === 0) return null;
            const reasons = rejectedApprovals.filter((sa) => sa.reason);
            return (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm font-bold text-red-700">이 제품은 반려되었습니다.</p>
                {reasons.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {reasons.map((sa, i) => (
                      <li key={i} className="text-xs text-red-600">반려 사유: {sa.reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-red-600">반려 사유가 입력되지 않았습니다.</p>
                )}
                <p className="mt-2 text-xs text-slate-600">
                  아래 정보를 확인하고 제품을 보완한 뒤 다시 승인 요청할 수 있습니다.
                </p>
              </div>
            );
          })()}

          {/* WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §A: Offer 편집 본문 분리 */}
          {product && (
            <OfferEditSection
              product={product}
              isEditing={isEditing}
              editMode={editMode}
              showSecondaryEdit={showSecondaryEdit}
              setShowSecondaryEdit={setShowSecondaryEdit}
              saving={saving}
              b2bEditRef={b2bEditRef}
              images={images}
              categories={categories}
              brands={brands}
              editCategory={editCategory}
              editBrand={editBrand}
              editSpec={editSpec}
              editOrigin={editOrigin}
              editBizShort={editBizShort}
              setEditBizShort={setEditBizShort}
              editBizDetail={editBizDetail}
              setEditBizDetail={setEditBizDetail}
              editConsumerShort={editConsumerShort}
              setEditConsumerShort={setEditConsumerShort}
              editConsumerDetail={editConsumerDetail}
              setEditConsumerDetail={setEditConsumerDetail}
              editorImageUpload={editorImageUpload}
              setMediaPickerTarget={setMediaPickerTarget}
              tpl={tpl}
              canCreatePublicTemplate={canCreatePublicTemplate}
              toFormData={toFormData}
              handleFormChange={handleFormChange}
              INPUT_CLASS={INPUT_CLASS}
            />
          )}

          {/* WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §A: 이미지 관리 섹션 분리 */}
          <SupplierImageSection
            images={images}
            loadingImages={loadingImages}
            isEditing={isEditing}
            uploading={uploading}
            uploadType={uploadType}
            setUploadType={setUploadType}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            handleImageDelete={handleImageDelete}
            setShowImagePicker={setShowImagePicker}
          />

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

          {/* WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §A: Master 기준정보 read-only */}
          {!isEditing && (
            <MasterReadOnlySection
              product={product}
              regType={regType}
              regLabel={regLabel}
              regBadgeCls={regBadgeCls}
              Badge={Badge}
            />
          )}

          {/* WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §A: Offer 배포 설정 분리 */}
          {!isEditing && (
            <OfferDistributionSection
              product={product}
              navigate={navigate}
              svcPrices={svcPrices}
              setSvcPriceForm={setSvcPriceForm}
              setSvcPriceOpen={setSvcPriceOpen}
              showSupplyGuide={showSupplyGuide}
              setShowSupplyGuide={setShowSupplyGuide}
              isEditing={isEditing}
              setDistForm={setDistForm}
              setDistConfirmRemove={setDistConfirmRemove}
              setDistMgmtOpen={setDistMgmtOpen}
              formatPrice={formatPrice}
              Badge={Badge}
            />
          )}

          {!isEditing && <SupplierDescriptionSections product={product} />}

          {/* WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §E-1 (2026-09-23):
              공급자 표면의 AI 태그 생성·추천·수동 태그 관리 UI 는 제거됐다.
              공급자 화면에서 내부 LLM 을 호출하지 않는다(product_masters.tags 동기화 경로 포함). */}

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

          {!isEditing && <SupplierSpotPolicySection product={product} controller={spot} />}

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
                product.approvalStatus === 'APPROVED' ? 'bg-green-50 text-green-700'
                  : product.approvalStatus === 'PENDING' ? 'bg-amber-50 text-amber-700'
                  : product.approvalStatus === 'REJECTED' ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }>
                {product.approvalStatus === 'APPROVED' ? '승인' : product.approvalStatus === 'PENDING' ? '대기' : product.approvalStatus === 'REJECTED' ? '거부' : (typeof product.approvalStatus === 'string' ? product.approvalStatus : '') || '-'}
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
                            : sa.status === 'cancelled' ? 'bg-slate-200 text-slate-600'
                            : 'bg-red-50 text-red-700'
                        }>
                          {sa.status === 'approved' ? '승인' : sa.status === 'pending' ? '대기' : sa.status === 'cancelled' ? '철회됨' : '반려'}
                        </Badge>
                      </div>
                      {sa.reason && (
                        <p className={`text-xs pl-3 mt-0.5 ${sa.status === 'cancelled' ? 'text-slate-500' : 'text-red-600'}`}>
                          {sa.status === 'cancelled' ? '철회 사유' : '반려 사유'}: {sa.reason}
                        </p>
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
        {!isEditing && approvalActions && product?.approvalStatus === 'PENDING' && (
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
          mediaPickerTarget?.({ type: 'image', url: asset.url, title: asset.originalName });
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
