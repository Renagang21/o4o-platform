import React from 'react';
import { ShortcodeProps } from '@o4o/shortcodes';
import { useCartStore } from '@/stores/useCartStore';
import { formatPrice } from '@o4o/utils';
import { ShoppingCart, Tag, Truck, Receipt } from 'lucide-react';

/**
 * [order-summary] 숏코드 컴포넌트
 * 주문 요약 정보를 표시합니다.
 * 
 * 사용 예:
 * [order-summary]
 * [order-summary show-details="true" show-icons="true"]
 */
export const OrderSummary: React.FC<ShortcodeProps> = ({ attributes }) => {
  const { cart } = useCartStore();
  
  // 기본 속성값
  const showDetails = attributes.showDetails !== false;
  const showIcons = attributes.showIcons !== false;
  const showItemCount = attributes.showItemCount !== false;
  
  if (!cart) {
    return null;
  }

  const { summary } = cart;
  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
  
  // 주문 요약 항목들
  const summaryItems = [
    {
      label: '상품 금액',
      value: summary.subtotal,
      icon: ShoppingCart,
      description: showItemCount ? `총 ${itemCount}개 상품` : null
    },
    {
      label: '할인 금액',
      value: -summary.discount,
      icon: Tag,
      highlight: 'discount',
      show: summary.discount > 0
    },
    {
      label: '배송비',
      value: summary.shipping,
      icon: Truck,
      highlight: summary.shipping === 0 ? 'free' : null,
      show: true
    },
    {
      label: '세금',
      value: summary.tax,
      icon: Receipt,
      show: summary.tax > 0
    }
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="font-semibold text-lg mb-4">주문 요약</h3>
      
      <div className="space-y-3">
        {summaryItems.map((item, index) => {
          if (item.show === false) return null;
          
          const Icon = item.icon;
          
          return (
            <div key={index} className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                {showIcons && Icon && (
                  <Icon className="w-4 h-4 text-gray-500 mt-0.5" />
                )}
                <div>
                  <span className="text-gray-700">{item.label}</span>
                  {showDetails && item.description && (
                    <p className="text-xs text-gray-500">{item.description}</p>
                  )}
                </div>
              </div>
              
              <span className={`
                font-medium
                ${item.highlight === 'discount' ? 'text-red-600' : ''}
                ${item.highlight === 'free' ? 'text-green-600' : ''}
                ${!item.highlight ? 'text-gray-900' : ''}
              `}>
                {item.highlight === 'free' ? '무료' : formatPrice(item.value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 구분선 */}
      <div className="my-4 border-t border-gray-200"></div>

      {/* 총 금액 */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">총 결제금액</span>
        <span className="text-2xl font-bold text-primary">
          {formatPrice(summary.total)}
        </span>
      </div>

      {/* 추가 정보 */}
      {showDetails && (
        <div className="mt-4 space-y-2">
          {summary.discount > 0 && (
            <p className="text-sm text-gray-600">
              💰 할인으로 {formatPrice(summary.discount)}를 절약했습니다!
            </p>
          )}
          
          {summary.shipping === 0 && (
            <p className="text-sm text-gray-600">
              🚚 무료배송이 적용되었습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// 숏코드 정의
export const orderSummaryDefinition = {
  name: 'order-summary',
  component: OrderSummary,
  description: '주문 요약 정보를 표시합니다',
  defaultAttributes: {
    showDetails: true,
    showIcons: true,
    showItemCount: true
  }
};