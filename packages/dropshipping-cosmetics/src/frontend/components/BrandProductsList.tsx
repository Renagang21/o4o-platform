/**
 * BrandProductsList Component
 *
 * Displays products for a specific cosmetics brand
 */

import React, { useEffect, useState } from 'react';
import { CosmeticsProductCard, ProductData } from './CosmeticsProductCard.js';

interface BrandProductsListProps {
  brandName: string;
  apiBaseUrl?: string;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  showBrandHeader?: boolean;
}

interface ProductListResponse {
  success: boolean;
  data: ProductData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const BrandProductsList: React.FC<BrandProductsListProps> = ({
  brandName,
  apiBaseUrl = '/api/v1',
  page = 1,
  limit = 20,
  sort = 'newest',
  showBrandHeader = true,
}) => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, [brandName, page, limit, sort]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('sort', sort);
      params.append('brand', brandName);

      const response = await fetch(`${apiBaseUrl}/cosmetics/products?${params.toString()}`);
      const result: ProductListResponse = await response.json();

      if (result.success) {
        setProducts(result.data);
        setPagination(result.pagination);
      } else {
        setError('Failed to load products');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div>
        {showBrandHeader && (
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, idx) => (
            <div key={idx} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">⚠️ {error}</p>
        <button
          onClick={fetchProducts}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div>
        {showBrandHeader && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{brandName}</h2>
            <p className="text-gray-600">Cosmetics products</p>
          </div>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">No products found for {brandName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-products-list">
      {/* Brand Header */}
      {showBrandHeader && (
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{brandName}</h2>
          <p className="text-gray-600">
            {pagination.total} {pagination.total === 1 ? 'product' : 'products'}
          </p>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {products.map((product) => (
          <CosmeticsProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination Info */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} products
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 border border-gray-300 rounded bg-blue-50 text-blue-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandProductsList;
