import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';

export default function CustomerCart() {
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

  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchCartItems(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    // 모든 아이템을 기본 선택
    setSelectedItems(cartItems.map(item => item.id));
  }, [cartItems]);

  const getSelectedItems = () => {
    return cartItems.filter(item => selectedItems.includes(item.id));
  };

  const getSelectedSummary = () => {
    const selected = getSelectedItems();
    const subtotal = selected.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // 고객용 할인 (5만원 이상 무료배송만)
    const shipping = subtotal >= 50000 ? 0 : 3000;
    const tax = Math.floor((subtotal + shipping) * 0.1);
    const total = subtotal + shipping + tax;
    
    return { subtotal, discount: 0, shipping, tax, total };
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
    
    navigate('/customer/checkout', {
      state: { selectedItems: getSelectedItems() }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">로그인이 필요합니다</h3>
          <p className="mt-1 text-sm text-gray-500">장바구니를 이용하시려면 로그인해주세요.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

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
              <p className="mt-2 text-sm text-gray-600">선택한 상품들을 확인하고 주문하세요</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/customer/products')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                쇼핑 계속하기
              </button>
              <button
                onClick={() => navigate('/customer/orders')}
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
            <p className="mt-1 text-sm text-gray-500">원하는 상품을 장바구니에 담아보세요.</p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/customer/products')}
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
                        onChange={(e: any) => handleSelectAll(e.target.checked)}
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
                  {cartItems.map((item: any) => (
                    <div key={item.id} className="p-6">
                      <div className="flex items-start">
                        {/* 체크박스 */}
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e: any) => handleItemSelect(item.id, e.target.checked)}
                          className="mt-4 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />

                        {/* 상품 이미지 */}
                        <div className="flex-shrink-0 ml-4">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-20 w-20 rounded object-cover cursor-pointer"
                            onClick={() => navigate(`/customer/products/${item.productId}`)}
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
                                  onClick={() => navigate(`/customer/products/${item.productId}`)}
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
                                onChange={(e: any) => handleQuantityChange(item.id, Number(e.target.value))}
                                className="rounded border-gray-300 text-sm shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              >
                                {Array.from({ length: Math.min(50, item.stockQuantity) }, (_, i) => i + 1).map((num: any) => (
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
                    <li>• 5만원 이상 구매시 무료배송</li>
                    <li>• 평일 오후 2시 이전 주문시 당일 발송</li>
                    <li>• 안전한 결제 시스템으로 보호</li>
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