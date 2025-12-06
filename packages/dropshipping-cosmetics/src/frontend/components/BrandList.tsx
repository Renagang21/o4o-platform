/**
 * BrandList Component
 *
 * Displays a grid of cosmetics brands with pagination
 */

import React, { useEffect, useState } from 'react';
import { BrandCard, BrandData } from './BrandCard.js';

interface BrandListProps {
  apiBaseUrl?: string;
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  tags?: string[];
  onBrandClick?: (brandId: string) => void;
}

interface BrandListResponse {
  success: boolean;
  data: BrandData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const BrandList: React.FC<BrandListProps> = ({
  apiBaseUrl = '/api/v1',
  page = 1,
  limit = 20,
  search,
  country,
  tags,
  onBrandClick,
}) => {
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchBrands();
  }, [page, limit, search, country, tags]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (country) params.append('country', country);
      if (tags && tags.length > 0) params.append('tags', tags.join(','));

      const response = await fetch(`${apiBaseUrl}/cosmetics/brands?${params.toString()}`);
      const result: BrandListResponse = await response.json();

      if (result.success) {
        setBrands(result.data);
        setPagination(result.pagination);
      } else {
        setError('Failed to load brands');
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: limit }).map((_, idx) => (
          <div key={idx} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">⚠️ {error}</p>
        <button
          onClick={fetchBrands}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (brands.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-500 text-lg">No brands found</p>
        {(search || country || tags) && (
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
        )}
      </div>
    );
  }

  return (
    <div className="brand-list">
      {/* Brand Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {brands.map((brand) => (
          <BrandCard
            key={brand.id}
            brand={brand}
            onClick={onBrandClick}
          />
        ))}
      </div>

      {/* Pagination Info */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} brands
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

export default BrandList;
