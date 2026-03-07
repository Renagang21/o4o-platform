/**
 * Neture Admin ProductMaster List Page
 *
 * WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1
 *
 * ProductMaster SSOT 목록 — 실제 entity 필드 기반
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

interface ProductMasterItem {
  id: string;
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  marketingName: string;
  brandName: string | null;
  manufacturerName: string;
  isMfdsVerified: boolean;
  categoryId: string | null;
  brandId: string | null;
  specification: string | null;
  originCountry: string | null;
  tags: string[];
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  createdAt: string;
}

async function fetchMasters(): Promise<{ data: ProductMasterItem[] }> {
  const response = await authClient.api.get('/api/v1/neture/admin/masters');
  return response.data;
}

const ProductListPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['neture', 'admin', 'masters'],
    queryFn: fetchMasters,
  });

  if (error) {
    return (
      <div className="p-6 text-red-600">
        상품 목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  const masters = data?.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ProductMaster 관리</h1>
          <p className="text-gray-500 mt-1">플랫폼 상품 SSOT — 바코드 기준 1:1 매핑</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/neture/categories"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            카테고리 관리
          </Link>
          <Link
            to="/neture/brands"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            브랜드 관리
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : masters.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">바코드</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">마케팅명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">카테고리</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">브랜드</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">규제 유형</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">제조사</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">MFDS</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {masters.map((master) => (
                <tr key={master.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">
                    <Link to={`/neture/products/${master.id}`} className="text-blue-600 hover:underline">
                      {master.barcode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {master.marketingName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {master.category?.name || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {master.brand?.name || master.brandName || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {master.regulatoryType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {master.manufacturerName}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded ${
                      master.isMfdsVerified
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {master.isMfdsVerified ? '검증됨' : '미검증'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(master.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록된 ProductMaster가 없습니다.
          </div>
        )}
      </div>

      {/* Count */}
      {masters.length > 0 && (
        <div className="mt-3 text-sm text-gray-500">
          총 {masters.length}건
        </div>
      )}
    </div>
  );
};

export default ProductListPage;
