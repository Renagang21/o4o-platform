import { Loader2 } from 'lucide-react';
import { Section } from '@o4o/operator-ux-core';
import type { SupplierProduct } from '../../../lib/api';
import type { useSupplierSpotPolicies } from './useSupplierSpotPolicies';

export default function SupplierSpotPolicySection({
  product,
  controller,
}: {
  product: SupplierProduct;
  controller: ReturnType<typeof useSupplierSpotPolicies>;
}) {
  const {
    spotPolicies,
    spotLoading,
    spotError,
    spotFormOpen,
    setSpotFormOpen,
    spotForm,
    setSpotForm,
    spotSaving,
    loadSpotPolicies,
    handleSpotCreate,
    handleSpotStatusChange,
  } = controller;
  return (
    <Section title="스팟 가격 정책">
      {spotLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" /> 로딩 중...
        </div>
      ) : spotError ? (
        /* 지속 오류 — "정책 없음" 문구는 노출하지 않는다. 토스트로 대체하지 않는다. */
        <div className="text-center py-3">
          <p className="text-xs text-slate-600 mb-2">
            {spotError === 'forbidden'
              ? '이 상품의 스팟 정책을 볼 권한이 없습니다.'
              : '스팟 정책을 불러오지 못했습니다.'}
          </p>
          {spotError === 'load' && product?.id && (
            <button
              onClick={() => loadSpotPolicies(product.id)}
              className="text-xs text-slate-600 underline hover:text-slate-800 font-medium"
            >
              다시 시도
            </button>
          )}
        </div>
      ) : (spotPolicies?.length ?? 0) === 0 && !spotFormOpen ? (
        <div className="text-center py-3">
          <p className="text-xs text-slate-400 mb-2">등록된 스팟 정책이 없습니다</p>
          <button
            onClick={() => setSpotFormOpen(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + 스팟 정책 추가
          </button>
        </div>
      ) : (
        <>
          {(spotPolicies ?? []).map((p) => {
            const now = new Date();
            const isExpired = p.status === 'ACTIVE' && new Date(p.endAt) < now;
            const statusLabel = isExpired
              ? '만료'
              : p.status === 'DRAFT'
                ? '초안'
                : p.status === 'ACTIVE'
                  ? '활성'
                  : '취소';
            const statusCls = isExpired
              ? 'bg-slate-100 text-slate-500'
              : p.status === 'DRAFT'
                ? 'bg-amber-50 text-amber-700'
                : p.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-500';
            return (
              <div key={p.id} className="border border-slate-100 rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{p.policyName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCls}`}>
                    {statusLabel}
                  </span>
                </div>
                <div className="text-sm font-semibold text-purple-700 mb-1">
                  \u20a9{Number(p.spotPrice).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400">
                  {new Date(p.startAt).toLocaleDateString()} ~{' '}
                  {new Date(p.endAt).toLocaleDateString()}
                </div>
                {p.status === 'DRAFT' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSpotStatusChange(p.id, 'ACTIVE')}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      활성화
                    </button>
                    <button
                      onClick={() => handleSpotStatusChange(p.id, 'CANCELLED')}
                      className="text-[11px] text-red-500 hover:text-red-600 font-medium"
                    >
                      취소
                    </button>
                  </div>
                )}
                {p.status === 'ACTIVE' && !isExpired && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleSpotStatusChange(p.id, 'CANCELLED')}
                      className="text-[11px] text-red-500 hover:text-red-600 font-medium"
                    >
                      정책 취소
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {!spotFormOpen && (
            <button
              onClick={() => setSpotFormOpen(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
            >
              + 스팟 정책 추가
            </button>
          )}
        </>
      )}
      {spotFormOpen && (
        <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-3 mt-2">
          <h5 className="text-xs font-semibold text-slate-600 mb-2">새 스팟 정책</h5>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="정책명 (예: 4월 프로모션)"
              value={spotForm.policyName}
              onChange={(e) => setSpotForm((f) => ({ ...f, policyName: e.target.value }))}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
            />
            <input
              type="number"
              placeholder="스팟 가격 (원)"
              value={spotForm.spotPrice}
              onChange={(e) => setSpotForm((f) => ({ ...f, spotPrice: e.target.value }))}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">시작일</label>
                <input
                  type="date"
                  value={spotForm.startAt}
                  onChange={(e) => setSpotForm((f) => ({ ...f, startAt: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">종료일</label>
                <input
                  type="date"
                  value={spotForm.endAt}
                  onChange={(e) => setSpotForm((f) => ({ ...f, endAt: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              {/* WO-NETURE-PRODUCT-DRAWER-FORM-STANDARD-COMPLIANCE-V1: validation 은 handleSpotCreate 내부 */}
              <button
                onClick={handleSpotCreate}
                disabled={spotSaving}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {spotSaving ? '저장 중...' : '생성'}
              </button>
              <button
                onClick={() => {
                  setSpotFormOpen(false);
                  setSpotForm({ policyName: '', spotPrice: '', startAt: '', endAt: '' });
                }}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-2">
        스팟 가격은 기간 한정 특별 공급가입니다. 상시 가격(공급가/서비스가)과 별도로 관리됩니다.
      </p>
    </Section>
  );
}
