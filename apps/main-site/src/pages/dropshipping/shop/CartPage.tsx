import { useState, useEffect, FC } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Minus, Trash2, Heart, Truck, Shield, 
  AlertCircle, ChevronRight, Gift, Percent, Clock
} from 'lucide-react';
import Navbar from '../../../components/Navbar';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  quantity: number;
  image: string;
  isRocket: boolean;
  isFreeShipping: boolean;
  stock: number;
  category: string;
}

interface CouponInfo {
  id: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  isApplicable: boolean;
}

const CartPage: FC = () => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 모의 장바구니 데이터
    const mockCartItems: CartItem[] = [
      {
        id: '1',
        productId: '1',
        name: '프리미엄 오메가3 1000mg 90캡슐',
        brand: '네이처메이드',
        price: 29900,
        originalPrice: 45000,
        discount: 34,
        quantity: 2,
        image: '/products/omega3.jpg',
        isRocket: true,
        isFreeShipping: true,
        stock: 10,
        category: 'supplements'
      },
      {
        id: '2',
        productId: '2',
        name: '종합비타민 멀티비타민 60정',
        brand: '센트룸',
        price: 19900,
        originalPrice: 25000,
        discount: 20,
        quantity: 1,
        image: '/products/multivitamin.jpg',
        isRocket: false,
        isFreeShipping: true,
        stock: 5,
        category: 'supplements'
      },
      {
        id: '3',
        productId: '3',
        name: '혈압측정기 자동 전자 혈압계',
        brand: '오므론',
        price: 89000,
        originalPrice: 120000,
        discount: 26,
        quantity: 1,
        image: '/products/blood-pressure.jpg',
        isRocket: true,
        isFreeShipping: true,
        stock: 3,
        category: 'medical'
      }
    ];

    const mockCoupons: CouponInfo[] = [
      {
        id: '1',
        name: '첫 구매 10% 할인',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 30000,
        maxDiscountAmount: 10000,
        isApplicable: true
      },
      {
        id: '2',
        name: '5만원 이상 구매시 5000원 할인',
        discountType: 'fixed',
        discountValue: 5000,
        minOrderAmount: 50000,
        isApplicable: true
      },
      {
        id: '3',
        name: '건강식품 15% 할인',
        discountType: 'percentage',
        discountValue: 15,
        minOrderAmount: 20000,
        maxDiscountAmount: 15000,
        isApplicable: true
      }
    ];

    setCartItems(mockCartItems);
    setCoupons(mockCoupons);
    setSelectedItems(mockCartItems.map(item => item.id));
  }, []);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setCartItems(items =>
      items.map(item =>
        item.id === itemId 
          ? { ...item, quantity: Math.min(newQuantity, item.stock) }
          : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
    setSelectedItems(selected => selected.filter(id => id !== itemId));
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(selected =>
      selected.includes(itemId)
        ? selected.filter(id => id !== itemId)
        : [...selected, itemId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map(item => item.id));
    }
  };

  const moveToWishlist = (itemId: string) => {
    // 찜하기로 이동 로직
    removeItem(itemId);
    alert('찜한 상품으로 이동되었습니다.');
  };

  // 선택된 상품들의 총 계산
  const selectedCartItems = cartItems.filter(item => selectedItems.includes(item.id));
  const subtotal = selectedCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = selectedCartItems.reduce((sum, item) => {
    const discount = item.originalPrice ? (item.originalPrice - item.price) * item.quantity : 0;
    return sum + discount;
  }, 0);

  // 쿠폰 할인 계산
  const calculateCouponDiscount = () => {
    if (!selectedCoupon) return 0;
    
    const coupon = coupons.find(c => c.id === selectedCoupon);
    if (!coupon || subtotal < coupon.minOrderAmount) return 0;
    
    if (coupon.discountType === 'percentage') {
      const discount = subtotal * (coupon.discountValue / 100);
      return coupon.maxDiscountAmount ? Math.min(discount, coupon.maxDiscountAmount) : discount;
    } else {
      return coupon.discountValue;
    }
  };

  const couponDiscount = calculateCouponDiscount();
  const shippingFee = selectedCartItems.some(item => !item.isFreeShipping) ? 3000 : 0;
  const finalTotal = subtotal - couponDiscount + shippingFee;

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert('주문할 상품을 선택해주세요.');
      return;
    }
    
    setIsLoading(true);
    // 결제 페이지로 이동하는 로직
    setTimeout(() => {
      setIsLoading(false);
      alert('주문 페이지로 이동합니다.');
    }, 1000);
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
            <span className="text-gray-900">장바구니</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">장바구니</h1>
          <div className="text-sm text-gray-600">
            전체 {cartItems.length}개 상품
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">장바구니가 비어있습니다</h2>
            <p className="text-gray-600 mb-6">원하는 상품을 담아보세요!</p>
            <Link
              to="/dropshipping"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              쇼핑 계속하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 왼쪽: 장바구니 상품 목록 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 전체 선택 및 액션 */}
              <div className="bg-white rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                      onChange={toggleAllSelection}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="font-medium">
                      전체선택 ({selectedItems.length}/{cartItems.length})
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <button 
                      onClick={() => {
                        selectedItems.forEach(removeItem);
                        setSelectedItems([]);
                      }}
                      className="text-gray-600 hover:text-red-600"
                    >
                      선택삭제
                    </button>
                    <button 
                      onClick={() => {
                        selectedItems.forEach(moveToWishlist);
                        setSelectedItems([]);
                      }}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      찜하기
                    </button>
                  </div>
                </div>
              </div>

              {/* 상품 목록 */}
              <div className="space-y-4">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      
                      <Link to={`/dropshipping/product/${item.productId}`} className="flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/api/placeholder/96/96';
                          }}
                        />
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-1">{item.brand}</div>
                            <Link 
                              to={`/dropshipping/product/${item.productId}`}
                              className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
                            >
                              {item.name}
                            </Link>
                            
                            <div className="flex items-center gap-2 mt-2">
                              {item.isRocket && (
                                <div className="flex items-center gap-1 text-orange-600 text-xs">
                                  <Truck className="w-3 h-3" />
                                  <span>로켓배송</span>
                                </div>
                              )}
                              {item.isFreeShipping && (
                                <div className="flex items-center gap-1 text-green-600 text-xs">
                                  <Shield className="w-3 h-3" />
                                  <span>무료배송</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => moveToWishlist(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Heart className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-500 ml-2">
                              (재고: {item.stock}개)
                            </span>
                          </div>
                          
                          <div className="text-right">
                            {item.originalPrice && (
                              <div className="text-sm text-gray-400 line-through">
                                {(item.originalPrice * item.quantity).toLocaleString()}원
                              </div>
                            )}
                            <div className="text-xl font-bold text-gray-900">
                              {(item.price * item.quantity).toLocaleString()}원
                            </div>
                            {item.discount && (
                              <div className="text-sm text-red-500 font-medium">
                                {item.discount}% 할인
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {item.quantity >= item.stock && (
                          <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 text-red-700 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">재고가 부족합니다.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 추천 상품 */}
              <div className="bg-white rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">🔥 함께 구매하면 좋은 상품</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i: any) => (
                    <Link
                      key={i}
                      to={`/dropshipping/product/${i + 10}`}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <img
                        src={`/api/placeholder/150/150`}
                        alt={`추천상품 ${i}`}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                      <div className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        추천 상품 {i}
                      </div>
                      <div className="text-sm font-bold text-blue-600">
                        {(15000 + i * 5000).toLocaleString()}원
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 주문 요약 */}
            <div className="space-y-6">
              {/* 쿠폰 선택 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-green-500" />
                  쿠폰 사용
                </h3>
                
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    사용 가능한 쿠폰 {coupons.filter(c => c.isApplicable).length}개
                  </div>
                  
                  {coupons.filter(c => c.isApplicable).map((coupon: any) => (
                    <label key={coupon.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="coupon"
                        value={coupon.id}
                        checked={selectedCoupon === coupon.id}
                        onChange={(e: any) => setSelectedCoupon(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{coupon.name}</div>
                        <div className="text-xs text-gray-500">
                          {coupon.minOrderAmount.toLocaleString()}원 이상 구매시
                          {coupon.discountType === 'percentage' 
                            ? ` ${coupon.discountValue}% 할인` 
                            : ` ${coupon.discountValue.toLocaleString()}원 할인`
                          }
                          {coupon.maxDiscountAmount && 
                            ` (최대 ${coupon.maxDiscountAmount.toLocaleString()}원)`
                          }
                        </div>
                      </div>
                    </label>
                  ))}
                  
                  <button 
                    onClick={() => setSelectedCoupon(null)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    쿠폰 사용 안함
                  </button>
                </div>
              </div>

              {/* 결제 정보 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 sticky top-4">
                <h3 className="text-lg font-bold mb-4">결제 정보</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>상품금액</span>
                    <span>{subtotal.toLocaleString()}원</span>
                  </div>
                  
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>상품할인</span>
                      <span>-{totalDiscount.toLocaleString()}원</span>
                    </div>
                  )}
                  
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>쿠폰할인</span>
                      <span>-{couponDiscount.toLocaleString()}원</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>배송비</span>
                    <span>{shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()}원`}</span>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>총 결제금액</span>
                      <span className="text-blue-600">{finalTotal.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
                
                {/* 배송 정보 */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium text-sm">배송 안내</span>
                  </div>
                  <div className="text-xs text-blue-600 space-y-1">
                    <div>• 로켓배송: 오늘 밤 12시 전 주문시 내일 도착</div>
                    <div>• 일반배송: 2-3일 소요</div>
                    <div>• 50,000원 이상 구매시 무료배송</div>
                  </div>
                </div>
                
                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0 || isLoading}
                  className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      처리중...
                    </div>
                  ) : (
                    `${selectedItems.length}개 상품 주문하기`
                  )}
                </button>
                
                <Link
                  to="/dropshipping"
                  className="block w-full mt-3 text-center text-gray-600 hover:text-gray-900 py-2"
                >
                  쇼핑 계속하기
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;