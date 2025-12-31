/**
 * Neture Admin Product List Page
 *
 * Phase D-3: Admin Dashboard에 Neture 서비스 등록
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

// Types
interface ProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
}

interface Product {
  id: string;
  partner_id: string | null;
  name: string;
  subtitle: string | null;
  category: string;
  status: string;
  base_price: number;
  sale_price: number | null;
  stock: number;
  images: ProductImage[] | null;
  tags: string[] | null;
  is_featured: boolean;
  view_count: number;
  created_at: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListProductsResponse {
  data: Product[];
  meta: PaginationMeta;
}

const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'healthcare', label: '건강관리' },
  { value: 'beauty', label: '뷰티' },
  { value: 'food', label: '푸드' },
  { value: 'lifestyle', label: '라이프스타일' },
  { value: 'other', label: '기타' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'draft', label: '임시저장' },
  { value: 'visible', label: '판매중' },
  { value: 'hidden', label: '숨김' },
  { value: 'sold_out', label: '품절' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  visible: 'bg-green-100 text-green-700',
  hidden: 'bg-yellow-100 text-yellow-700',
  sold_out: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  visible: '판매중',
  hidden: '숨김',
  sold_out: '품절',
};

async function fetchProducts(params: {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
}): Promise<ListProductsResponse> {
  const response = await authClient.api.get('/api/v1/neture/admin/products', { params });
  return response.data;
}

async function deleteProduct(id: string): Promise<void> {
  await authClient.api.delete(`/api/v1/neture/admin/products/${id}`);
}

async function updateProductStatus(id: string, status: string): Promise<void> {
  await authClient.api.patch(`/api/v1/neture/admin/products/${id}/status`, { status });
}

const ProductListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['neture', 'admin', 'products', { page, category, status }],
    queryFn: () => fetchProducts({ page, limit: 20, category: category || undefined, status: status || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'products'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateProductStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'products'] });
    },
  });

  const handleDelete = (product: Product) => {
    if (window.confirm(`"${product.name}" 상품을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const handleStatusChange = (product: Product, newStatus: string) => {
    if (newStatus !== product.status) {
      statusMutation.mutate({ id: product.id, status: newStatus });
    }
  };

  if (error) {
    return (
      <div className="p-6 text-red-600">
        상품 목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neture 상품 관리</h1>
          <p className="text-gray-500 mt-1">상품을 등록하고 관리합니다.</p>
        </div>
        <Link
          to="/neture/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 상품 등록
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">이미지</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상품명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">카테고리</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">가격</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">재고</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">조회수</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((product) => {
                  const primaryImage = product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url;
                  const displayPrice = product.sale_price || product.base_price;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                          {primaryImage ? (
                            <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/neture/products/${product.id}`} className="text-blue-600 hover:underline font-medium">
                          {product.name}
                        </Link>
                        {product.is_featured && (
                          <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">추천</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {CATEGORIES.find((c) => c.value === product.category)?.label || product.category}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {product.sale_price && product.sale_price < product.base_price ? (
                          <div>
                            <span className="text-gray-400 line-through text-xs">{product.base_price.toLocaleString()}</span>
                            <br />
                            <span className="font-medium text-red-600">{displayPrice.toLocaleString()}원</span>
                          </div>
                        ) : (
                          <span className="font-medium">{displayPrice.toLocaleString()}원</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={product.stock === 0 ? 'text-red-600 font-medium' : ''}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={product.status}
                          onChange={(e) => handleStatusChange(product, e.target.value)}
                          className={`px-2 py-1 text-xs rounded border-0 ${STATUS_COLORS[product.status] || 'bg-gray-100'}`}
                        >
                          {STATUS_OPTIONS.filter((s) => s.value).map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {product.view_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            to={`/neture/products/${product.id}`}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            편집
                          </Link>
                          <button
                            onClick={() => handleDelete(product)}
                            disabled={deleteMutation.isPending}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">
                  총 {data.meta.total}개 중 {(page - 1) * data.meta.limit + 1}-{Math.min(page * data.meta.limit, data.meta.total)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                  >
                    이전
                  </button>
                  <span className="px-3 py-1">{page} / {data.meta.totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                    disabled={page === data.meta.totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록된 상품이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;
