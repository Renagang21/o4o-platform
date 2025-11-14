/**
 * Seller Products Section
 * Can be used in dashboard (summary) or full-page mode
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { EmptyState } from '../../common/EmptyState';
import { sellerProductAPI } from '../../../services/sellerProductApi';
import {
  SellerProductListItem,
  GetSellerProductsQuery,
  SellerProductStatus,
} from '../../../types/seller-product';
import type { SectionMode } from '../supplier/SupplierProductsSection';

export interface SellerProductsSectionProps {
  mode?: SectionMode;
}

export const SellerProductsSection: React.FC<SellerProductsSectionProps> = ({
  mode = 'dashboard'
}) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<SellerProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<SellerProductStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'price'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = mode === 'dashboard' ? 5 : 20;

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const query: GetSellerProductsQuery = {
          page: currentPage,
          limit: pageSize,
          search: searchQuery || undefined,
          status: statusFilter,
          sort_by: sortBy,
          sort_order: sortOrder,
        };

        const response = await sellerProductAPI.fetchProducts(query);
        setProducts(response.data.products);
        setTotalPages(response.data.pagination.total_pages);
        setTotal(response.data.pagination.total);
      } catch (error) {
        console.error('Failed to fetch seller products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, pageSize, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 판매 상품을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await sellerProductAPI.deleteProduct(id);
      alert('판매 상품이 삭제되었습니다.');
      // Refresh list
      const query: GetSellerProductsQuery = {
        page: currentPage,
        limit: pageSize,
        search: searchQuery || undefined,
        status: statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      const response = await sellerProductAPI.fetchProducts(query);
      setProducts(response.data.products);
      setTotalPages(response.data.pagination.total_pages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: SellerProductStatus) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      active: '활성',
      inactive: '비활성',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (mode === 'dashboard') {
    // Summary mode for dashboard overview
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">상품 관리</h2>
          <Link
            to="/dashboard/seller/products"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기 →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12 text-gray-400" />}
            title="등록된 상품이 없습니다"
            description="공급업체 제품을 선택하여 판매를 시작하세요."
            action={
              <Link
                to="/dashboard/seller/products/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                상품 가져오기
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {product.thumbnail_url && (
                    <img
                      src={product.thumbnail_url}
                      alt={product.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{product.title}</div>
                    <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {product.sale_price.toLocaleString()}원
                    </div>
                    <div className="text-xs text-green-600">
                      +{product.margin_amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full-page mode
  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="상품명, SKU로 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SellerProductStatus | 'all');
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-') as [
                  'created_at' | 'title' | 'price',
                  'asc' | 'desc'
                ];
                setSortBy(by);
                setSortOrder(order);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at-desc">최신순</option>
              <option value="created_at-asc">오래된순</option>
              <option value="title-asc">이름순 (가나다)</option>
              <option value="title-desc">이름순 (역순)</option>
              <option value="price-desc">가격 높은순</option>
              <option value="price-asc">가격 낮은순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">등록된 판매 상품이 없습니다.</p>
          <button
            onClick={() => navigate('/dashboard/seller/products/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            첫 상품 가져오기
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    판매가
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마진
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.thumbnail_url && (
                          <img
                            src={product.thumbnail_url}
                            alt={product.title}
                            className="w-12 h-12 rounded object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {product.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(product.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {product.sale_price.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {product.margin_amount.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/seller/products/${product.id}/edit`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                페이지 {currentPage} / {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SellerProductsSection;
