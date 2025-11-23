/**
 * Payment Method Selector Component
 * R-6-8: Allows users to select payment method
 *
 * Note: UI only, actual payment via Toss remains CARD
 */

import React from 'react';
import { CreditCard, Building2, Receipt } from 'lucide-react';

export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'VIRTUAL_ACCOUNT';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selected,
  onChange,
}) => {
  const methods = [
    {
      id: 'CARD' as PaymentMethod,
      icon: CreditCard,
      label: '신용/체크카드',
      description: '모든 카드사 사용 가능',
      badge: null,
    },
    {
      id: 'BANK_TRANSFER' as PaymentMethod,
      icon: Building2,
      label: '실시간 계좌이체',
      description: '즉시 결제 확인',
      badge: 'Soon',
    },
    {
      id: 'VIRTUAL_ACCOUNT' as PaymentMethod,
      icon: Receipt,
      label: '가상계좌',
      description: '입금 확인 후 배송',
      badge: 'Soon',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">결제 수단</h2>

      <div className="space-y-3">
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selected === method.id;
          const isDisabled = method.badge === 'Soon';

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => !isDisabled && onChange(method.id)}
              disabled={isDisabled}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Radio Circle */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>

                {/* Icon & Info */}
                <Icon className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {method.label}
                    </span>
                    {method.badge && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                        {method.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          🔒 <span className="font-semibold">안전한 결제</span>:
          모든 결제 정보는 PCI-DSS 인증을 받은 Toss Payments를 통해 안전하게 처리됩니다.
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
