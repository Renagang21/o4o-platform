import type { SupplierProduct } from '../../../lib/api';
import type { useSupplierDistribution } from './useSupplierDistribution';

export default function SupplierDistributionModal({
  product,
  controller,
}: {
  product: SupplierProduct;
  controller: ReturnType<typeof useSupplierDistribution>;
}) {
  const {
    distMgmtOpen,
    setDistMgmtOpen,
    distSaving,
    distForm,
    setDistForm,
    distConfirmRemove,
    setDistConfirmRemove,
    saveDistribution,
  } = controller;
  if (!distMgmtOpen) return null;
  const SERVICES = [
    { key: 'kpa-society', label: 'KPA Society' },
    { key: 'k-cosmetics', label: 'K-Cosmetics' },
  ];
  const currentKeys = (product.serviceKeys || []).filter((k) => k !== 'neture');
  const removed = currentKeys.filter((k) => !distForm.serviceKeys.includes(k));
  const toggleSvc = (k: string) =>
    setDistForm((f) => ({
      ...f,
      serviceKeys: f.serviceKeys.includes(k)
        ? f.serviceKeys.filter((x) => x !== k)
        : [...f.serviceKeys, k],
    }));
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !distSaving) setDistMgmtOpen(false);
      }}
    >
      <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
        <h3 className="text-base font-bold text-slate-900 mb-3">공급 방식 변경</h3>
        {!distConfirmRemove ? (
          <>
            <label className="flex items-start gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={distForm.isPublic}
                onChange={(e) => setDistForm((f) => ({ ...f, isPublic: e.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <span className="text-sm font-medium text-slate-800">B2B 전체 공급</span>
                <span className="block text-xs text-slate-500">
                  운영자 승인 없이 각 서비스 HUB에 노출될 수 있습니다.
                </span>
              </span>
            </label>
            {distForm.isPublic && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mb-3">
                B2B 전체 공급으로 설정하면 서비스 운영자 승인 없이 각 서비스 HUB에 노출될 수
                있습니다.
              </p>
            )}
            <p className="text-xs font-semibold text-slate-600 mb-1 mt-3">서비스 공급 대상</p>
            <p className="text-[11px] text-slate-500 mb-2">
              선택한 서비스 운영자의 승인 후 해당 서비스 HUB에 노출됩니다.
            </p>
            <div className="space-y-1.5 mb-3">
              {SERVICES.map((s) => (
                <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distForm.serviceKeys.includes(s.key)}
                    onChange={() => toggleSvc(s.key)}
                  />
                  <span className="text-sm text-slate-700">{s.label}</span>
                  {currentKeys.includes(s.key) && !distForm.serviceKeys.includes(s.key) && (
                    <span className="text-[10px] text-red-600">철회 예정</span>
                  )}
                </label>
              ))}
            </div>
            {!distForm.isPublic && distForm.serviceKeys.length === 0 && (
              <p className="text-[11px] text-slate-500 mb-3">
                아무것도 선택하지 않으면 내부 상품(미노출)으로 저장됩니다.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDistMgmtOpen(false)}
                disabled={distSaving}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (removed.length) setDistConfirmRemove(removed);
                  else saveDistribution();
                }}
                disabled={distSaving}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {distSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700 mb-2">다음 서비스 공급을 철회합니다:</p>
            <ul className="text-sm font-medium text-slate-900 mb-3 list-disc list-inside">
              {distConfirmRemove.map((k) => (
                <li key={k}>{SERVICES.find((s) => s.key === k)?.label || k}</li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 mb-4">
              해당 서비스 HUB 노출이 중단되고, 기존 승인 이력은 '철회됨'으로 보존됩니다. 다시
              공급하려면 재신청(승인 대기)이 필요합니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDistConfirmRemove(null)}
                disabled={distSaving}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                뒤로
              </button>
              <button
                onClick={saveDistribution}
                disabled={distSaving}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {distSaving ? '처리 중...' : '철회하고 저장'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
