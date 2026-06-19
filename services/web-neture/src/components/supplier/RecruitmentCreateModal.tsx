/**
 * RecruitmentCreateModal — 공급자 판매자 모집 생성 (최소 입력)
 *
 * WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1
 *
 * 제품 목록 행에서 "판매자 모집 연결" 선택 시 열림. PRIVATE 유통 제품만 생성 가능(backend 검증).
 * 가격 구조 변경 없음 — commissionRate/consumerPrice 는 모집 commission/참조값.
 */
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supplierRecruitmentApi } from '../../lib/api/supplier';

// 모집 대상 서비스 후보 (약국 대상은 의약품/규제 상품 시 backend 가 gate)
const SERVICE_OPTIONS: Array<{ key: string; label: string; pharmacy: boolean }> = [
  { key: 'glycopharm', label: 'GlycoPharm (약국)', pharmacy: true },
  { key: 'kpa-society', label: 'KPA Society (약국)', pharmacy: true },
  { key: 'k-cosmetics', label: 'K-Cosmetics', pharmacy: false },
  { key: 'neture', label: 'Neture', pharmacy: false },
];

interface Props {
  product: { masterId: string; name: string; regulatoryType?: string; distributionType?: string };
  onClose: () => void;
  onCreated?: () => void;
}

// WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1:
//   규제(의약품 계열) 상품은 약국 대상 서비스에만 모집 가능 — 프론트도 반영(백엔드 gate 가 최종 방어).
const REGULATED_TYPES = ['DRUG', 'QUASI_DRUG', 'MEDICAL_DEVICE', 'HEALTH_FUNCTIONAL'];

export default function RecruitmentCreateModal({ product, onClose, onCreated }: Props) {
  // WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1: 복수 서비스 선택
  const [serviceKeys, setServiceKeys] = useState<string[]>([]);
  const [commissionRate, setCommissionRate] = useState('');
  const [consumerPrice, setConsumerPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notPrivate = product.distributionType && product.distributionType !== 'PRIVATE';
  const isRegulated = !!product.regulatoryType && REGULATED_TYPES.includes(product.regulatoryType);

  const toggleService = (key: string) => {
    setError(null);
    setServiceKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = async () => {
    setError(null);
    if (serviceKeys.length === 0) {
      setError('모집할 서비스를 한 개 이상 선택해 주세요.');
      return;
    }
    setSubmitting(true);
    const result = await supplierRecruitmentApi.create({
      masterId: product.masterId,
      serviceKeys,
      commissionRate: commissionRate ? Number(commissionRate) : undefined,
      consumerPrice: consumerPrice ? Number(consumerPrice) : undefined,
    });
    setSubmitting(false);
    if (result.success) {
      onCreated?.();
      onClose();
    } else {
      setError(result.message || '모집 생성에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">판매자 모집 생성</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-800">{product.name}</div>
            <p className="text-xs text-slate-400 mt-0.5">
              제품을 취급할 약국/매장 판매자를 모집합니다. 모집 승인 시 해당 판매자가 제품을 주문할 수 있게 됩니다.
            </p>
          </div>

          {notPrivate && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
              판매자 모집은 <strong>PRIVATE(판매자 제한)</strong> 유통 제품만 가능합니다. 제품 편집에서 유통 타입을 PRIVATE 로 설정한 뒤 다시 시도해 주세요.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">모집할 서비스 <span className="text-red-500">*</span> <span className="text-xs font-normal text-slate-400">(복수 선택 가능)</span></label>
            <div className="space-y-1.5">
              {SERVICE_OPTIONS.map((s) => {
                const disabled = isRegulated && !s.pharmacy;
                const checked = serviceKeys.includes(s.key);
                return (
                  <label
                    key={s.key}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${
                      disabled
                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : checked
                        ? 'border-blue-500 bg-blue-50 text-slate-800 cursor-pointer'
                        : 'border-slate-200 text-slate-700 hover:border-blue-300 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleService(s.key)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span>{s.label}</span>
                    {disabled && <span className="ml-auto text-xs">약국 전용 상품 — 선택 불가</span>}
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {isRegulated
                ? '의약품·규제 상품은 약국 대상 서비스(GlycoPharm / KPA)에만 모집할 수 있습니다.'
                : '여러 서비스를 선택하면 서비스별로 모집이 생성되며, 운영자 노출 승인도 서비스별로 진행됩니다.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">수수료율 (%)</label>
              <input
                type="number" min={0} max={100} step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="예: 10"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">소비자가 (참조)</label>
              <input
                type="number" min={0}
                value={consumerPrice}
                onChange={(e) => setConsumerPrice(e.target.value)}
                placeholder="선택"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            모집 생성
          </button>
        </div>
      </div>
    </div>
  );
}
