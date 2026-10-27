/**
 * RecruitmentCreateModal — 공급자 판매자 모집 생성 (최소 입력)
 *
 * WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1
 *
 * 제품 목록 행에서 "판매자 모집 연결" 선택 시 열림. PRIVATE 유통 제품만 생성 가능(backend 검증).
 * 일반 공개 모집 공급가는 명시적으로 확정한다. commissionRate/consumerPrice는 기존 참조값이다.
 */
import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supplierRecruitmentApi } from '../../lib/api/supplier';

// 현재 일반 공개 모집의 공급가 확정 대상. 종료된 서비스의 기존 모집은 목록에서 보존한다.
const SERVICE_OPTIONS = [{key:'neture',label:'Neture'}];

interface Props {
  product: { masterId: string; name: string; regulatoryType?: string; distributionType?: string };
  onClose: () => void;
  onCreated?: () => void;
}

export default function RecruitmentCreateModal({ product, onClose, onCreated }: Props) {
  // 새 공급가 확정은 현재 Neture 일반 모집에만 연결한다.
  const [serviceKeys, setServiceKeys] = useState<string[]>([]);
  const [commissionRate, setCommissionRate] = useState('');
  const [consumerPrice, setConsumerPrice] = useState('');
  const [supplyUnitPrice,setSupplyUnitPrice]=useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);

  const notPrivate = product.distributionType && product.distributionType !== 'PRIVATE';


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
    const price=Number(supplyUnitPrice);
    if(!supplyUnitPrice.trim() || !Number.isInteger(price) || price<=0 || price>2147483647){setError('공급가는 1~2,147,483,647원의 정수로 입력해 주세요.');return;}
    if(submitting)return;
    setSubmitting(true);
    const result = await supplierRecruitmentApi.create({
      masterId: product.masterId,
      supplyUnitPrice:price,
      serviceKeys,
      commissionRate: commissionRate ? Number(commissionRate) : undefined,
      consumerPrice: consumerPrice ? Number(consumerPrice) : undefined,
    });
    if(!mounted.current)return;
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
          <button type="button" onClick={onClose} disabled={submitting} aria-label="모집 작성 닫기" className="text-slate-400 hover:text-slate-600"><X aria-hidden="true" className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-800">{product.name}</div>
            <p className="text-xs text-slate-400 mt-0.5">
              제품을 취급할 약국/매장 판매자를 모집합니다. 공개 모집은 게시 즉시 내 매장에 안내됩니다. 제품 등재와 공급 승인 조건은 별도로 적용됩니다.
            </p>
          </div>

          {notPrivate && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
              판매자 모집은 <strong>PRIVATE(판매자 제한)</strong> 유통 제품만 가능합니다. 제품 편집에서 유통 타입을 PRIVATE 로 설정한 뒤 다시 시도해 주세요.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">모집할 서비스 <span className="text-red-500">*</span></label>
            <div className="space-y-1.5">
              {SERVICE_OPTIONS.map((s) => {
                const disabled = submitting;
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

                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              가격과 참여 승인이 갖춰진 모집은 약국의 기존 상품 주문에서 이용합니다. 수취 주체·결제 가능 여부는 별도로 확인합니다.
            </p>
          </div>

          <div>
            <label htmlFor="recruitment-supply-price" className="block text-sm font-medium text-slate-700">모집 공급가 (원)</label>
            <input id="recruitment-supply-price" type="number" min={1} max={2147483647} step={1} value={supplyUnitPrice} disabled={submitting}
              onChange={e=>setSupplyUnitPrice(e.target.value)} className="mt-1 w-full rounded border border-slate-200 p-2" />
            <p className="mt-1 text-xs text-slate-500">이번 모집의 공급가를 직접 확정합니다. 소비자가·일반 상품가와 별개이며 확정 후 이 화면에서 변경할 수 없습니다.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="recruitment-commission" className="block text-sm font-medium text-slate-700 mb-1.5">수수료율 (%)</label>
              <input
                disabled={submitting} type="number" min={0} max={100} step="0.01"
                id="recruitment-commission" value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="예: 10"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="recruitment-consumer-price" className="block text-sm font-medium text-slate-700 mb-1.5">소비자가 (참조)</label>
              <input
                disabled={submitting} type="number" min={0}
                id="recruitment-consumer-price" value={consumerPrice}
                onChange={(e) => setConsumerPrice(e.target.value)}
                placeholder="선택"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</button>
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
