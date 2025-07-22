import React from 'react';
import { ShortcodeProps } from '@o4o/shortcodes';
import { useCartStore } from '@/stores/useCartStore';
import { formatPrice } from '@o4o/utils';

/**
 * [product-summary] 숏코드 컴포넌트
 * 장바구니에 담긴 상품 요약을 표시합니다.
 * 
 * 사용 예:
 * [product-summary]
 * [product-summary show-image="true" show-price="true"]
 */
export const ProductSummary: React.FC<ShortcodeProps> = ({ attributes }) => {
  const { cart } = useCartStore();
  
  // 기본 속성값
  const showImage = attributes.showImage !== false;
  const showPrice = attributes.showPrice !== false;
  const showQuantity = attributes.showQuantity !== false;
  const showTotal = attributes.showTotal !== false;

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        장바구니가 비어있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cart.items.map((item) => (
        <div key={item.id} className="flex items-start gap-4 pb-4 border-b">
          {showImage && item.product?.featuredImageUrl && (
            <img
              src={item.product.featuredImageUrl}
              alt={item.product.name}
              className="w-20 h-20 object-cover rounded"
            />
          )}
          
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">
              {item.product?.name || item.productName || '상품명'}
            </h4>
            
            {item.product?.shortDescription && (
              <p className="text-sm text-gray-600 mt-1">
                {item.product.shortDescription}
              </p>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-sm">
              {showQuantity && (
                <span className="text-gray-600">
                  수량: {item.quantity}개
                </span>
              )}
              
              {showPrice && (
                <span className="text-gray-900">
                  {formatPrice(item.unitPrice || item.product?.pricing.customer || 0)}
                </span>
              )}
            </div>
          </div>
          
          {showTotal && (
            <div className="text-right">
              <div className="font-medium text-gray-900">
                {formatPrice((item.unitPrice || item.product?.pricing.customer || 0) * item.quantity)}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {showTotal && (
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">합계</span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(cart.summary.subtotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// 숏코드 정의
export const productSummaryDefinition = {
  name: 'product-summary',
  component: ProductSummary,
  description: '장바구니에 담긴 상품 요약을 표시합니다',
  defaultAttributes: {
    showImage: true,
    showPrice: true,
    showQuantity: true,
    showTotal: true
  }
};