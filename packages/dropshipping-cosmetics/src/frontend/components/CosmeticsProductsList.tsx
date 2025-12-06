/**
 * CosmeticsProductsList Component (Skeleton)
 *
 * Main product list component with filtering, sorting, and pagination
 * Actual design/styling will be handled by Antigravity
 */

import React, { useEffect, useState } from 'react';
import { CosmeticsProductCard } from './CosmeticsProductCard.js';
import { CosmeticsFilterSidebar, FilterState } from './CosmeticsFilterSidebar.js';

interface ProductListItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  metadata: {
    skinTypes: string[];
    concerns: string[];
    category?: string;
    certifications: string[];
  };
}

interface ProductListData {
  items: ProductListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CosmeticsProductsListProps {
  apiBaseUrl?: string;
  initialFilters?: Partial<FilterState>;
  initialSort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  initialLimit?: number;
}

export const CosmeticsProductsList: React.FC<CosmeticsProductsListProps> = ({
  apiBaseUrl = '/api/v1',
  initialFilters = {},
  initialSort = 'newest',
  initialLimit = 20,
}) => {
  const [data, setData] = useState<ProductListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    skinType: initialFilters.skinType || [],
    concerns: initialFilters.concerns || [],
    brand: initialFilters.brand,
    category: initialFilters.category,
    certifications: initialFilters.certifications || [],
  });

  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);

  // Fetch products when filters/sort/page changes
  useEffect(() => {
    fetchProducts();
  }, [filters, sort, page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('sort', sort);

      if (filters.skinType.length > 0) {
        params.append('skinType', filters.skinType.join(','));
      }
      if (filters.concerns.length > 0) {
        params.append('concerns', filters.concerns.join(','));
      }
      if (filters.brand) {
        params.append('brand', filters.brand);
      }
      if (filters.category) {
        params.append('category', filters.category);
      }
      if (filters.certifications.length > 0) {
        params.append('certifications', filters.certifications.join(','));
      }

      const response = await fetch(`${apiBaseUrl}/cosmetics/products?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.message || 'Failed to load products');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (updatedFilters: FilterState) => {
    setFilters(updatedFilters);
    setPage(1); // Reset to first page on filter change
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort as any);
    setPage(1); // Reset to first page on sort change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="cosmetics-products-list-skeleton p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 mb-4 w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, idx) => (
              <div key={idx} className="h-64 bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cosmetics-products-list-error p-4">
        <div className="bg-red-50 border border-red-200 p-4">
          <p className="text-red-600">⚠️ {error}</p>
        </div>
      </div>
    );
  }

  // No data
  if (!data) {
    return null;
  }

  return (
    <div className="cosmetics-products-list">
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 p-4">
        {/* Filter Sidebar */}
        <div className="filter-sidebar">
          <CosmeticsFilterSidebar filters={filters} onChange={handleFilterChange} />
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Header with sort and results count */}
          <div className="list-header flex justify-between items-center mb-4">
            <div className="results-count text-gray-600">
              {data.total} products found
            </div>
            <div className="sort-selector">
              <label className="mr-2">Sort by:</label>
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="p-2 bg-white border"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Popular</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div className="product-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {data.items.map((product) => (
              <CosmeticsProductCard key={product.id} {...product} />
            ))}
          </div>

          {/* No results */}
          {data.items.length === 0 && (
            <div className="no-results bg-yellow-50 border border-yellow-200 p-4 text-center">
              <p className="text-yellow-700">No products match your filters.</p>
            </div>
          )}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="pagination flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>

              {[...Array(data.totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 ${
                      page === pageNum ? 'bg-blue-600 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === data.totalPages}
                className="px-4 py-2 bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CosmeticsProductsList;
