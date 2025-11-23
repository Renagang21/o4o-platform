/**
 * Wishlist Component
 * R-6-6: Customer wishlist page
 *
 * Features:
 * - Display all wishlisted products
 * - Remove from wishlist
 * - Navigate to product detail
 * - Empty state handling
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { wishlistService, WishlistItem } from '../../services/wishlistService';
import { DashboardSkeleton } from '../common/Skeleton';
import { Heart, ShoppingCart, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Wishlist: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    if (!user) {
      navigate('/login?redirect=/my-account/wishlist');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const wishlistItems = await wishlistService.getWishlistItems();
      setItems(wishlistItems);
    } catch (err) {
      console.error('Failed to load wishlist:', err);
      setError('위시리스트를 불러오는데 실패했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      setRemovingId(productId);
      await wishlistService.removeFromWishlist(productId);

      // Update local state
      setItems(items.filter(item => item.productId !== productId));
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
      alert('위시리스트에서 삭제하는데 실패했습니다.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">나의 위시리스트</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-900">나의 위시리스트</h1>
        </div>
        <p className="text-gray-600">
          관심있는 상품들을 저장하고 나중에 확인하세요
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Wishlist Items */}
      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              위시리스트가 비어 있습니다
            </h2>
            <p className="text-gray-600 mb-6">
              마음에 드는 상품을 위시리스트에 추가해 보세요
            </p>
            <button
              onClick={() => navigate('/store/products')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ShoppingCart className="w-5 h-5" />
              상품 둘러보기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Item Count */}
          <div className="mb-4">
            <p className="text-gray-600">
              총 <span className="font-semibold text-gray-900">{items.length}개</span>의 상품
            </p>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-100">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-16 h-16 text-gray-300" />
                    </div>
                  )}

                  {/* Remove Button (Overlay) */}
                  <button
                    onClick={() => handleRemove(item.productId)}
                    disabled={removingId === item.productId}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="위시리스트에서 삭제"
                  >
                    {removingId === item.productId ? (
                      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Heart className="w-5 h-5 text-red-500 fill-current" />
                    )}
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {item.productName}
                  </h3>

                  <p className="text-lg font-bold text-gray-900 mb-3">
                    {item.productPrice.toLocaleString()}원
                  </p>

                  {item.addedAt && (
                    <p className="text-xs text-gray-500 mb-3">
                      추가일: {new Date(item.addedAt).toLocaleDateString()}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewProduct(item.productId)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      상품 보기
                    </button>
                    <button
                      onClick={() => handleRemove(item.productId)}
                      disabled={removingId === item.productId}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Back to Account */}
      <div className="mt-8">
        <button
          onClick={() => navigate('/account')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← 계정 대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
};

// Shortcode definition
export const wishlistShortcode: ShortcodeDefinition = {
  name: 'wishlist',
  description: '고객 위시리스트 페이지',
  component: () => <Wishlist />
};

// Export as array for auto-registration
export const wishlistShortcodes = [wishlistShortcode];

export default Wishlist;
