import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { CartItem } from '../../types/order';

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    cartItems,
    fetchCartItems,
    updateCartItem,
    removeFromCart,
    clearCart,
    calculateCartSummary,
    isLoading,
    error,
    clearError,
  } = useOrderStore();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchCartItems(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    // 모든 아이템을 기본 선택
    setSelectedItems(cartItems.map(item => item.id));
  }, [cartItems]);

  const summary = calculateCartSummary();

  const getSelectedItems = () => {
    return cartItems.filter(item => selectedItems.includes(item.id));
  };

  const getSelectedSummary = () => {
    const selected = getSelectedItems();
    const subtotal = selected.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // 등급별 할인 계산
    let discountRate = 0;
    if (user?.userType === 'retailer') {
      const grade = (user as any).grade;
      switch (grade) {
        case 'vip':
          discountRate = 0.05;
          break;
        case 'premium':
          discountRate = 0.03;
          break;
        case 'gold':
        default:
          discountRate = 0;
          break;
      }
    }
    
    const discount = Math.floor(subtotal * discountRate);
    const isVip = user?.userType === 'retailer' && (user as any).grade === 'vip';
    const shipping = (subtotal >= 50000 || isVip) ? 0 : 3000;
    const tax = Math.floor((subtotal - discount + shipping) * 0.1);
    const total = subtotal - discount + shipping + tax;
    
    return { subtotal, discount, shipping, tax, total };
  };

  const handleQuantityChange = async (cartItemId: string, newQuantity: number) => {
    try {
      await updateCartItem(cartItemId, newQuantity);
    } catch (error) {
      toast.error('수량 변경에 실패했습니다.');
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    try {
      await removeFromCart(cartItemId);
      setSelectedItems(prev => prev.filter(id => id !== cartItemId));
      toast.success('상품이 장바구니에서 제거되었습니다.');
    } catch (error) {
      toast.error('상품 제거에 실패했습니다.');
    }
  };

  const handleClearCart = async () => {
    if (confirm('장바구니를 비우시겠습니까?')) {
      try {
        await clearCart();
        setSelectedItems([]);
        toast.success('장바구니가 비워졌습니다.');
      } catch (error) {
        toast.error('장바구니 비우기에 실패했습니다.');
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(cartItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleItemSelect = (cartItemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, cartItemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== cartItemId));
    }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error('주문할 상품을 선택해주세요.');
      return;
    }
    
    // 선택된 아이템들로 주문 페이지로 이동
    navigate('/retailer/checkout', {
      state: { selectedItems: getSelectedItems() }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getUserGrade = () => {
    if (user?.userType === 'retailer') {
      return (user as any).grade || 'gold';
    }
    return 'gold';
  };

  const getGradeBadge = () => {
    const grade = getUserGrade();
    const badges = {
      gold: 'bg-yellow-100 text-yellow-800',
      premium: 'bg-purple-100 text-purple-800',
      vip: 'bg-red-100 text-red-800',
    };
    
    const labels = {
      gold: 'GOLD',
      premium: 'PREMIUM',
      vip: 'VIP',
    };

    return (
      <span className={`px-2 py-1 text-xs font-bold rounded ${badges[grade as keyof typeof badges]}`}>
        {labels[grade as keyof typeof labels]} 회원
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">장바구니를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">장바구니</h1>
              <div className="mt-2 flex items-center space-x-2">
                {getGradeBadge()}
                <span className="text-sm text-gray-600">회원 등급 혜택이 적용됩니다</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/retailer/products')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                쇼핑 계속하기
              </button>
              <button
                onClick={() => navigate('/retailer/orders')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                주문 내역
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {cartItems.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">장바구니가 비어있습니다</h3>
            <p className="mt-1 text-sm text-gray-500">상품을 장바구니에 담아보세요.</p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/retailer/products')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                상품 둘러보기
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
            {/* 장바구니 아이템 목록 */}
            <div className="lg:col-span-8">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* 전체 선택 헤더 */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === cartItems.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        전체 선택 ({selectedItems.length}/{cartItems.length})
                      </span>
                    </div>
                    <button
                      onClick={handleClearCart}
                      className="text-sm text-red-600 hover:text-red-500"
                    >
                      전체 삭제
                    </button>
                  </div>
                </div>

                {/* 아이템 목록 */}
                <div className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-6">
                      <div className="flex items-start">
                        {/* 체크박스 */}
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                          className="mt-4 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />

                        {/* 상품 이미지 */}
                        <div className="flex-shrink-0 ml-4">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-20 w-20 rounded object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/images/placeholder.jpg';
                            }}
                          />
                        </div>

                        {/* 상품 정보 */}
                        <div className="ml-6 flex-1">
                          <div className="flex justify-between">
                            <div className="pr-6">
                              <h3 className="text-lg font-medium text-gray-900">
                                <button
                                  onClick={() => navigate(`/retailer/products/${item.productId}`)}
                                  className="hover:text-blue-600"
                                >
                                  {item.productName}
                                </button>
                              </h3>
                              {item.productBrand && (
                                <p className="mt-1 text-sm text-gray-500">{item.productBrand}</p>
                              )}
                              <p className="mt-1 text-sm text-gray-500">
                                공급업체: {item.supplierName}
                              </p>
                            </div>

                            {/* 가격 및 수량 */}
                            <div className="text-right">
                              <p className="text-lg font-medium text-gray-900">
                                ₩{formatPrice(item.unitPrice * item.quantity)}
                              </p>
                              <p className="text-sm text-gray-500">
                                개당 ₩{formatPrice(item.unitPrice)}
                              </p>
                            </div>
                          </div>

                          {/* 수량 조정 및 삭제 */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center">
                              <label htmlFor={`quantity-${item.id}`} className="text-sm text-gray-700 mr-2">
                                수량:
                              </label>
                              <select
                                id={`quantity-${item.id}`}
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                                className="rounded border-gray-300 text-sm shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              >
                                {Array.from({ length: Math.min(50, item.stockQuantity) }, (_, i) => i + 1).map((num) => (
                                  <option key={num} value={num}>
                                    {num}
                                  </option>
                                ))}
                              </select>
                              <span className="ml-2 text-sm text-gray-500">
                                (재고: {item.stockQuantity}개)
                              </span>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-sm text-red-600 hover:text-red-500"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="bg-white shadow rounded-lg p-6 sticky top-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">주문 요약</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">선택된 상품 ({selectedItems.length}개)</span>
                    <span className="text-sm font-medium">₩{formatPrice(getSelectedSummary().subtotal)}</span>
                  </div>
                  
                  {getSelectedSummary().discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">회원 할인</span>
                      <span className="text-sm font-medium text-red-600">-₩{formatPrice(getSelectedSummary().discount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">배송비</span>
                    <span className="text-sm font-medium">
                      {getSelectedSummary().shipping === 0 ? '무료' : `₩${formatPrice(getSelectedSummary().shipping)}`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">부가세</span>
                    <span className="text-sm font-medium">₩{formatPrice(getSelectedSummary().tax)}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">총 결제 금액</span>
                      <span className="text-xl font-bold text-gray-900">₩{formatPrice(getSelectedSummary().total)}</span>
                    </div>
                  </div>
                </div>

                {/* 혜택 안내 */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">💡 혜택 안내</h3>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {user?.userType === 'retailer' && (user as any).grade === 'vip' && (
                      <li>• VIP 회원 5% 추가 할인 적용</li>
                    )}
                    {user?.userType === 'retailer' && (user as any).grade === 'premium' && (
                      <li>• Premium 회원 3% 추가 할인 적용</li>
                    )}
                    <li>• 5만원 이상 구매시 무료배송</li>
                    {user?.userType === 'retailer' && (user as any).grade === 'vip' && (
                      <li>• VIP 회원 무료배송 혜택</li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className={`w-full mt-6 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                    selectedItems.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {selectedItems.length === 0 ? '상품을 선택해주세요' : '주문하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}