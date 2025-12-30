/**
 * Neture Product Detail Page
 *
 * Phase G-2: B2C 핵심 기능 확장
 * 상품 상세 + 장바구니 담기 + 파트너 정보
 */

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { netureApi } from '@/api/neture.api';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { addToCart, isInCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['neture', 'product', productId],
    queryFn: () => netureApi.products.get(productId!),
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-10 bg-gray-200 rounded w-1/3" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">상품을 찾을 수 없습니다</h2>
          <p className="text-gray-500 mb-4">요청하신 상품이 존재하지 않거나 삭제되었습니다.</p>
          <Link
            to="/products"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            상품 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images || [];
  const primaryImage = images.find((img) => img.is_primary)?.url || images[0]?.url;
  const displayPrice = product.sale_price || product.base_price;
  const hasDiscount = product.sale_price && product.sale_price < product.base_price;
  const discountRate = hasDiscount
    ? Math.round((1 - product.sale_price! / product.base_price) * 100)
    : 0;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${productId}` } });
      return;
    }
    addToCart(product, quantity);
    navigate('/cart');
  };

  const isOutOfStock = product.stock === 0;
  const alreadyInCart = isInCart(product.id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center gap-2 text-gray-500">
            <li>
              <Link to="/" className="hover:text-blue-600">
                홈
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/products" className="hover:text-blue-600">
                상품
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 truncate max-w-[200px]">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
              {images.length > 0 ? (
                <img
                  src={images[selectedImageIndex]?.url || primaryImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                  No Image
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index
                        ? 'border-blue-600'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category Badge */}
            <div>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {product.category === 'healthcare' && '건강관리'}
                {product.category === 'beauty' && '뷰티'}
                {product.category === 'food' && '푸드'}
                {product.category === 'lifestyle' && '라이프스타일'}
                {product.category === 'other' && '기타'}
              </span>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{product.name}</h1>
              {product.subtitle && (
                <p className="mt-2 text-lg text-gray-500">{product.subtitle}</p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-1">
              {hasDiscount && (
                <div className="flex items-center gap-2">
                  <span className="text-lg text-gray-400 line-through">
                    {product.base_price.toLocaleString()}원
                  </span>
                  <span className="text-red-500 font-bold">{discountRate}% OFF</span>
                </div>
              )}
              <p className="text-3xl font-bold text-gray-900">
                {displayPrice.toLocaleString()}원
              </p>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {isOutOfStock ? (
                <span className="text-red-500 font-medium">품절</span>
              ) : (
                <>
                  <span className="text-green-600 font-medium">재고 있음</span>
                  <span className="text-gray-400">({product.stock}개 남음)</span>
                </>
              )}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="flex items-center gap-4">
                <span className="text-gray-700 font-medium">수량</span>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 border-x min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isOutOfStock ? '품절' : isAuthenticated ? '바로 구매' : '로그인하고 구매'}
              </button>
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`px-6 py-4 border-2 font-bold rounded-lg transition-colors disabled:border-gray-300 disabled:text-gray-300 disabled:cursor-not-allowed ${
                  addedToCart
                    ? 'border-green-500 text-green-500 bg-green-50'
                    : alreadyInCart
                    ? 'border-gray-400 text-gray-600'
                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {addedToCart ? '✓ 담김' : alreadyInCart ? '장바구니에 있음' : '장바구니'}
              </button>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-12 bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">상품 설명</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-line">
              {product.description}
            </div>
          </div>
        )}

        {/* Partner Info - Enhanced */}
        {product.partner && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">판매자 정보</h2>
            <div className="flex items-start gap-4">
              {product.partner.logo ? (
                <img
                  src={product.partner.logo}
                  alt={product.partner.name}
                  className="w-20 h-20 rounded-lg object-cover border"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                  {product.partner.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-lg text-gray-900">{product.partner.name}</p>
                {product.partner.business_name && (
                  <p className="text-sm text-gray-500">{product.partner.business_name}</p>
                )}
                {product.partner.description && (
                  <p className="mt-2 text-gray-600 text-sm line-clamp-2">
                    {product.partner.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className={`px-2 py-1 rounded ${
                    product.partner.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {product.partner.status === 'active' ? '인증된 판매자' : '판매자'}
                  </span>
                  {product.partner.website && (
                    <a
                      href={product.partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      웹사이트 방문
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
