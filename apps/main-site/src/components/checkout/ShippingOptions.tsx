/**
 * Shipping Options Component
 * R-6-8: Allows users to select shipping method
 *
 * Note: UI only for now, backend integration pending
 */

import React from 'react';
import { Truck, Zap } from 'lucide-react';

export type ShippingOption = 'standard' | 'express';

interface ShippingOptionsProps {
  selected: ShippingOption;
  onChange: (option: ShippingOption) => void;
}

export const ShippingOptions: React.FC<ShippingOptionsProps> = ({
  selected,
  onChange,
}) => {
  const options = [
    {
      id: 'standard' as ShippingOption,
      icon: Truck,
      label: '기본 배송',
      description: '2-3일 이내 배송',
      price: 0,
      badge: null,
    },
    {
      id: 'express' as ShippingOption,
      icon: Zap,
      label: '빠른 배송',
      description: '당일/익일 배송',
      price: 3000,
      badge: 'Soon',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">배송 옵션</h2>

      <div className="space-y-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;
          const isDisabled = option.badge === 'Soon';

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !isDisabled && onChange(option.id)}
              disabled={isDisabled}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Radio Circle */}
                <div className="mt-0.5">
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
                </div>

                {/* Icon & Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">
                      {option.label}
                    </span>
                    {option.badge && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>

                {/* Price */}
                <div className="text-right">
                  {option.price === 0 ? (
                    <span className="text-sm font-medium text-gray-900">무료</span>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      +₩{option.price.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        * 빠른 배송은 곧 제공 예정입니다.
      </p>
    </div>
  );
};

export default ShippingOptions;
