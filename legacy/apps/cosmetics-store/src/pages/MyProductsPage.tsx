import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';

export default function MyProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 12,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [pagination.currentPage]);

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await fetchMyProducts({
        limit: pagination.limit,
      });

      setProducts(response.data?.products || []);
      setPagination({
        ...pagination,
        totalPages: response.data?.pagination?.totalPages || 1,
        totalCount: response.data?.pagination?.totalCount || 0,
      });
    } catch (error) {
      console.error('Failed to load my products:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePageChange(page: number) {
    setPagination({ ...pagination, currentPage: page });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">내 소싱 상품</h1>
        <p className="mt-2 text-sm text-gray-600">
          총 {pagination.totalCount}개의 상품을 소싱했습니다
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : (
        <>
          {products.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-500 mb-4">
                <span className="text-5xl">📦</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                아직 소싱한 상품이 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                제품 소싱 페이지에서 판매할 화장품을 찾아보세요
              </p>
              <Link
                to="/sourcing"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                제품 소싱하러 가기
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

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
        </>
      )}
    </div>
  );
}
