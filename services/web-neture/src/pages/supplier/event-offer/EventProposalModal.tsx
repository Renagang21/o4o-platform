import { useId } from 'react';
import { X, Loader2, AlertTriangle, Package } from 'lucide-react';
import type { useSupplierEventOffers } from './useSupplierEventOffers';
import { PROPOSE_TARGETS } from './presentation';

export function EventProposalModal({
  controller,
}: {
  controller: ReturnType<typeof useSupplierEventOffers>;
}) {
  const formId = useId();
  const {
    proposeOpen,
    proposableOffers,
    proposableLoading,
    proposableError,
    proposingId,
    selectedTargets,
    toggleTarget,
    selectedOfferId,
    setSelectedOfferId,
    eventPrice,
    setEventPrice,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    totalQuantity,
    setTotalQuantity,
    perOrderLimit,
    setPerOrderLimit,
    perStoreLimit,
    setPerStoreLimit,
    selectedOffer,
    validationError,
    loadProposableOffers,
    handleClosePropose,
    handlePropose,
  } = controller;
  return (
    <>
      {/* WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1: 이벤트 제안 모달 */}
      {proposeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <button
            type="button"
            aria-label="이벤트 제안 배경 닫기"
            tabIndex={-1}
            className="absolute inset-0 w-full cursor-default"
            onClick={handleClosePropose}
          />
          <div
            role="dialog"
            aria-labelledby={`${formId}-title`}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 id={`${formId}-title`} className="text-lg font-semibold text-slate-800">
                  이벤트 제안
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  공급 중인 상품을 선택한 서비스의 이벤트로 동시에 제안합니다.
                  각 서비스 운영자 승인 후 노출됩니다.
                </p>
              </div>
              <button
                aria-label="이벤트 제안 닫기"
                onClick={handleClosePropose}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1: 대상 서비스 선택 */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                대상 서비스 (복수 선택)
              </div>
              <div className="flex flex-wrap gap-2">
                {PROPOSE_TARGETS.map((t) => {
                  const checked = selectedTargets.includes(t.key);
                  return (
                    <label
                      key={t.key}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        !t.enabled
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : checked
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!t.enabled || proposingId !== null}
                        onChange={() => toggleTarget(t.key)}
                        className="w-3.5 h-3.5"
                      />
                      <span>{t.label}</span>
                      {t.hint && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({t.hint})
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {selectedTargets.length === 0 && (
                <p className="mt-2 text-xs text-red-600">
                  대상 서비스를 1개 이상 선택해 주세요.
                </p>
              )}
            </div>

            {/* Modal Body */}
            {/* WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
                Step 1: 상품 선택 (radio) — Step 2: 이벤트 조건 입력 — 하단 "제안하기" 버튼 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {proposableLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                </div>
              ) : proposableError ? (
                <div className="text-center py-12 text-slate-500">
                  <AlertTriangle
                    size={36}
                    className="mx-auto mb-3 text-red-400"
                  />
                  <p className="font-medium text-sm text-slate-700">
                    제안 가능한 상품을 불러오지 못했습니다.
                  </p>
                  <p className="text-xs mt-1 text-slate-400">
                    잠시 후 다시 시도해 주세요.
                  </p>
                  <button
                    type="button"
                    onClick={loadProposableOffers}
                    className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    다시 시도
                  </button>
                </div>
              ) : proposableOffers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package size={36} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-sm">
                    제안 가능한 상품이 없습니다.
                  </p>
                  <p className="text-xs mt-1 text-slate-400">
                    승인 완료된 활성 상품 중 아직 제안하지 않은 상품만
                    표시됩니다.
                  </p>
                </div>
              ) : (
                <>
                  {/* Step 1: 상품 선택 */}
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      1. 제안할 상품 선택
                    </div>
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                      {proposableOffers.map((offer) => {
                        const checked = selectedOfferId === offer.id;
                        return (
                          <li key={offer.id}>
                            <label
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm ${
                                checked ? 'bg-indigo-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="proposable-offer"
                                checked={checked}
                                onChange={() => setSelectedOfferId(offer.id)}
                                disabled={proposingId !== null}
                                className="w-3.5 h-3.5 accent-indigo-600"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-800 truncate">
                                  {offer.title}
                                </p>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {offer.supplierName}
                                  {offer.price != null && (
                                    <span className="ml-2 text-slate-700">
                                      · 일반 공급가 ₩
                                      {Number(offer.price).toLocaleString()}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Step 2: 이벤트 조건 입력 */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-700">
                      2. 이벤트 조건 입력
                    </div>

                    {/* 이벤트 가격 */}
                    <div>
                      <label
                        htmlFor={`${formId}-field1`}
                        className="block text-xs text-slate-600 mb-1"
                      >
                        이벤트 공급가 <span className="text-red-500">*</span>
                        {selectedOffer?.price != null && (
                          <span className="ml-1 text-slate-400">
                            (일반 공급가 ₩
                            {Number(selectedOffer.price).toLocaleString()} 이하)
                          </span>
                        )}
                      </label>
                      <input
                        id={`${formId}-field1`}
                        type="number"
                        min={0}
                        step={1}
                        value={eventPrice}
                        onChange={(e) => setEventPrice(e.target.value)}
                        disabled={proposingId !== null}
                        placeholder="예: 18000"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* 시작/종료 일시 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor={`${formId}-field2`}
                          className="block text-xs text-slate-600 mb-1"
                        >
                          시작 일시 <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`${formId}-field2`}
                          type="datetime-local"
                          value={startAt}
                          onChange={(e) => setStartAt(e.target.value)}
                          disabled={proposingId !== null}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`${formId}-field3`}
                          className="block text-xs text-slate-600 mb-1"
                        >
                          종료 일시 <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`${formId}-field3`}
                          type="datetime-local"
                          value={endAt}
                          onChange={(e) => setEndAt(e.target.value)}
                          disabled={proposingId !== null}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* 수량 제한 (optional) */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor={`${formId}-field4`}
                          className="block text-xs text-slate-600 mb-1"
                        >
                          총 수량 <span className="text-slate-400">(선택)</span>
                        </label>
                        <input
                          id={`${formId}-field4`}
                          type="number"
                          min={0}
                          step={1}
                          value={totalQuantity}
                          onChange={(e) => setTotalQuantity(e.target.value)}
                          disabled={proposingId !== null}
                          placeholder="무제한"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`${formId}-field5`}
                          className="block text-xs text-slate-600 mb-1"
                        >
                          1회 주문 제한{' '}
                          <span className="text-slate-400">(선택)</span>
                        </label>
                        <input
                          id={`${formId}-field5`}
                          type="number"
                          min={1}
                          step={1}
                          value={perOrderLimit}
                          onChange={(e) => setPerOrderLimit(e.target.value)}
                          disabled={proposingId !== null}
                          placeholder="무제한"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`${formId}-field6`}
                          className="block text-xs text-slate-600 mb-1"
                        >
                          매장별 제한{' '}
                          <span className="text-slate-400">(선택)</span>
                        </label>
                        <input
                          id={`${formId}-field6`}
                          type="number"
                          min={1}
                          step={1}
                          value={perStoreLimit}
                          onChange={(e) => setPerStoreLimit(e.target.value)}
                          disabled={proposingId !== null}
                          placeholder="무제한"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {validationError && (
                      <p className="text-xs text-red-600">{validationError}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200">
              <button
                onClick={handleClosePropose}
                disabled={proposingId !== null}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40"
              >
                닫기
              </button>
              <button
                onClick={handlePropose}
                disabled={
                  proposingId !== null ||
                  proposableOffers.length === 0 ||
                  selectedTargets.length === 0 ||
                  validationError !== null
                }
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {proposingId !== null ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    제안 중...
                  </>
                ) : (
                  '제안하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
