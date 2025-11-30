import { useState, useEffect } from 'react';
import FilterPanel from '../components/FilterPanel';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import { fetchProducts } from '../services/api';
import type { CosmeticsFilters } from '../types';

export default function ProductSourcingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState<CosmeticsFilters>({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 12,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [filters, pagination.currentPage]);

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await fetchProducts({
        ...filters,
        page: pagination.currentPage,
        limit: pagination.limit,
      });

      setProducts(response.data.products);
      setPagination({
        ...pagination,
        totalPages: response.data.pagination.totalPages,
        totalCount: response.data.pagination.totalCount,
      });
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(newFilters: Partial<CosmeticsFilters>) {
    setFilters({ ...filters, ...newFilters });
    setPagination({ ...pagination, currentPage: 1 });
  }

  function handlePageChange(page: number) {
    setPagination({ ...pagination, currentPage: page });
  }

  return (
    <div className="flex gap-8">
      {/* Filter Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <FilterPanel filters={filters} onChange={handleFilterChange} />
      </aside>

      {/* Product Grid */}
      <div className="flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">화장품 제품 소싱</h1>
          <p className="mt-2 text-sm text-gray-600">
            {pagination.totalCount}개의 제품을 찾았습니다
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">검색 결과가 없습니다</p>
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
