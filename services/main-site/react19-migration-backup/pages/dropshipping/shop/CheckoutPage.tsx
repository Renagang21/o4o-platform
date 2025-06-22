import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, MapPin, CreditCard, Truck, Shield, 
  Check, AlertCircle, Clock, Home, Building, 
  User, Phone, Gift, Percent
} from 'lucide-react';
import Navbar from '../../../components/Navbar';

interface CheckoutItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  image: string;
  isRocket: boolean;
}

interface DeliveryAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  detailAddress: string;
  zipCode: string;
  isDefault: boolean;
  addressType: 'home' | 'office' | 'etc';
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'kakao' | 'naver' | 'toss';
  name: string;
  icon: string;
  isRecommended?: boolean;
}

const CheckoutPage: React.FC = () => {
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(5000);

  const paymentMethods: PaymentMethod[] = [
    { id: 'card', type: 'card', name: '신용/체크카드', icon: '💳', isRecommended: true },
    { id: 'kakao', type: 'kakao', name: '카카오페이', icon: '💛' },
    { id: 'naver', type: 'naver', name: '네이버페이', icon: '💚' },
    { id: 'toss', type: 'toss', name: '토스페이', icon: '💙' },
    { id: 'bank', type: 'bank', name: '실시간 계좌이체', icon: '🏦' }
  ];

  const deliveryMessages = [
    '배송 전 연락바랍니다',
    '부재시 경비실에 맡겨주세요',
    '부재시 문앞에 놓아주세요',
    '부재시 택배함에 넣어주세요',
    '직접입력'
  ];

  useEffect(() => {
    // 모의 주문 상품 데이터
    const mockItems: CheckoutItem[] = [
      {
        id: '1',
        productId: '1',
        name: '프리미엄 오메가3 1000mg 90캡슐',
        brand: '네이처메이드',
        price: 29900,
        quantity: 2,
        image: '/products/omega3.jpg',
        isRocket: true
      },
      {
        id: '2',
        productId: '3',
        name: '혈압측정기 자동 전자 혈압계',
        brand: '오므론',
        price: 89000,
        quantity: 1,
        image: '/products/blood-pressure.jpg',
        isRocket: true
      }
    ];

    const mockAddresses: DeliveryAddress[] = [
      {
        id: '1',
        name: '김헬스',
        phone: '010-1234-5678',
        address: '서울특별시 강남구 테헤란로 123',
        detailAddress: '456호',
        zipCode: '06234',
        isDefault: true,
        addressType: 'home'
      },
      {
        id: '2',
        name: '김헬스',
        phone: '010-1234-5678',
        address: '서울특별시 서초구 강남대로 789',
        detailAddress: '10층 헬스케어 회사',
        zipCode: '06789',
        isDefault: false,
        addressType: 'office'
      }
    ];

    setCheckoutItems(mockItems);
    setAddresses(mockAddresses);
    setSelectedAddress(mockAddresses.find(addr => addr.isDefault)?.id || '');
    setSelectedPayment('card');
  }, []);

  const subtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = 0; // 로켓배송 무료
  const totalAmount = subtotal - couponDiscount + shippingFee;

  const handlePayment = async () => {
    if (!selectedAddress || !selectedPayment || !agreeTerms) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // 결제 처리 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('주문이 완료되었습니다! 주문 내역은 마이페이지에서 확인하실 수 있습니다.');
      // 주문 완료 페이지로 이동
      
    } catch (error) {
      alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="w-4 h-4" />;
      case 'office': return <Building className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/dropshipping" className="hover:text-blue-600">홈</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/dropshipping/cart" className="hover:text-blue-600">장바구니</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">주문/결제</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">주문/결제</h1>
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Shield className="w-4 h-4" />
            <span>안전한 결제 시스템</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 주문 정보 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 주문 상품 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Truck className="w-6 h-6 text-orange-500" />
                주문 상품 ({checkoutItems.length}개)
              </h2>
              
              <div className="space-y-4">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/api/placeholder/64/64';
                      }}
                    />
                    
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">{item.brand}</div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {item.isRocket && (
                          <div className="flex items-center gap-1 text-orange-600 text-xs">
                            <Truck className="w-3 h-3" />
                            <span>로켓배송</span>
                          </div>
                        )}
                        <span className="text-sm text-gray-600">수량: {item.quantity}개</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {(item.price * item.quantity).toLocaleString()}원
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">배송 예정일</span>
                </div>
                <div className="text-sm text-orange-600">
                  내일({new Date(Date.now() + 86400000).toLocaleDateString()}) 도착 예정 (로켓배송)
                </div>
              </div>
            </div>

            {/* 배송지 정보 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-blue-500" />
                  배송지 정보
                </h2>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  + 새 배송지 추가
                </button>
              </div>
              
              <div className="space-y-4">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedAddress === address.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddress === address.id}
                        onChange={(e) => setSelectedAddress(e.target.value)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getAddressIcon(address.addressType)}
                          <span className="font-medium">{address.name}</span>
                          <span className="text-gray-600">{address.phone}</span>
                          {address.isDefault && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              기본배송지
                            </span>
                          )}
                        </div>
                        
                        <div className="text-gray-700">
                          ({address.zipCode}) {address.address}
                        </div>
                        <div className="text-gray-700">{address.detailAddress}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              {/* 배송 요청사항 */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  배송 요청사항
                </label>
                <select
                  value={deliveryMessage}
                  onChange={(e) => setDeliveryMessage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">선택해주세요</option>
                  {deliveryMessages.map((message) => (
                    <option key={message} value={message}>
                      {message}
                    </option>
                  ))}
                </select>
                
                {deliveryMessage === '직접입력' && (
                  <textarea
                    placeholder="요청사항을 입력해주세요"
                    className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                )}
              </div>
            </div>

            {/* 결제 수단 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-green-500" />
                결제 수단
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedPayment === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={selectedPayment === method.id}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                      className="sr-only"
                    />
                    
                    <div className="text-2xl">{method.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{method.name}</div>
                      {method.isRecommended && (
                        <div className="text-xs text-blue-600">추천</div>
                      )}
                    </div>
                    
                    {selectedPayment === method.id && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                  </label>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <div className="font-medium mb-1">안전한 결제</div>
                    <div>모든 결제는 SSL 암호화로 보호됩니다.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 이용약관 동의 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold mb-6">약관 동의</h2>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      구매조건 확인 및 결제진행에 동의 (필수)
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• 개인정보 수집·이용 동의</div>
                      <div>• 개인정보 제3자 제공 동의</div>
                      <div>• 전자금융거래 이용약관 동의</div>
                      <div>• 구매조건 및 환불규정 확인</div>
                    </div>
                  </div>
                </label>
              </div>
              
              {!agreeTerms && (
                <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>필수 약관에 동의해주세요.</span>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 결제 정보 */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 sticky top-4">
              <h3 className="text-lg font-bold mb-6">결제 정보</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span>상품금액</span>
                  <span>{subtotal.toLocaleString()}원</span>
                </div>
                
                <div className="flex justify-between text-green-600">
                  <span>쿠폰할인</span>
                  <span>-{couponDiscount.toLocaleString()}원</span>
                </div>
                
                <div className="flex justify-between">
                  <span>배송비</span>
                  <span className="text-orange-600">무료 (로켓배송)</span>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>총 결제금액</span>
                    <span className="text-blue-600">{totalAmount.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
              
              {/* 혜택 정보 */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Gift className="w-4 h-4" />
                  <span>첫 구매 쿠폰 적용: -5,000원</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <Truck className="w-4 h-4" />
                  <span>로켓배송 무료: -3,000원</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Percent className="w-4 h-4" />
                  <span>적립 예정: {Math.floor(totalAmount * 0.01).toLocaleString()}원</span>
                </div>
              </div>
              
              <button
                onClick={handlePayment}
                disabled={!selectedAddress || !selectedPayment || !agreeTerms || isProcessing}
                className="w-full mt-8 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    결제 진행중...
                  </div>
                ) : (
                  `${totalAmount.toLocaleString()}원 결제하기`
                )}
              </button>
              
              <div className="mt-4 text-center">
                <Link
                  to="/dropshipping/cart"
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  ← 장바구니로 돌아가기
                </Link>
              </div>
            </div>

            {/* 고객센터 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold mb-4">도움이 필요하신가요?</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>고객센터: 1588-1234</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>운영시간: 9:00 - 18:00</span>
                </div>
                <div className="text-gray-600">
                  주문 관련 문의는 카카오톡 상담도 가능합니다.
                </div>
              </div>
              
              <button className="w-full mt-4 bg-yellow-400 text-gray-900 py-3 rounded-lg font-medium hover:bg-yellow-500 transition-colors">
                💬 카카오톡 상담
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;