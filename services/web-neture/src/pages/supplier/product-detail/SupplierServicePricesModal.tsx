import type { SupplierProduct } from '../../../lib/api';
import { SERVICE_PRICE_LABELS, type useSupplierServicePrices } from './useSupplierServicePrices';

export default function SupplierServicePricesModal({
  product,
  controller,
}: {
  product: SupplierProduct;
  controller: ReturnType<typeof useSupplierServicePrices>;
}) {
  const {
    svcPrices,
    svcPriceOpen,
    setSvcPriceOpen,
    svcPriceSaving,
    svcPriceForm,
    setSvcPriceForm,
    saveServicePrices,
  } = controller;
  if (!svcPriceOpen) return null;
  const supplyKeys = (product.serviceKeys || []).filter((k) => k !== 'neture');
  const priceGeneral = Number(svcPrices?.priceGeneral ?? product.priceGeneral ?? 0);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !svcPriceSaving) setSvcPriceOpen(false);
      }}
    >
      <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
        <h3 className="text-base font-bold text-slate-900 mb-1">서비스별 공급가</h3>
        <p className="text-[11px] text-slate-500 mb-3">
          서비스별 공급가를 입력하면 해당 서비스 주문에 우선 적용됩니다. 비우면 기본 공급가(₩
          {priceGeneral.toLocaleString()})가 적용됩니다.
        </p>
        <div className="space-y-2 mb-3">
          {supplyKeys.map((sk) => (
            <div key={sk} className="flex items-center gap-2">
              <span className="text-sm text-slate-700 w-28 shrink-0">
                {SERVICE_PRICE_LABELS[sk] || sk}
              </span>
              <input
                type="number"
                min={0}
                value={svcPriceForm[sk] ?? ''}
                onChange={(e) => setSvcPriceForm((f) => ({ ...f, [sk]: e.target.value }))}
                placeholder={`기본 ${priceGeneral.toLocaleString()}`}
                className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
              />
              <span className="text-xs text-slate-400">원</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setSvcPriceOpen(false)}
            disabled={svcPriceSaving}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={saveServicePrices}
            disabled={svcPriceSaving}
            className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          >
            {svcPriceSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
