/**
 * SupplierProductFromMasterPage - 기존 표준 제품(ProductMaster)에 공급 연결
 *
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1
 *
 * Product Library 에서 선택한 masterId → POST /supplier/products/from-master.
 * - Master 기준정보(이름/바코드/카테고리/브랜드/규제)는 읽기 전용 표시만 하고 서버에 보내지 않는다
 *   (서버가 MASTER_FIELD_NOT_ALLOWED 로 거부). barcode/name 재추론 없음 · ProductMaster write 0.
 * - 공급 방식은 같은 화면에서 정한다. DRUG Master 는 전체 공개(PUBLIC) 불가 · 서비스 ≥1 필수
 *   (서버 assertDrugOfferAllowed 가 최종 판정 — 약국 대상 서비스만 허용).
 * - Master 상세는 Library 가 navigation state 로 넘긴다. 공급자용 get-master-by-id API 는 없으므로
 *   state 없이(새로고침·직접 진입) 오면 Library 로 되돌려 다시 선택하게 한다.
 */

import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, ShieldAlert } from 'lucide-react';
import { supplierApi, type MasterSearchResult } from '../../lib/api';
import { ProductForm, validateProductForm, AVAILABLE_SERVICES, type ProductFormData } from '../../components/product';
import SupplierActivationGate from '../../components/supplier/SupplierActivationGate';
import { GuideBlock } from '@o4o/shared-space-ui';

interface FromMasterLocationState {
  master?: MasterSearchResult;
}

const ERROR_MESSAGE: Record<string, string> = {
  SUPPLIER_NOT_ACTIVE: '공급자 계정이 아직 활성화되지 않았습니다. 승인 완료 후 공급 연결할 수 있습니다.',
  SUPPLIER_NOT_FOUND: '공급자 정보를 찾을 수 없습니다. 공급자 등록 상태를 확인해 주세요.',
  MASTER_ID_REQUIRED: '연결할 제품이 지정되지 않았습니다. 제품 라이브러리에서 다시 선택해 주세요.',
  MASTER_NOT_FOUND: '선택한 제품을 찾을 수 없습니다. 제품 라이브러리에서 다시 선택해 주세요.',
  MASTER_INACTIVE: '선택한 제품은 현재 비활성 상태라 공급 연결할 수 없습니다.',
  MASTER_FIELD_NOT_ALLOWED: '제품 기준정보는 이 화면에서 변경할 수 없습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.',
  SUPPLIER_ID_NOT_ALLOWED: '허용되지 않은 항목이 포함되어 있습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.',
  OFFER_ALREADY_EXISTS: '이미 이 제품에 공급 상품이 등록되어 있습니다. 내 공급 상품 목록에서 확인해 주세요.',
  OFFER_IN_RECYCLE_BIN: '이 제품의 공급 상품이 휴지통에 있습니다. 휴지통에서 복구하거나 영구 삭제 후 다시 등록해 주세요.',
  DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN: '의약품은 전체 공개로 공급할 수 없습니다. 약국 대상 서비스를 선택해 주세요.',
  DRUG_SERVICE_CONTEXT_REQUIRED: '의약품은 공급 대상 서비스를 1개 이상 선택해야 합니다.',
  DRUG_NON_PHARMACY_SERVICE: '선택한 서비스는 의약품 공급 대상(약국)이 아닙니다. 약국 대상 서비스만 선택해 주세요.',
  REGULATED_PRODUCT_SERVICE_REQUIRED: '규제 제품은 약국 대상 서비스에만 공급할 수 있습니다.',
  PRICE_REQUIRED: '공급가를 입력해 주세요.',
  INVALID_PRICE: '공급가는 0 이상의 숫자여야 합니다.',
  INTERNAL_ERROR: '서버 오류로 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

function errorMessage(code: string | null | undefined, message?: string | null): string {
  if (!code) return '공급 연결에 실패했습니다.';
  return ERROR_MESSAGE[code] ?? (message ? `${message} (${code})` : `공급 연결에 실패했습니다. (${code})`);
}

const REGULATORY_LABEL: Record<string, string> = {
  GENERAL: '일반',
  COSMETIC: '화장품',
  HEALTH_FUNCTIONAL: '건강기능식품',
  QUASI_DRUG: '의약외품',
  MEDICAL_DEVICE: '의료기기',
  DRUG: '의약품',
};

export default function SupplierProductFromMasterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const masterId = searchParams.get('masterId') ?? '';
  const master = (location.state as FromMasterLocationState | null)?.master ?? null;
  const masterMatches = !!master && master.id === masterId;
  const isDrug = masterMatches && master?.regulatoryType === 'DRUG';

  const [form, setForm] = useState<ProductFormData>({
    marketingName: master?.name ?? '',
    priceGeneral: null,
    priceGold: null,
    consumerReferencePrice: null,
    stockQuantity: 0,
    isActive: true,
    isPublic: false,
    serviceKeys: [],
    isFeatured: false,
  });
  const [isPublic, setIsPublic] = useState(false);
  const [serviceKeys, setServiceKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState<{ offerId: string; approvalStatus?: string } | null>(null);

  const validation = useMemo(() => validateProductForm(form, 'create'), [form]);
  const drugRuleError = isDrug && serviceKeys.length === 0
    ? '의약품은 약국 대상 서비스를 1개 이상 선택해야 합니다.'
    : '';
  const canSubmit = masterMatches && Object.keys(validation).length === 0 && !drugRuleError && !submitting;

  const toggleService = (key: string) => {
    setServiceKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    const result = await supplierApi.createOfferFromMaster({
      masterId,
      priceGeneral: form.priceGeneral ?? 0,
      priceGold: form.priceGold ?? null,
      consumerReferencePrice: form.consumerReferencePrice ?? null,
      stockQuantity: form.stockQuantity || 0,
      isFeatured: form.isFeatured,
      isPublic: isDrug ? false : isPublic,
      serviceKeys,
    });
    setSubmitting(false);
    if (result.success && result.data) {
      setDone({ offerId: result.data.id, approvalStatus: result.data.approvalStatus });
    } else {
      setSubmitError(errorMessage(result.error, result.message));
    }
  };

  // ── masterId / state 없음 → Library 로 안내 ──
  if (!masterId || !masterMatches || !master) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-lg font-bold text-amber-800">연결할 제품 정보가 없습니다</h1>
          <p className="text-sm text-amber-700 mt-1">
            이 화면은 제품 라이브러리에서 제품을 선택해 진입해야 합니다. 새로고침이나 직접 주소 입력으로는 제품 정보를 불러올 수 없습니다.
          </p>
          <button
            onClick={() => navigate('/supplier/products/library')}
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            제품 라이브러리로 이동
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <h1 className="text-xl font-bold text-emerald-800">공급 연결 완료</h1>
          <p className="text-sm text-emerald-700 mt-1">
            <strong>{master.name}</strong>에 공급 상품이 등록되었습니다
            {done.approvalStatus ? ` (승인 상태: ${done.approvalStatus})` : ''}.
          </p>
          <p className="text-xs text-emerald-700/80 mt-2">
            {isPublic && !isDrug
              ? '전체 공개로 등록되었습니다.'
              : serviceKeys.length > 0
                ? '서비스 공급은 각 서비스 운영자 승인 후 노출됩니다.'
                : '내부 상품(미노출)으로 등록되었습니다. 상품 상세의 [공급 방식 변경]에서 언제든 바꿀 수 있습니다.'}
          </p>
          <p className="mt-2 text-[11px] text-emerald-600/70 font-mono">Offer ID {done.offerId}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <button onClick={() => navigate('/supplier/products')} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-emerald-400 hover:bg-emerald-50">
            내 공급 상품 목록
          </button>
          <button onClick={() => navigate('/supplier/products/library')} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-emerald-400 hover:bg-emerald-50">
            다른 제품 공급 연결
          </button>
        </div>
      </div>
    );
  }

  return (
    <SupplierActivationGate mode="gate">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <button
            onClick={() => navigate('/supplier/products/library')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> 제품 라이브러리
          </button>
          <h1 className="text-2xl font-bold text-slate-800">기존 제품에 공급 연결</h1>
          <p className="text-slate-500 mt-1">표준 제품 정보는 그대로 두고, 내 공급가와 공급 방식만 설정합니다.</p>
        </div>

        <GuideBlock
          title="표준 제품에 공급 상품을 연결합니다."
          description="제품명·바코드·카테고리·브랜드·규제 정보는 표준 제품(ProductMaster)의 값이며 여기서 바꿀 수 없습니다. 제품 정보가 다르면 신규 제품 검토 요청으로 제출해 주세요."
          steps={[
            '선택한 제품 정보를 확인합니다',
            '공급가·소비자 참고가·재고를 입력합니다',
            '공급 방식(전체 공개 / 서비스 공급 / 내부)을 선택하고 등록합니다',
          ]}
        />

        {/* Master (read-only) */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
              {master.primaryImageUrl ? (
                <img src={master.primaryImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-7 h-7 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-500 mb-1">표준 제품 (읽기 전용)</div>
              <div className="text-lg font-semibold text-slate-800 break-words">{master.name || master.regulatoryName}</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {master.regulatoryName && master.regulatoryName !== master.name && (
                  <><dt className="text-slate-400">규제명</dt><dd className="text-slate-700">{master.regulatoryName}</dd></>
                )}
                <dt className="text-slate-400">바코드</dt><dd className="text-slate-700 font-mono">{master.barcode ?? '없음'}</dd>
                <dt className="text-slate-400">제조사</dt><dd className="text-slate-700">{master.manufacturerName || '-'}</dd>
                <dt className="text-slate-400">브랜드</dt><dd className="text-slate-700">{master.brand?.name ?? '-'}</dd>
                <dt className="text-slate-400">카테고리</dt><dd className="text-slate-700">{master.category?.name ?? '-'}</dd>
                <dt className="text-slate-400">규제 유형</dt>
                <dd className="text-slate-700">{master.regulatoryType ? (REGULATORY_LABEL[master.regulatoryType] ?? master.regulatoryType) : '-'}</dd>
                {master.specification && (
                  <><dt className="text-slate-400">규격</dt><dd className="text-slate-700">{master.specification}</dd></>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Offer fields */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">공급 조건</h3>
          <ProductForm
            mode="create"
            initialData={form}
            onChange={(data) => setForm(data)}
            hideDistribution
            masterNameReadOnly
          />
        </div>

        {/* Distribution */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="text-lg font-semibold text-slate-800">공급 방식</h3>

          {isDrug && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                의약품은 <strong>전체 공개로 공급할 수 없고</strong>, 약국 대상 서비스를 1개 이상 선택해야 합니다.
                약국 대상이 아닌 서비스는 서버가 거부합니다(예: KPA Society 는 약국 대상).
              </div>
            </div>
          )}

          <label
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              isDrug
                ? 'opacity-50 cursor-not-allowed border-slate-200'
                : isPublic
                  ? 'border-emerald-500 bg-emerald-50 cursor-pointer'
                  : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              checked={isPublic && !isDrug}
              disabled={isDrug}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <div>
              <p className="font-medium text-slate-800">전체 공개</p>
              <p className="text-sm text-slate-500">{isDrug ? '의약품은 선택할 수 없습니다' : '모든 매장에 자동 노출됩니다'}</p>
            </div>
          </label>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">서비스별 공급</p>
            <p className="text-xs text-slate-400 mb-3">특정 서비스에 공급하려면 선택하세요 (서비스 운영자 승인 필요)</p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SERVICES.map((svc) => {
                const selected = serviceKeys.includes(svc.key);
                return (
                  <label
                    key={svc.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleService(svc.key)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">{svc.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {!isDrug && !isPublic && serviceKeys.length === 0 && (
            <p className="text-xs text-amber-600">전체 공개도 서비스 공급도 선택하지 않으면 내부 상품(미노출)으로 등록됩니다.</p>
          )}
          {drugRuleError && <p className="text-xs text-rose-600">{drugRuleError}</p>}
        </div>

        {submitError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/supplier/products/library')}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '등록 중...' : '공급 상품 등록'}
          </button>
        </div>
      </div>
    </SupplierActivationGate>
  );
}
