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
 *
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 (외부 LLM First):
 *   직접 입력 · 사진 · PDF · URL · Import Assistant · ChatGPT 결과 → 모두 이 화면의 Draft 하나로 모인다.
 *   "ChatGPT로 작업" 패널은 Prompt 복사 + 결과 JSON 적용(parse/validation → 폼 채움)만 하고 저장하지 않는다.
 *   내부 AI endpoint 호출 0 · 적용 후에도 제출은 사용자의 [검토 요청] 뿐 · 적용된 바코드로 기존 Master 를 찾으면 from-master 로 안내.
 *   브랜드는 O4O Brand 목록에서 직접 선택할 때만 brandId 를 보낸다(문자열 유사도 자동 매칭 · 자동 생성 없음).
 */

import { useMemo } from 'react';
import SupplierProductImportPage from './SupplierProductImportPage';
import { toast } from '@o4o/error-handling';
import { ProductForm } from '../../components/product';
import MediaPickerModal from '../../components/common/MediaPickerModal';
import SupplierActivationGate from '../../components/supplier/SupplierActivationGate';
import { loadAndClearDraft } from '../../lib/product-import/storage';
import { GuideBlock } from '@o4o/shared-space-ui';
import SupplierProductLlmAssistPanel from '../../components/supplier/SupplierProductLlmAssistPanel';
import { STEPS } from './product-create/candidateFormHelpers';
import { useSupplierCandidateForm } from './product-create/useSupplierCandidateForm';
import { useSupplierCandidateMedia } from './product-create/useSupplierCandidateMedia';
import { useSupplierCandidateSubmission } from './product-create/useSupplierCandidateSubmission';
import { useSupplierCandidateGuide } from './product-create/useSupplierCandidateGuide';
import SupplierCandidateBasicFields from './product-create/SupplierCandidateBasicFields';
import SupplierCandidateMediaFields from './product-create/SupplierCandidateMediaFields';

export default function SupplierProductCreatePage() {
  const importDraft = useMemo(() => loadAndClearDraft(), []);
  const formState = useSupplierCandidateForm(importDraft);
  const media = useSupplierCandidateMedia(importDraft);
  const { registered, submitting, handleSubmit } = useSupplierCandidateSubmission(formState, media);
  const { guideTitle, guideDesc, guideSteps } = useSupplierCandidateGuide();
  const {
    navigate,
    productType,
    isReviewOriented,
    currentStep,
    form,
    submitError,
    handleApplyDraft,
    productFormInitialData,
    handleProductFormChange,
    goNext,
    goBack,
    goToSourceImport,
  } = formState;
  const {
    showThumbnailPicker,
    setShowThumbnailPicker,
    setContentItems,
    imagePickerTarget,
    setImagePickerTarget,
    mediaPickerTarget,
    setMediaPickerTarget,
    handleThumbnailFromLibrary,
  } = media;
  if (formState.sourceImportOpen) {
    return <SupplierProductImportPage
      onCancel={() => formState.setSourceImportOpen(false)}
      onApplyDraft={(draft) => {
        formState.applySourceImport(draft);
        if (!media.thumbnailSource && draft.thumbnailUrl) media.setThumbnailSource({ kind: 'library', url: draft.thumbnailUrl });
        media.setContentItems((prev) => [...prev, ...[...new Set([...draft.detailImageUrls, ...draft.contentImageUrls])].filter((url) => !prev.some((item) => item.kind === 'library' && item.url === url)).map((url) => ({ kind: 'library' as const, url }))]);
        toast.success('빈 입력란과 이미지를 보완했습니다. 기존 입력과 선택한 이미지는 유지됩니다. 확인 후 검토 요청을 제출하세요.');
      }}
    />;
  }
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
            아직 <strong>공급 상품(Offer)으로 등록된 것은 아닙니다.</strong> 운영자가 제품 정보를
            검토해 표준 제품(ProductMaster)으로 확정하면, 제품 라이브러리에서 해당 제품을 선택해
            공급가·공급 방식을 설정하고 공급을 시작할 수 있습니다.
            {productType?.rx && ' 처방의약품은 승격 후에도 약국 대상 서비스 공급으로만 연결됩니다.'}
          </p>
          {(registered.candidateId || registered.identifierValue) && (
            <p className="mt-2 text-[11px] text-blue-600/70 font-mono">
              {registered.identifierValue ? `식별자 ${registered.identifierValue} · ` : ''}요청 ID{' '}
              {registered.candidateId ?? '-'}
            </p>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">다음 작업</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/supplier/products/register')}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50"
            >
              다른 제품 검토 요청
            </button>
            <button
              onClick={() => navigate('/supplier/products/library')}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50"
            >
              제품 라이브러리에서 기존 제품 공급 연결
            </button>
            <button
              onClick={() => navigate('/supplier/products')}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50"
            >
              내 공급 상품 목록
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            검토 결과는 운영자 승격 후 제품 라이브러리 검색에 반영됩니다. 공급 오퍼·이벤트
            오퍼·펀딩은 공급 상품 등록 후의 별도 활동입니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SupplierActivationGate mode="gate">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">신규 제품 검토 요청</h1>
            <p className="text-slate-500 mt-1">
              아직 표준 제품에 없는 제품 정보를 제출합니다. 운영자 검토 후 공급 연결이 가능합니다.
            </p>
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
          description={
            guideDesc ??
            '이 화면은 공급 상품을 바로 만들지 않습니다. 제출한 제품 정보는 운영자 검토 후 표준 제품으로 확정되며, 그 뒤 제품 라이브러리에서 선택해 공급가·공급 방식을 설정합니다. 이미 표준 제품에 있는 제품은 제품 라이브러리에서 바로 공급 연결하세요. 사진·PDF·URL 이 있으면 [ChatGPT로 작업]으로 제품정보를 정리해 입력란에 채운 뒤 확인·수정할 수 있습니다.'
          }
          steps={
            guideSteps ?? [
              'Step 1: 상품명, 카테고리, 브랜드, 규제 정보를 입력합니다 (직접 입력 · 상세페이지 소스 · ChatGPT 결과 적용 중 편한 방법으로. 바코드가 있으면 조회해 기존 제품 여부를 확인)',
              'Step 2: 기본 공급가 초안을 입력합니다 (승격 후 Offer 연결 시 참고값)',
              'Step 3: 대표 이미지와 상세 설명을 첨부하고 검토 요청을 제출합니다',
            ]
          }
          compact
        />

        {/* WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2: 제품 유형별 안내/경고 */}
        {productType && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              productType.rx
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : isReviewOriented
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <div className="font-semibold">선택한 제품 유형: {productType.label}</div>
            <p className="mt-1 leading-relaxed">
              {productType.key === 'non_drug' &&
                '일반 매장 및 약국 매장 유형에 공급 가능한 일반 제품입니다.'}
              {productType.key === 'quasi_drug' &&
                '의약외품입니다. 품목/신고 관련 정보 입력을 권장합니다.'}
              {productType.key === 'otc_drug' &&
                '비처방 의약품(OTC)입니다. 약국 매장 유형 중심으로 검토되며, 일반 매장 노출·온라인 판매는 제한될 수 있습니다.'}
              {productType.key === 'rx_drug' &&
                '처방의약품입니다. 일반 판매·고객 노출·이벤트 오퍼·유통참여형 펀딩으로 자동 연결되지 않으며, 운영자 검토 후 약국 대상 유통 정보 단위로만 관리됩니다.'}
              {productType.key === 'unclassified' &&
                '분류가 확정되지 않은 제품입니다. 등록 후 운영자가 검토해 유형을 확정합니다.'}
            </p>
            {productType.pharmacyTarget && (
              <p className="mt-1 text-xs opacity-80">
                O4O는 유통 정보화 플랫폼으로, 의약품도 제품/유통 단위로만 다룹니다.
                재고·유효기간·일련번호·이력추적은 입력받지 않습니다.
              </p>
            )}
          </div>
        )}

        {/* WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1: Import Assistant 초안 알림 */}
        {importDraft && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            상세페이지 소스에서 자동 추출한 초안입니다. 아래 입력란을 검토·수정한 뒤 검토 요청을
            제출해 주세요. 누락·오류가 많으면 [ChatGPT로 작업]으로 보정할 수 있습니다.
          </div>
        )}

        {/* WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1: 외부 LLM 작업 패널(Prompt 복사 · 결과 JSON 적용 · 저장 없음) */}
        {!registered && (
          <SupplierProductLlmAssistPanel
            fromImport={!!importDraft}
            context={{
              productTypeLabel: productType?.label ?? null,
              regulatoryType: productType?.regulatoryType ?? form.regulatoryType ?? null,
              currentDraft: {
                name: form.marketingName || null,
                barcode: form.barcode || null,
                brandName: form.brandName || null,
                manufacturerName: form.manufacturerName || null,
                specification: form.specification || null,
                originCountry: form.originCountry || null,
                regulatoryName: form.regulatoryName || null,
                mfdsPermitNumber: form.mfdsPermitNumber || null,
                offerDraft: {
                  priceGeneral: form.priceGeneral ? Number(form.priceGeneral) : null,
                  consumerReferencePrice: form.consumerReferencePrice
                    ? Number(form.consumerReferencePrice)
                    : null,
                  consumerShortDescription: null,
                  consumerDetailDescription: null,
                  isFeatured: form.isFeatured,
                },
              },
            }}
            onApplyDraft={handleApplyDraft}
            onNotify={(message, kind) =>
              kind === 'error' ? toast.error(message) : toast.success(message)
            }
          />
        )}

        {/* ==================== Step Indicator ==================== */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, idx) => {
            const step = idx + 1;
            const isActive = step === currentStep;
            const isDone = step < currentStep;
            return (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : step}
                </div>
                <span
                  className={`text-sm font-medium truncate ${
                    isActive ? 'text-emerald-700' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {currentStep === 1 && <SupplierCandidateBasicFields controller={formState} />}

        {/* ==================== Step 2: 기본 공급가 (WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1) ====================
           정보-우선: 등록 단계에서는 기본 공급가만 입력하고, 공급 방식(전체 공개/서비스 공급)은 등록 후 별도 설정한다. */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">기본 공급가 (초안)</h3>
            <p className="text-xs text-slate-500 mb-5">
              검토 요청에 함께 보관되는 <strong>참고 초안</strong>입니다. 실제 공급가·공급
              방식·재고는 운영자 승격 후 제품 라이브러리에서 공급 연결할 때 확정합니다.
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

        {currentStep === 3 && <SupplierCandidateMediaFields formState={formState} media={media} />}

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
            setContentItems((prev) => [...prev, { kind: 'library', url: asset.url }]);
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
