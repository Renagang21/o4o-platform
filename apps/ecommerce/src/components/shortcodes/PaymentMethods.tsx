import { FC, useState  } from 'react';
import { ShortcodeProps } from '@o4o/shortcodes';
import { CreditCard, Smartphone, Banknote, Building } from 'lucide-react';

/**
 * [payment-methods] 숏코드 컴포넌트
 * 결제 수단 선택 UI를 표시합니다.
 * 
 * 사용 예:
 * [payment-methods]
 * [payment-methods show-icons="true" default="card"]
 */
export const PaymentMethods: FC<ShortcodeProps> = ({ attributes }) => {
  const [selectedMethod, setSelectedMethod] = useState(
    String(attributes.default || 'card')
  );
  
  // 기본 속성값
  const showIcons = attributes.showIcons !== false;
  const showDescription = attributes.showDescription !== false;
  
  // 결제 수단 옵션
  const paymentMethods = [
    {
      id: 'card',
      name: '신용/체크카드',
      description: 'Visa, Mastercard, 국내 모든 카드',
      icon: CreditCard,
      badge: '즉시결제'
    },
    {
      id: 'kakao',
      name: '카카오페이',
      description: '카카오페이로 간편하게 결제',
      icon: Smartphone,
      badge: '간편결제'
    },
    {
      id: 'naver',
      name: '네이버페이',
      description: '네이버페이 포인트 적립 가능',
      icon: Smartphone,
      badge: '간편결제'
    },
    {
      id: 'transfer',
      name: '계좌이체',
      description: '실시간 계좌이체로 결제',
      icon: Building,
      badge: null
    },
    {
      id: 'virtual',
      name: '가상계좌',
      description: '입금 확인 후 주문 처리',
      icon: Banknote,
      badge: null
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">결제 수단 선택</h3>
      
      <div className="space-y-2">
        {paymentMethods.map((method: any) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <label
              key={method.id}
              className={`
                flex items-center p-4 rounded-lg border cursor-pointer
                transition-all
                ${isSelected 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={isSelected}
                onChange={(e: any) => setSelectedMethod(e.target.value)}
                className="text-primary"
              />
              
              <div className="flex-1 ml-3">
                <div className="flex items-center gap-3">
                  {showIcons && (
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-gray-600'}`} />
                  )}
                  <span className="font-medium">{method.name}</span>
                  {method.badge && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {method.badge}
                    </span>
                  )}
                </div>
                
                {showDescription && method.description && (
                  <p className="text-sm text-gray-600 mt-1 ml-8">
                    {method.description}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {/* 선택된 결제 수단에 따른 추가 안내 */}
      {selectedMethod === 'virtual' && (
        <div className="bg-amber-50 text-amber-700 p-3 rounded text-sm">
          가상계좌는 입금 확인 후 주문이 처리됩니다. (입금 기한: 3일)
        </div>
      )}
      
      {(selectedMethod === 'kakao' || selectedMethod === 'naver') && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded text-sm">
          간편결제 선택 시 해당 앱으로 이동하여 결제를 진행합니다.
        </div>
      )}
    </div>
  );
};

// 숏코드 정의
export const paymentMethodsDefinition = {
  name: 'payment-methods',
  component: PaymentMethods,
  description: '결제 수단 선택 UI를 표시합니다',
  defaultAttributes: {
    showIcons: true,
    showDescription: true,
    default: 'card'
  }
};