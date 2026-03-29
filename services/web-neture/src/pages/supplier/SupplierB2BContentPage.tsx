/**
 * SupplierB2BContentPage
 *
 * WO-NETURE-B2B-CONTENT-MANAGEMENT-V1
 *
 * B2B 콘텐츠 관리 페이지.
 * - 내 상품 리스트 (paginated)
 * - B2B 상태 표시 (설정됨 / B2C 사용 중)
 * - 행 클릭 → B2BContentDrawer
 */

import { useState, useEffect, useCallback } from 'react';
import { supplierApi, type SupplierProduct } from '../../lib/api/supplier';
import B2BContentDrawer from '../../components/supplier/B2BContentDrawer';

const PAGE_SIZE = 20;

export default function SupplierB2BContentPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Drawer state
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supplierApi.getProductsPaginated({
        page,
        limit: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setProducts(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotal(result.pagination?.total || 0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleOpenDrawer = (product: SupplierProduct) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const handleDrawerSaved = () => {
    fetchProducts();
  };

  const b2bCount = products.filter(
    (p) => p.businessShortDescription || p.businessDetailDescription,
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">B2B 콘텐츠 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          도매/파트너용 상품 설명을 별도로 관리합니다. B2B 설명이 없으면 B2C 설명이 자동으로 사용됩니다.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">전체 상품</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">B2B 설정됨</p>
          <p className="text-2xl font-bold text-green-600">{b2bCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">B2C 사용 중</p>
          <p className="text-2xl font-bold text-gray-400">{products.length - b2bCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="상품명 검색..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          검색
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">상품명</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">B2C 짧은설명</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">B2B 상태</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-24">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">로딩 중...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">상품이 없습니다.</td>
              </tr>
            ) : (
              products.map((p) => {
                const hasB2B = !!(p.businessShortDescription || p.businessDetailDescription);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleOpenDrawer(p)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[280px]">{p.name || p.masterName}</p>
                      <p className="text-xs text-gray-400">{p.barcode || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 truncate max-w-[200px]">
                        {p.consumerShortDescription
                          ? p.consumerShortDescription.replace(/<[^>]*>/g, '').slice(0, 60)
                          : <span className="text-gray-300 italic">없음</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasB2B ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                          B2B 설정됨
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded">
                          B2C 사용 중
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenDrawer(p); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        편집
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            다음
          </button>
        </div>
      )}

      {/* Drawer */}
      <B2BContentDrawer
        product={selectedProduct}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleDrawerSaved}
      />
    </div>
  );
}
