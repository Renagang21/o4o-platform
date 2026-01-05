/**
 * StoreCart - 약국 몰 장바구니 페이지
 * Mock 데이터 제거, API 연동 구조
 * Kiosk/Tablet 모드 지원
 */

import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Minus, Plus, Trash2, ShoppingCart, Loader2, AlertCircle, Info } from 'lucide-react';
import { storeApi } from '@/api/store';
import type { CartItem } from '@/types/store';
import { useStoreMode } from '@/contexts/StoreModeContext';

export default function StoreCart() {
  const { pharmacyId: storeSlug } = useParams<{ pharmacyId: string }>();
  const { mode, orderChannel, isKioskMode, isTabletMode, getStorePath, fontSize } = useStoreMode();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 장바구니 로드
  useEffect(() => {
    if (!storeSlug) return;

    const loadCart = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await storeApi.getCart(storeSlug);
        if (res.success && res.data) {
          setCartItems(res.data);
        } else {
          throw new Error('장바구니를 불러올 수 없습니다.');
        }
      } catch (err: any) {
        console.error('Cart load error:', err);
        // 인증 오류인 경우 빈 장바구니로 처리
        if (err.status === 401) {
          setCartItems([]);
        } else {
          setError(err.message || '장바구니를 불러오는데 실패했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [storeSlug]);

  const handleQuantityChange = async (itemId: string, delta: number) => {
    if (!storeSlug) return;

    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      await storeApi.updateCartItem(storeSlug, itemId, newQty);
      setCartItems(items =>
        items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i)
      );
    } catch (err: any) {
      alert(err.message || '수량 변경에 실패했습니다.');
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!storeSlug) return;

    if (!confirm('이 상품을 장바구니에서 삭제하시겠습니까?')) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      await storeApi.removeFromCart(storeSlug, itemId);
      setCartItems(items => items.filter(i => i.id !== itemId));
    } catch (err: any) {
      alert(err.message || '삭제에 실패했습니다.');
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // 계산
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.product.salePrice || item.product.price) * item.quantity,
    0
  );
  const shippingFee = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">오류가 발생했습니다</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  // 폰트 사이즈 클래스
  const fontSizeClass = fontSize === 'xlarge' ? 'text-xl' : fontSize === 'large' ? 'text-lg' : 'text-base';
  const headingClass = fontSize === 'xlarge' ? 'text-3xl' : fontSize === 'large' ? 'text-2xl' : 'text-2xl';

  // 빈 장바구니
  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingCart className={`${fontSize === 'xlarge' ? 'w-28 h-28' : 'w-20 h-20'} text-slate-200 mx-auto mb-4`} />
        <h2 className={`${headingClass} font-bold text-slate-800 mb-2`}>장바구니가 비어있습니다</h2>
        <p className={`${fontSizeClass} text-slate-500 mb-6`}>상품을 추가해주세요</p>
        <NavLink
          to={getStorePath('products')}
          className={`inline-flex items-center gap-2 ${fontSize === 'xlarge' ? 'px-8 py-4 text-xl' : 'px-6 py-3'} bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors`}
        >
          쇼핑 계속하기
        </NavLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${headingClass} font-bold text-slate-800`}>장바구니</h1>
          <p className={`text-slate-500 ${fontSizeClass}`}>{cartItems.length}개의 상품</p>
        </div>
        <NavLink
          to={getStorePath('products')}
          className={`flex items-center gap-2 text-slate-600 hover:text-slate-800 ${fontSizeClass}`}
        >
          <ArrowLeft className={fontSize === 'xlarge' ? 'w-6 h-6' : 'w-4 h-4'} />
          쇼핑 계속하기
        </NavLink>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            const isUpdating = updatingItems.has(item.id);
            const displayPrice = item.product.salePrice || item.product.price;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl shadow-sm p-4 flex gap-4 ${isUpdating ? 'opacity-50' : ''}`}
              >
                {/* Image */}
                <NavLink
                  to={getStorePath(`products/${item.productId}`)}
                  className={`${fontSize === 'xlarge' ? 'w-32 h-32' : 'w-24 h-24'} bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden`}
                >
                  {item.product.thumbnailUrl ? (
                    <img
                      src={item.product.thumbnailUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-slate-300" />
                  )}
                </NavLink>

                {/* Info */}
                <div className="flex-1">
                  <NavLink
                    to={getStorePath(`products/${item.productId}`)}
                    className={`font-medium text-slate-800 hover:text-primary-600 ${fontSizeClass}`}
                  >
                    {item.product.name}
                  </NavLink>
                  <p className="text-lg font-bold text-primary-600 mt-1">
                    {displayPrice.toLocaleString()}원
                  </p>
                  {item.product.isDropshipping && (
                    <p className="text-xs text-slate-400 mt-1">공급자 직배송</p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity */}
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={item.quantity <= 1 || isUpdating}
                        className="p-1.5 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1)}
                        disabled={isUpdating}
                        className="p-1.5 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={isUpdating}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <p className="text-sm text-slate-400">소계</p>
                  <p className="font-bold text-slate-800">
                    {(displayPrice * item.quantity).toLocaleString()}원
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
            <h2 className="font-semibold text-slate-800 mb-4">주문 요약</h2>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">상품 금액</span>
                <span className="text-slate-800">{subtotal.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">배송비</span>
                <span className="text-slate-800">
                  {shippingFee === 0 ? (
                    <span className="text-green-600">무료</span>
                  ) : (
                    `${shippingFee.toLocaleString()}원`
                  )}
                </span>
              </div>
              {subtotal < 50000 && (
                <p className="text-xs text-primary-600 bg-primary-50 p-2 rounded-lg">
                  {(50000 - subtotal).toLocaleString()}원 더 담으면 무료배송!
                </p>
              )}
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">총 결제금액</span>
                <span className="text-2xl font-bold text-primary-600">
                  {total.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 키오스크/태블릿 모드 법적 고지 */}
            {(isKioskMode || isTabletMode) && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">주문 안내</p>
                    <ul className="space-y-1 text-amber-700">
                      <li>• 본 주문은 비회원 주문입니다</li>
                      <li>• 주문 책임은 약국(판매자)에 있습니다</li>
                      <li>• 약국 직원의 확인 후 결제가 진행됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 이용약관 동의 (키오스크/태블릿) */}
            {(isKioskMode || isTabletMode) && (
              <label className="flex items-start gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-600">
                  이용약관 및 개인정보처리방침에 동의합니다.
                  (비회원 주문 시 필수)
                </span>
              </label>
            )}

            <button
              disabled={(isKioskMode || isTabletMode) && !agreedToTerms}
              onClick={() => {
                // TODO: 주문 생성 API 호출 시 orderChannel 전달
                console.log('Order channel:', orderChannel);
                alert(`주문이 접수되었습니다. (채널: ${orderChannel})`);
              }}
              className={`w-full ${fontSize === 'xlarge' ? 'py-5 text-xl' : 'py-3'} bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed`}
            >
              {isKioskMode || isTabletMode ? '주문 요청하기' : '주문하기'}
            </button>

            {/* 일반 모드 안내 */}
            {!isKioskMode && !isTabletMode && (
              <p className="text-xs text-slate-400 text-center mt-4">
                주문 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
              </p>
            )}

            {/* 키오스크/태블릿 모드 추가 안내 */}
            {(isKioskMode || isTabletMode) && (
              <p className="text-xs text-slate-500 text-center mt-4">
                주문 확인 후 약국 직원이 안내해드립니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
