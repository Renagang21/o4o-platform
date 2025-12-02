/**
 * Checkout Progress Indicator
 * R-6-8: Shows current step in checkout flow
 *
 * Steps: Cart → Checkout → Complete
 */

import React from 'react';
import { Check, ShoppingCart, FileText, CheckCircle } from 'lucide-react';

interface CheckoutProgressProps {
  currentStep: 'cart' | 'checkout' | 'complete';
}

export const CheckoutProgress: React.FC<CheckoutProgressProps> = ({ currentStep }) => {
  const steps = [
    { id: 'cart', label: '장바구니', icon: ShoppingCart },
    { id: 'checkout', label: '주문정보', icon: FileText },
    { id: 'complete', label: '결제완료', icon: CheckCircle },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 mt-[-24px]">
                  <div
                    className={`h-full transition-all ${
                      index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CheckoutProgress;
