/**
 * Supplier Products Section
 * Can be used in dashboard (summary) or full-page mode
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Plus, Search, Filter, Edit, Trash2, ChevronLeft, ChevronRight, UserCheck, UserX, Users } from 'lucide-react';
import { EmptyState } from '../../common/EmptyState';
import { supplierProductAPI } from '../../../services/supplierProductApi';
import {
  SupplierProductListItem,
  SupplierProductFilters,
  SupplierProductSort,
  SupplierProductStatus,
} from '../../../types/supplier-product';

export type SectionMode = 'dashboard' | 'full-page';

export interface SupplierProductsSectionProps {
  mode?: SectionMode;
}

export const SupplierProductsSection: React.FC<SupplierProductsSectionProps> = ({
  mode = 'dashboard'
}) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<SupplierProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<SupplierProductFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sort, setSort] = useState<SupplierProductSort>({
    field: 'updatedAt',
    order: 'desc',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = mode === 'dashboard' ? 5 : 10;

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await supplierProductAPI.getProducts(
        filters,
        sort,
        { page: currentPage, limit: pageSize }
      );
      setProducts(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err) {
      setError('제품 목록을 불러오는데 실패했습니다.');
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products on mount and when filters/sort/page change
  useEffect(() => {
    fetchProducts();
  }, [filters, sort, currentPage, mode]);

  // Apply search filter
  const handleSearch = () => {
    setFilters({ ...filters, search: searchQuery });
    setCurrentPage(1);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 제품을 삭제하시겠습니까?')) {
      return;
    }
    try {
      await supplierProductAPI.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert('제품 삭제에 실패했습니다.');
    }
  };

  // Handle toggle application status (Phase 3-6: 모집 중단/재개)
  const handleToggleApplicationStatus = async (product: SupplierProductListItem) => {
    const currentStatus = product.is_open_for_applications ?? true;
    const newStatus = !currentStatus;

    const confirmMessage = newStatus
      ? '이 상품의 판매자 모집을 재개하시겠습니까?'
      : '이 상품의 판매자 모집을 중단하시겠습니까? (기존 승인된 판매자는 영향받지 않습니다)';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await supplierProductAPI.toggleApplicationStatus(product.id, newStatus);
      alert(newStatus ? '판매자 모집이 재개되었습니다.' : '판매자 모집이 중단되었습니다.');
      fetchProducts();
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
      console.error('Failed to toggle application status:', err);
    }
  };

  // Status badge color
  const getStatusColor = (status: SupplierProductStatus) => {
    switch (status) {
      case SupplierProductStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case SupplierProductStatus.INACTIVE:
        return 'bg-gray-100 text-gray-800';
      case SupplierProductStatus.OUT_OF_STOCK:
        return 'bg-red-100 text-red-800';
      case SupplierProductStatus.DISCONTINUED:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Status label
  const getStatusLabel = (status: SupplierProductStatus) => {
    switch (status) {
      case SupplierProductStatus.ACTIVE:
        return '판매중';
      case SupplierProductStatus.INACTIVE:
        return '비활성';
      case SupplierProductStatus.OUT_OF_STOCK:
        return '품절';
      case SupplierProductStatus.DISCONTINUED:
        return '단종';
      default:
        return status;
    }
  };

  if (mode === 'dashboard') {
    // Summary mode for dashboard overview
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">제품 관리</h2>
          <Link
            to="/dashboard/supplier/products"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기 →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12 text-gray-400" />}
            title="등록된 제품이 없습니다"
            description="제품을 등록하여 판매를 시작하세요."
          />
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                        product.status
                      )}`}
                    >
                      {getStatusLabel(product.status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {product.sku} · {product.category}
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {product.price.toLocaleString()}원
                    </p>
                    <p className="text-xs text-gray-500">재고 {product.stock}</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">제품 목록</h2>
          <p className="text-sm text-gray-600 mt-1">
            공급 중인 제품을 관리합니다. (총 {total}개)
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/supplier/products/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 제품 등록
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="제품명, SKU로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            필터
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                카테고리
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => {
                  setFilters({ ...filters, category: e.target.value || undefined });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="식품">식품</option>
                <option value="채소">채소</option>
                <option value="과일">과일</option>
                <option value="축산">축산</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    status: e.target.value
                      ? (e.target.value as SupplierProductStatus)
                      : undefined,
                  });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value={SupplierProductStatus.ACTIVE}>판매중</option>
                <option value={SupplierProductStatus.INACTIVE}>비활성</option>
                <option value={SupplierProductStatus.OUT_OF_STOCK}>품절</option>
                <option value={SupplierProductStatus.DISCONTINUED}>단종</option>
              </select>
            </div>

            {/* Stock Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                재고
              </label>
              <select
                value={
                  filters.inStock === undefined
                    ? ''
                    : filters.inStock
                    ? 'in-stock'
                    : 'out-of-stock'
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({
                    ...filters,
                    inStock:
                      value === '' ? undefined : value === 'in-stock',
                  });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="in-stock">재고 있음</option>
                <option value="out-of-stock">품절</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : products.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Package className="w-16 h-16 text-gray-400" />}
              title="제품이 없습니다"
              description={
                filters.search || filters.category || filters.status
                  ? '검색 조건에 맞는 제품이 없습니다. 필터를 변경해보세요.'
                  : '제품을 등록하여 드랍쉬핑 네트워크에서 판매를 시작하세요.'
              }
              action={
                !filters.search &&
                !filters.category &&
                !filters.status && (
                  <button
                    onClick={() => navigate('/dashboard/supplier/products/new')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    첫 제품 등록하기
                  </button>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      제품명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      카테고리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가격
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      재고
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      판매자 모집
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{product.sku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {product.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.price.toLocaleString()}원
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.stock}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            product.status
                          )}`}
                        >
                          {getStatusLabel(product.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Users className="w-3 h-3" />
                            <span>{product.approved_seller_count || 0}명</span>
                            {product.max_approved_sellers != null && (
                              <span className="text-gray-400">
                                / {product.max_approved_sellers}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleApplicationStatus(product)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                              product.is_open_for_applications !== false
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={
                              product.is_open_for_applications !== false
                                ? '모집 중 (클릭하여 중단)'
                                : '모집 중단 (클릭하여 재개)'
                            }
                          >
                            {product.is_open_for_applications !== false ? (
                              <>
                                <UserCheck className="w-3 h-3" />
                                모집 중
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3" />
                                모집 중단
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(
                                `/dashboard/supplier/products/${product.id}/edit`
                              )
                            }
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
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    페이지 {currentPage} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      이전
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierProductsSection;
