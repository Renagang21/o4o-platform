/**
 * Product Detail Page
 * Phase 5-1: Storefront Product Detail
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { ArrowLeft, ShoppingCart, Plus, Minus, Heart } from 'lucide-react';
import type { StorefrontProduct } from '../../types/storefront';
import { storefrontAPI } from '../../services/storefrontApi';
import { useCartStore } from '../../stores/cartStore';
import { useAuth } from '../../contexts/AuthContext';
import { wishlistService } from '../../services/wishlistService';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const { user } = useAuth();

  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // R-6-6: Wishlist state
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // 상품 상세 조회
  const fetchProductDetail = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await storefrontAPI.fetchProductDetail(id);
      if (response.success) {
        setProduct(response.data);
        setSelectedImage(response.data.main_image || '');
      }
    } catch (err: any) {
      console.error('상품 상세 조회 실패:', err);
      setError(err.message || '상품 상세를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetail();
  }, [id]);

  // R-6-6: Load wishlist status
  const loadWishlistStatus = async () => {
    if (!user || !id) {
      setIsInWishlist(false);
      return;
    }

    try {
      const inWishlist = await wishlistService.isInWishlist(id);
      setIsInWishlist(inWishlist);
    } catch (error) {
      console.error('Failed to load wishlist status:', error);
      setIsInWishlist(false);
    }
  };

  // R-6-6: Load wishlist status when user or product changes
  useEffect(() => {
    loadWishlistStatus();
  }, [user, id]);

  // R-6-6: Toggle wishlist
  const toggleWishlist = async () => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate(`/login?redirect=/product/${id}`);
      return;
    }

    if (!id) return;

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await wishlistService.removeFromWishlist(id);
        setIsInWishlist(false);
        console.log('Removed from wishlist');
      } else {
        await wishlistService.addToWishlist(id);
        setIsInWishlist(true);
        console.log('Added to wishlist');
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      alert('위시리스트 처리에 실패했습니다.');
    } finally {
      setWishlistLoading(false);
    }
  };

  // 금액 포맷
  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    if (currency === 'KRW') {
      return `₩ ${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  // 할인율 계산
  const calculateDiscountRate = (price: number, originalPrice?: number): number => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  // 수량 증가
  const increaseQuantity = () => {
    if (!product) return;
    if (quantity < product.stock_quantity) {
      setQuantity(quantity + 1);
    } else {
      alert(`최대 ${product.stock_quantity}개까지 구매 가능합니다.`);
    }
  };

  // 수량 감소
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // 장바구니 담기
  const handleAddToCart = () => {
    if (!product) return;

    cartStore.addItem(
      {
        product_id: product.id,
        product_name: product.name,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        price: product.price,
        currency: product.currency,
        main_image: product.main_image,
        available_stock: product.stock_quantity,
      },
      quantity
    );

    if (confirm(`${product.name} ${quantity}개가 장바구니에 담겼습니다.\n장바구니로 이동하시겠습니까?`)) {
      navigate('/checkout');
    }
  };

  // 바로 구매
  const handleBuyNow = () => {
    if (!product) return;

    cartStore.clearCart();
    cartStore.addItem(
      {
        product_id: product.id,
        product_name: product.name,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        price: product.price,
        currency: product.currency,
        main_image: product.main_image,
        available_stock: product.stock_quantity,
      },
      quantity
    );

    navigate('/checkout');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error || '상품을 찾을 수 없습니다.'}</div>
            <button
              onClick={() => navigate('/store/products')}
              className="text-blue-600 hover:underline"
            >
              상품 목록으로 돌아가기
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const discountRate = calculateDiscountRate(product.price, product.original_price);
  const totalPrice = product.price * quantity;
  const images = product.images && product.images.length > 0 ? product.images : product.main_image ? [product.main_image] : [];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
              {/* 이미지 영역 */}
              <div>
                {/* 메인 이미지 */}
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  {discountRate > 0 && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg text-lg font-bold">
                      {discountRate}% OFF
                    </div>
                  )}

                  {/* R-6-6: Wishlist Heart Button */}
                  <button
                    onClick={toggleWishlist}
                    disabled={wishlistLoading}
                    className="absolute top-4 right-4 p-3 bg-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                    title={isInWishlist ? '위시리스트에서 제거' : '위시리스트에 추가'}
                  >
                    {wishlistLoading ? (
                      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Heart
                        className={`w-6 h-6 transition-colors ${
                          isInWishlist
                            ? 'text-red-500 fill-current'
                            : 'text-gray-400 hover:text-red-500'
                        }`}
                      />
                    )}
                  </button>
                </div>

                {/* 썸네일 이미지 */}
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(img)}
                        className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 ${
                          selectedImage === img ? 'border-blue-500' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 상품 정보 영역 */}
              <div>
                {/* 판매자 */}
                <div className="text-sm text-gray-500 mb-2">{product.seller_name}</div>

                {/* 상품명 */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

                {/* 카테고리 */}
                {product.category && (
                  <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm mb-4">
                    {product.category}
                  </div>
                )}

                {/* 가격 */}
                <div className="mb-6">
                  {product.original_price && product.original_price > product.price && (
                    <div className="text-lg text-gray-400 line-through mb-1">
                      {formatCurrency(product.original_price, product.currency)}
                    </div>
                  )}
                  <div className="text-4xl font-bold text-gray-900">
                    {formatCurrency(product.price, product.currency)}
                  </div>
                </div>

                {/* 배송 정보 */}
                <div className="border-t border-b border-gray-200 py-4 mb-6 space-y-2">
                  {product.shipping_fee !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">배송비</span>
                      <span className="font-medium">
                        {product.shipping_fee === 0
                          ? '무료'
                          : formatCurrency(product.shipping_fee)}
                      </span>
                    </div>
                  )}
                  {product.estimated_delivery_days && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">배송 예정</span>
                      <span className="font-medium">{product.estimated_delivery_days}일 이내</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">재고</span>
                    <span className="font-medium">
                      {product.stock_quantity > 0
                        ? `${product.stock_quantity}개`
                        : '품절'}
                    </span>
                  </div>
                </div>

                {/* 수량 선택 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수량
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={decreaseQuantity}
                        className="p-2 hover:bg-gray-100"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="px-6 text-lg font-medium">{quantity}</span>
                      <button
                        onClick={increaseQuantity}
                        className="p-2 hover:bg-gray-100"
                        disabled={quantity >= product.stock_quantity}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="text-lg font-medium">
                      총 {formatCurrency(totalPrice, product.currency)}
                    </div>
                  </div>
                </div>

                {/* 구매 버튼 */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.is_available || product.stock_quantity === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    장바구니 담기
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={!product.is_available || product.stock_quantity === 0}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    바로 구매
                  </button>
                </div>
              </div>
            </div>

            {/* 상품 설명 */}
            <div className="border-t border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">상품 설명</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetailPage;
