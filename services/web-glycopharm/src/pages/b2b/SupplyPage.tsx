/**
 * SupplyPage - B2B 공급 화면
 *
 * Neture 플랫폼의 공급자들이 GlycoPharm에 공급하기로 한 제품 목록
 * - 검증된 공급자의 제품만 표시
 * - 카테고리별 필터링
 * - 장바구니 및 주문 기능
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Tag,
  AlertTriangle,
  ChevronDown,
  X,
  Building2,
} from 'lucide-react';
import { EmptyState, LoadingState, ErrorState } from '@/components/common';
import { apiClient } from '@/services/api';
import type { B2BProduct, CartItem, CartItemWarning } from '@/types';

// 카테고리 옵션
const categoryOptions = [
  { value: 'all', label: '전체' },
  { value: 'cgm', label: 'CGM' },
  { value: 'blood_glucose_meter', label: '혈당측정기' },
  { value: 'test_strip', label: '시험지' },
  { value: 'lancet', label: '란셋' },
  { value: 'insulin_pen', label: '인슐린 펜' },
  { value: 'supplement', label: '건강기능식품' },
  { value: 'other', label: '기타' },
];

export default function SupplyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartPanel, setShowCartPanel] = useState(false);

  // API 상태
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Neture 공급자 제품 조회
        const response = await apiClient.get<B2BProduct[]>('/api/v1/glycopharm/supply/products');
        if (response.data) {
          setProducts(response.data);
        }
      } catch {
        // API가 없거나 에러 시 빈 배열 유지 (에러 표시 안함)
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 필터링된 상품
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // 장바구니 통계
  const cartStats = useMemo(() => {
    return {
      totalCount: cart.length,
      totalQty: cart.reduce((sum, item) => sum + item.quantity, 0),
      grandTotal: cart.reduce((sum, item) => sum + item.totalPrice, 0),
    };
  }, [cart]);

  // 장바구니에 상품 추가
  const addToCart = (product: B2BProduct) => {
    const unitPrice = product.discountPrice || product.price;
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      updateCartQty(product.id, existingItem.quantity + 1);
    } else {
      const warnings: CartItemWarning[] = [];
      if (product.minOrderQty && 1 < product.minOrderQty) {
        warnings.push({
          type: 'min_qty',
          message: `최소 ${product.minOrderQty}개 이상 주문 필요`,
        });
      }

      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        product,
        quantity: 1,
        source: 'general',
        unitPrice,
        totalPrice: unitPrice,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
      setCart([...cart, newItem]);
    }
  };

  // 장바구니 수량 변경
  const updateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map((item) => {
      if (item.product.id === productId) {
        const warnings: CartItemWarning[] = [];
        if (item.product.minOrderQty && newQty < item.product.minOrderQty) {
          warnings.push({
            type: 'min_qty',
            message: `최소 ${item.product.minOrderQty}개 이상 주문 필요`,
          });
        }
        if (item.product.maxOrderQty && newQty > item.product.maxOrderQty) {
          warnings.push({
            type: 'max_qty',
            message: `최대 ${item.product.maxOrderQty}개까지 주문 가능`,
          });
        }
        if (newQty > item.product.stock) {
          warnings.push({
            type: 'stock',
            message: `재고 부족 (현재 재고: ${item.product.stock})`,
          });
        }

        return {
          ...item,
          quantity: newQty,
          totalPrice: item.unitPrice * newQty,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      }
      return item;
    }));
  };

  // 장바구니에서 제거
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // 장바구니 비우기
  const clearCart = () => {
    if (confirm('장바구니를 비우시겠습니까?')) {
      setCart([]);
    }
  };

  // 장바구니에서 상품 찾기
  const getCartItem = (productId: string) => {
    return cart.find((item) => item.product.id === productId);
  };

  // 가격 포맷
  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR') + '원';
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="공급 상품 정보를 불러오는 중..." />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Supply</h1>
              <p className="text-sm text-slate-500">검증된 공급자의 제품을 조달합니다</p>
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mt-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-primary-800">Neture 검증 공급자</h3>
                <p className="text-sm text-primary-600">
                  Neture 플랫폼에 등록된 검증된 공급자들의 제품만 제공됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상품명, 공급자 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white min-w-[160px]"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm">
            <EmptyState
              icon={Package}
              title="등록된 공급 상품이 없습니다"
              description="Neture 공급자의 제품이 아직 등록되지 않았습니다."
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const cartItem = getCartItem(product.id);
              const displayPrice = product.discountPrice || product.price;
              const hasDiscount = product.discountPrice && product.discountPrice < product.price;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.isRecommended && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />추천
                      </span>
                    )}
                    {product.promotionBadge && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Tag className="w-3 h-3" />{product.promotionBadge}
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <h3 className="font-bold text-slate-800 mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-slate-500 mb-2 line-clamp-2">{product.description}</p>
                  <p className="text-xs text-slate-400 mb-3">{product.supplierName}</p>

                  {/* Price */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-800">
                        {formatPrice(displayPrice)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-slate-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                    {product.minOrderQty && (
                      <p className="text-xs text-amber-600 mt-1">
                        최소 {product.minOrderQty}개 이상 주문
                      </p>
                    )}
                  </div>

                  {/* Add to Cart */}
                  {cartItem ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQty(product.id, cartItem.quantity - 1)}
                        className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="flex-1 text-center font-medium">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateCartQty(product.id, cartItem.quantity + 1)}
                        className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full py-2.5 rounded-xl font-medium transition-colors bg-primary-600 text-white hover:bg-primary-700"
                    >
                      담기
                    </button>
                  )}

                  {/* Warning */}
                  {cartItem?.warnings && cartItem.warnings.length > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                      {cartItem.warnings.map((warning, idx) => (
                        <p key={idx} className="text-xs text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {warning.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini Cart (Fixed Bottom) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowCartPanel(true)}
                className="flex items-center gap-3"
              >
                <div className="relative">
                  <ShoppingCart className="w-6 h-6 text-slate-700" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                    {cartStats.totalQty}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm text-slate-500">
                    {cartStats.totalCount}종 / {cartStats.totalQty}개
                  </p>
                  <p className="font-bold text-slate-800">{formatPrice(cartStats.grandTotal)}</p>
                </div>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCartPanel(true)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50"
                >
                  장바구니 보기
                </button>
                <button
                  onClick={() => alert('주문 기능은 준비 중입니다.')}
                  className="px-6 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
                >
                  주문하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Panel (Slide-in) */}
      {showCartPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full overflow-y-auto">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">장바구니</h2>
              <button
                onClick={() => setShowCartPanel(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">장바구니가 비어있습니다</p>
                </div>
              ) : (
                <>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-800">{item.product.name}</h4>
                          <p className="text-sm text-slate-500">{item.product.supplierName}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center hover:bg-slate-100"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center hover:bg-slate-100"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="font-bold text-slate-800">{formatPrice(item.totalPrice)}</p>
                      </div>

                      {/* Warnings */}
                      {item.warnings && item.warnings.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                          {item.warnings.map((warning, idx) => (
                            <p key={idx} className="text-xs text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {warning.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="sticky bottom-0 bg-white border-t p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>총 결제금액</span>
                    <span className="text-primary-600">{formatPrice(cartStats.grandTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
                  >
                    비우기
                  </button>
                  <button
                    onClick={() => {
                      setShowCartPanel(false);
                      alert('주문 기능은 준비 중입니다.');
                    }}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
                  >
                    주문하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
