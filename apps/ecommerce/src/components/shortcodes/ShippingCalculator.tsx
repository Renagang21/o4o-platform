import { FC, useState  } from 'react';
import { ShortcodeProps } from '@o4o/shortcodes';
import { useCartStore } from '@/stores/useCartStore';
import { formatPrice } from '@o4o/utils';
import { Truck, Package } from 'lucide-react';

/**
 * [shipping-calculator] 숏코드 컴포넌트
 * 배송비 계산기를 표시합니다.
 * 
 * 사용 예:
 * [shipping-calculator]
 * [shipping-calculator free-threshold="50000"]
 */
export const ShippingCalculator: FC<ShortcodeProps> = ({ attributes }) => {
  const { cart } = useCartStore();
  const [selectedMethod, setSelectedMethod] = useState('standard');
  
  // 기본 속성값
  const freeThreshold = Number(attributes.freeThreshold) || 50000;
  const showEstimate = attributes.showEstimate !== false;
  
  // 배송 옵션
  const shippingMethods = [
    {
      id: 'standard',
      name: '일반 배송',
      price: 3000,
      days: '3-5일',
      icon: Package
    },
    {
      id: 'express',
      name: '특급 배송',
      price: 5000,
      days: '1-2일',
      icon: Truck
    }
  ];

  // 무료 배송 여부 계산
  const subtotal = cart?.summary.subtotal || 0;
  const isFreeShipping = subtotal >= freeThreshold;
  
  // 선택된 배송 방법의 가격
  const selectedShipping = shippingMethods.find(m => m.id === selectedMethod);
  const shippingPrice = isFreeShipping ? 0 : (selectedShipping?.price || 0);

  // 무료 배송까지 남은 금액
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="font-medium text-lg flex items-center gap-2">
        <Truck className="w-5 h-5" />
        배송비 계산
      </h3>

      {/* 무료 배송 안내 */}
      {!isFreeShipping && remainingForFree > 0 && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded text-sm">
          {formatPrice(remainingForFree)} 더 구매하시면 무료배송!
        </div>
      )}
      
      {isFreeShipping && (
        <div className="bg-green-50 text-green-700 p-3 rounded text-sm">
          🎉 무료배송 조건을 충족했습니다!
        </div>
      )}

      {/* 배송 방법 선택 */}
      <div className="space-y-2">
        {shippingMethods.map((method: any) => {
          const Icon = method.icon;
          const price = isFreeShipping ? 0 : method.price;
          
          return (
            <label
              key={method.id}
              className={`
                flex items-center justify-between p-3 rounded-lg border cursor-pointer
                transition-colors
                ${selectedMethod === method.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="shipping-method"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={(e: any) => setSelectedMethod(e.target.value)}
                  className="text-primary"
                />
                <Icon className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">{method.name}</div>
                  {showEstimate && (
                    <div className="text-sm text-gray-500">
                      예상 도착: {method.days}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="font-medium">
                {price === 0 ? (
                  <span className="text-green-600">무료</span>
                ) : (
                  formatPrice(price)
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* 총 배송비 */}
      <div className="pt-3 border-t">
        <div className="flex justify-between items-center">
          <span className="font-medium">배송비</span>
          <span className="text-lg font-bold">
            {shippingPrice === 0 ? (
              <span className="text-green-600">무료</span>
            ) : (
              formatPrice(shippingPrice)
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

// 숏코드 정의
export const shippingCalculatorDefinition = {
  name: 'shipping-calculator',
  component: ShippingCalculator,
  description: '배송비 계산기를 표시합니다',
  defaultAttributes: {
    freeThreshold: 50000,
    showEstimate: true
  }
};