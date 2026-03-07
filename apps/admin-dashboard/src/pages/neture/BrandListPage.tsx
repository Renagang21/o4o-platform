/**
 * Neture Admin Brand Management Page
 *
 * WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1
 *
 * 브랜드 관리 (CRUD)
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

interface Brand {
  id: string;
  name: string;
  slug: string;
  manufacturerName: string | null;
  countryOfOrigin: string | null;
  isActive: boolean;
  createdAt: string;
}

async function fetchBrands(): Promise<{ data: Brand[] }> {
  const response = await authClient.api.get('/api/v1/neture/admin/brands');
  return response.data;
}

async function createBrand(data: { name: string; slug: string; manufacturerName?: string; countryOfOrigin?: string }): Promise<{ data: Brand }> {
  const response = await authClient.api.post('/api/v1/neture/admin/brands', data);
  return response.data;
}

async function deleteBrand(id: string): Promise<void> {
  await authClient.api.delete(`/api/v1/neture/admin/brands/${id}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BrandListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formCountry, setFormCountry] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['neture', 'admin', 'brands'],
    queryFn: fetchBrands,
  });

  const createMutation = useMutation({
    mutationFn: (newBrand: { name: string; slug: string; manufacturerName?: string; countryOfOrigin?: string }) =>
      createBrand(newBrand),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'brands'] });
      setShowForm(false);
      setFormName('');
      setFormSlug('');
      setFormManufacturer('');
      setFormCountry('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'brands'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = formSlug || slugify(formName);
    createMutation.mutate({
      name: formName,
      slug,
      manufacturerName: formManufacturer || undefined,
      countryOfOrigin: formCountry || undefined,
    });
  };

  const handleDelete = (brand: Brand) => {
    if (window.confirm(`"${brand.name}" 브랜드를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(brand.id);
    }
  };

  const brands = data?.data || [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/neture/products" className="text-blue-600 hover:underline text-sm">
            ← 상품 목록으로
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">브랜드 관리</h1>
          <p className="text-gray-500 mt-1">상품 브랜드를 등록하고 관리합니다.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormName(''); setFormSlug(''); setFormManufacturer(''); setFormCountry(''); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 브랜드 추가
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">브랜드 추가</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">브랜드명 *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setFormSlug(slugify(e.target.value)); }}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="브랜드명"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Slug *</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="url-slug"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">제조사</label>
                <input
                  type="text"
                  value={formManufacturer}
                  onChange={(e) => setFormManufacturer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="제조사명 (선택)"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">원산지</label>
                <input
                  type="text"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="예: 대한민국 (선택)"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? '생성 중...' : '생성'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
            {createMutation.isError && (
              <p className="text-red-600 text-xs">브랜드 생성에 실패했습니다.</p>
            )}
          </form>
        </div>
      )}

      {/* Brands Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : brands.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">브랜드명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">제조사</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">원산지</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">등록일</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{brand.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{brand.slug}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{brand.manufacturerName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{brand.countryOfOrigin || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(brand.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(brand)}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록된 브랜드가 없습니다.
          </div>
        )}
      </div>

      {brands.length > 0 && (
        <div className="mt-3 text-sm text-gray-500">
          총 {brands.length}건
        </div>
      )}
    </div>
  );
};

export default BrandListPage;
