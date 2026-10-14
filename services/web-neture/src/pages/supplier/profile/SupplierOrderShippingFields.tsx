import { useId } from 'react';
import { ShoppingCart } from 'lucide-react';
import { inputClass } from './profilePresentation';
import type { useSupplierBusinessProfile } from './useSupplierBusinessProfile';

export default function SupplierOrderShippingFields({
  controller,
}: {
  controller: ReturnType<typeof useSupplierBusinessProfile>;
}) {
  const fieldId = useId();
  const {
    minOrderAmount,
    setMinOrderAmount,
    minOrderSurcharge,
    setMinOrderSurcharge,
    orderConditionNote,
    setOrderConditionNote,
    baseShippingFee,
    setBaseShippingFee,
    freeShippingThreshold,
    setFreeShippingThreshold,
    averageDispatchDays,
    setAverageDispatchDays,
    returnExchangeNotice,
    setReturnExchangeNotice,
    shippingStandard,
    setShippingStandard,
    shippingIsland,
    setShippingIsland,
    shippingMountain,
    setShippingMountain,
  } = controller;
  return (
    <>
      {/* Section D: B2B 주문 조건 — WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <ShoppingCart className="w-5 h-5 text-gray-500" />
          B2B 주문 조건
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          매장 주문자가 장바구니/제품 리스트에서 확인할 수 있는 주문 조건입니다. 비워두면 “조건
          없음”으로 표시됩니다.
        </p>
        <div className="space-y-5">
          {/* 최소 주문 금액 */}
          <div>
            <label
              htmlFor={`${fieldId}-field-0`}
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              최소 주문 금액 (원)
            </label>
            <input
              id={`${fieldId}-field-0`}
              type="text"
              inputMode="numeric"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="예: 50000"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              미설정 시 매장 주문자에게 “조건 없음”으로 표시됩니다.
            </p>
          </div>

          {/* 미달 시 물류비 */}
          <div>
            <label
              htmlFor={`${fieldId}-field-1`}
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              최소 주문 금액 미달 시 물류비 (원)
            </label>
            <input
              id={`${fieldId}-field-1`}
              type="text"
              inputMode="numeric"
              value={minOrderSurcharge}
              onChange={(e) => setMinOrderSurcharge(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="예: 3000"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              매장 주문자에게 “미달 시 물류비”로 안내됩니다. 실제 결제 반영은 별도 작업입니다.
            </p>
          </div>

          {/* 안내 문구 */}
          <div>
            <label
              htmlFor={`${fieldId}-field-2`}
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              주문 조건 안내 문구 (선택)
            </label>
            <textarea
              id={`${fieldId}-field-2`}
              value={orderConditionNote}
              onChange={(e) => setOrderConditionNote(e.target.value)}
              placeholder="예: 도서/산간 지역은 별도 협의가 필요합니다."
              rows={3}
              maxLength={500}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              주문 조건 모달과 장바구니에 함께 표시됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Section E: 배송 정책 — WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <ShoppingCart className="w-5 h-5 text-gray-500" />
          배송 정책
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          공급자별 기본 배송비, 무료배송 기준, 출고 안내, 반품/교환 안내를 설정합니다.
          장바구니·주문에서 공급자별 상품금액(같은 공급자의 일반·이벤트 상품 합산) 기준으로 배송비가
          계산되며, 다른 공급자 금액은 무료배송 기준에 포함되지 않습니다. 유통참여형 펀딩은 적용
          대상이 아닙니다.
        </p>
        {/* WO-O4O-SUPPLIER-SHIPPING-POLICY-ONBOARDING-NOTICE-V1: 미설정 시 0원 fallback 경고 */}
        {baseShippingFee.trim() === '' ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 mb-5 space-y-1">
            <p className="font-semibold">⚠️ 기본 배송비가 설정되지 않았습니다.</p>
            <p>
              현재 기본 배송비가 비어 있어{' '}
              <strong>장바구니와 주문에서 배송비가 0원으로 계산</strong>됩니다. 공급 상품 주문의
              실제 배송비 반영을 위해 기본 배송비를 입력해 주세요.
            </p>
            {freeShippingThreshold.trim() === '' && (
              <p>
                · 무료배송 기준 금액을 입력하면 매장이 “얼마 더 담으면 무료배송”인지 확인할 수
                있습니다. 무료배송을 운영하지 않으면 비워둘 수 있습니다.
              </p>
            )}
            {averageDispatchDays.trim() === '' && (
              <p>
                · 평균 출고 소요일을 입력하면 매장 경영자가 주문 전 예상 배송 일정을 이해하는 데
                도움이 됩니다.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 mb-5 space-y-1">
            <p className="font-semibold">✅ 기본 배송비가 설정되어 있습니다.</p>
            <p>장바구니와 주문에서 공급자별 상품금액을 기준으로 배송비가 계산됩니다.</p>
            {freeShippingThreshold.trim() === '' && (
              <p className="text-emerald-600">
                · 무료배송 기준은 선택 입력입니다. 입력 시 매장이 무료배송까지 남은 금액을 확인할 수
                있습니다.
              </p>
            )}
          </div>
        )}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor={`${fieldId}-field-3`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                기본 배송비 (원)
              </label>
              <input
                id={`${fieldId}-field-3`}
                type="text"
                inputMode="numeric"
                value={baseShippingFee}
                onChange={(e) => setBaseShippingFee(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="예: 3000"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field-4`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                무료배송 기준 금액 (원)
              </label>
              <input
                id={`${fieldId}-field-4`}
                type="text"
                inputMode="numeric"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="예: 50000"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field-5`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                평균 출고 소요일 (일)
              </label>
              <input
                id={`${fieldId}-field-5`}
                type="text"
                inputMode="numeric"
                value={averageDispatchDays}
                onChange={(e) => setAverageDispatchDays(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="예: 2"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-field-6`}
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              일반 배송 안내 (선택)
            </label>
            <textarea
              id={`${fieldId}-field-6`}
              value={shippingStandard}
              onChange={(e) => setShippingStandard(e.target.value)}
              placeholder="예: 평일 14시 이전 주문 시 당일 출고"
              rows={2}
              maxLength={500}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`${fieldId}-field-7`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                제주/도서산간 안내 (선택)
              </label>
              <textarea
                id={`${fieldId}-field-7`}
                value={shippingIsland}
                onChange={(e) => setShippingIsland(e.target.value)}
                placeholder="예: 제주/도서산간 추가 배송비 협의"
                rows={2}
                maxLength={500}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field-8`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                산간지역 안내 (선택)
              </label>
              <textarea
                id={`${fieldId}-field-8`}
                value={shippingMountain}
                onChange={(e) => setShippingMountain(e.target.value)}
                placeholder="예: 일부 산간지역 배송 지연 가능"
                rows={2}
                maxLength={500}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor={`${fieldId}-field-9`}
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              반품/교환 안내 (선택)
            </label>
            <textarea
              id={`${fieldId}-field-9`}
              value={returnExchangeNotice}
              onChange={(e) => setReturnExchangeNotice(e.target.value)}
              placeholder="예: 단순 변심 반품은 수령 후 7일 이내, 왕복 배송비 구매자 부담"
              rows={3}
              maxLength={1000}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </>
  );
}
