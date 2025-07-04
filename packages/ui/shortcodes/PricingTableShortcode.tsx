/**
 * [pricing-table] 숏코드 컴포넌트
 */

import React from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

const PricingTableShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  editorMode = false
}) => {
  const {
    plans = 'basic,pro,enterprise',
    featured = 'pro',
    currency = '₩',
    period = 'month',
    className = ''
  } = shortcode.attributes;

  // 기본 플랜 데이터
  const defaultPlans = {
    basic: {
      name: 'Basic',
      price: '29,000',
      features: ['10 Projects', '5GB Storage', 'Email Support', 'Basic Analytics']
    },
    pro: {
      name: 'Pro',
      price: '59,000',
      features: ['Unlimited Projects', '100GB Storage', 'Priority Support', 'Advanced Analytics', 'Custom Integrations']
    },
    enterprise: {
      name: 'Enterprise',
      price: '199,000',
      features: ['Unlimited Everything', '1TB Storage', '24/7 Phone Support', 'Custom Analytics', 'White Label', 'API Access']
    }
  };

  const planList = (plans as string).split(',').map(p => p.trim());
  const featuredPlan = featured as string;

  return (
    <div className={`pricing-table-shortcode ${editorMode ? 'editor-mode' : ''} ${className}`}>
      <div className={`pricing-plans grid gap-6 ${planList.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} max-w-6xl mx-auto`}>
        {planList.map((planKey) => {
          const plan = defaultPlans[planKey as keyof typeof defaultPlans];
          if (!plan) return null;

          const isFeatured = planKey === featuredPlan;

          return (
            <div
              key={planKey}
              className={`pricing-plan bg-white border rounded-lg p-6 relative ${
                isFeatured 
                  ? 'border-blue-500 shadow-lg transform scale-105' 
                  : 'border-gray-200 hover:shadow-md'
              } transition-all duration-200`}
            >
              {isFeatured && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="plan-header text-center mb-6">
                <h3 className="plan-name text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="plan-price">
                  <span className="text-3xl font-bold text-gray-900">{currency}{plan.price}</span>
                  <span className="text-gray-600">/{period}</span>
                </div>
              </div>

              <ul className="plan-features space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                  isFeatured
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Get Started
              </button>
            </div>
          );
        })}
      </div>

      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Pricing Table: {planList.length} plans
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingTableShortcode;