/**
 * Neture Admin ProductMaster Detail Page
 *
 * WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1
 *
 * ProductMaster SSOT 상세/수정 페이지
 * - Immutable 필드: 읽기 전용 표시
 * - Mutable 필드: 수정 가능
 * - "새 상품 등록" 없음 (Master는 barcode pipeline으로만 생성)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

// Types aligned with actual ProductMaster entity
interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

interface BrandRef {
  id: string;
  name: string;
  slug: string;
}

interface ProductMasterDetail {
  id: string;
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  marketingName: string;
  brandName: string | null;
  manufacturerName: string;
  mfdsPermitNumber: string | null;
  mfdsProductId: string;
  isMfdsVerified: boolean;
  mfdsSyncedAt: string | null;
  categoryId: string | null;
  brandId: string | null;
  specification: string | null;
  originCountry: string | null;
  tags: string[];
  category: CategoryRef | null;
  brand: BrandRef | null;
  createdAt: string;
  updatedAt: string;
}

interface MasterFormData {
  marketingName: string;
  categoryId: string;
  brandId: string;
  specification: string;
  originCountry: string;
  tags: string;
}

// API functions
async function fetchMaster(id: string): Promise<{ data: ProductMasterDetail }> {
  const response = await authClient.api.get(`/api/v1/neture/admin/masters/${id}`);
  return response.data;
}

async function updateMaster(id: string, data: Record<string, unknown>): Promise<{ data: ProductMasterDetail }> {
  const response = await authClient.api.patch(`/api/v1/neture/admin/masters/${id}`, data);
  return response.data;
}

async function fetchCategories(): Promise<{ data: CategoryRef[] }> {
  const response = await authClient.api.get('/api/v1/neture/admin/categories');
  return response.data;
}

async function fetchBrands(): Promise<{ data: BrandRef[] }> {
  const response = await authClient.api.get('/api/v1/neture/admin/brands');
  return response.data;
}

// Flatten category tree for select dropdown
function flattenCategories(categories: (CategoryRef & { depth?: number; children?: CategoryRef[] })[], depth = 0): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth });
    if ('children' in cat && Array.isArray(cat.children)) {
      result.push(...flattenCategories(cat.children as (CategoryRef & { depth?: number; children?: CategoryRef[] })[], depth + 1));
    }
  }
  return result;
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<MasterFormData>({
    marketingName: '',
    categoryId: '',
    brandId: '',
    specification: '',
    originCountry: '',
    tags: '',
  });

  // Fetch master detail
  const { data: masterResponse, isLoading } = useQuery({
    queryKey: ['neture', 'admin', 'master', productId],
    queryFn: () => fetchMaster(productId!),
    enabled: !!productId,
  });

  // Fetch categories and brands for dropdowns
  const { data: categoriesResponse } = useQuery({
    queryKey: ['neture', 'admin', 'categories'],
    queryFn: fetchCategories,
  });

  const { data: brandsResponse } = useQuery({
    queryKey: ['neture', 'admin', 'brands'],
    queryFn: fetchBrands,
  });

  const flatCategories = categoriesResponse?.data ? flattenCategories(categoriesResponse.data) : [];
  const brands = brandsResponse?.data || [];

  useEffect(() => {
    if (masterResponse?.data) {
      const m = masterResponse.data;
      setFormData({
        marketingName: m.marketingName,
        categoryId: m.categoryId || '',
        brandId: m.brandId || '',
        specification: m.specification || '',
        originCountry: m.originCountry || '',
        tags: m.tags?.join(', ') || '',
      });
    }
  }, [masterResponse]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateMaster(productId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'masters'] });
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'master', productId] });
      navigate('/neture/products');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Record<string, unknown> = {
      marketingName: formData.marketingName,
      categoryId: formData.categoryId || null,
      brandId: formData.brandId || null,
      specification: formData.specification || null,
      originCountry: formData.originCountry || null,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    saveMutation.mutate(updates);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const master = masterResponse?.data;
  if (!master) {
    return (
      <div className="p-6">
        <p className="text-red-600">ProductMaster를 찾을 수 없습니다.</p>
        <Link to="/neture/products" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          ← 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/neture/products" className="text-blue-600 hover:underline text-sm">
          ← 상품 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">ProductMaster 상세</h1>
        <p className="text-sm text-gray-500 mt-1">바코드: {master.barcode}</p>
      </div>

      {/* Immutable Fields (Read-only) */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">고정 정보 (변경 불가)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField label="바코드" value={master.barcode} />
          <InfoField label="규제 유형" value={master.regulatoryType} />
          <InfoField label="식약처 공식명" value={master.regulatoryName} />
          <InfoField label="제조사명" value={master.manufacturerName} />
          <InfoField label="식약처 허가번호" value={master.mfdsPermitNumber || '-'} />
          <InfoField label="식약처 제품ID" value={master.mfdsProductId} />
          <InfoField
            label="MFDS 검증"
            value={master.isMfdsVerified ? '검증됨' : '미검증'}
            highlight={!master.isMfdsVerified}
          />
          <InfoField
            label="MFDS 동기화"
            value={master.mfdsSyncedAt ? new Date(master.mfdsSyncedAt).toLocaleDateString('ko-KR') : '-'}
          />
        </div>
      </div>

      {/* Editable Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">수정 가능 정보</h2>

        {/* Marketing Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            마케팅명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="marketingName"
            value={formData.marketingName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category + Brand */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">미지정</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {'  '.repeat(cat.depth)}{cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
            <select
              name="brandId"
              value={formData.brandId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">미지정</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Specification + Origin Country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제품 규격</label>
            <input
              type="text"
              name="specification"
              value={formData.specification}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="예: 500mg × 60정"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">원산지</label>
            <input
              type="text"
              name="originCountry"
              value={formData.originCountry}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="예: 대한민국"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="쉼표로 구분 (예: 비타민, 건강, 영양제)"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link
            to="/neture/products"
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>

        {saveMutation.isError && (
          <div className="text-red-600 text-sm">
            저장에 실패했습니다. 다시 시도해주세요.
          </div>
        )}
      </form>

      {/* Metadata */}
      <div className="mt-4 text-xs text-gray-400">
        생성: {new Date(master.createdAt).toLocaleString('ko-KR')} | 수정: {new Date(master.updatedAt).toLocaleString('ko-KR')}
      </div>
    </div>
  );
};

/** Read-only info field */
function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`text-sm mt-1 ${highlight ? 'text-amber-600 font-medium' : 'text-gray-900'}`}>{value}</dd>
    </div>
  );
}

export default ProductDetailPage;
