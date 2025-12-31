/**
 * Neture Admin Product Detail Page
 *
 * Phase D-3: Admin Dashboard에 Neture 서비스 등록
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

// Types
interface ProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}

interface Product {
  id: string;
  partner_id: string | null;
  name: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  status: string;
  base_price: number;
  sale_price: number | null;
  currency: string;
  stock: number;
  sku: string | null;
  images: ProductImage[] | null;
  tags: string[] | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  name: string;
  subtitle: string;
  description: string;
  category: string;
  base_price: number;
  sale_price: number | null;
  stock: number;
  sku: string;
  tags: string;
  is_featured: boolean;
}

const CATEGORIES = [
  { value: 'healthcare', label: '건강관리' },
  { value: 'beauty', label: '뷰티' },
  { value: 'food', label: '푸드' },
  { value: 'lifestyle', label: '라이프스타일' },
  { value: 'other', label: '기타' },
];

async function fetchProduct(id: string): Promise<{ data: Product }> {
  const response = await authClient.api.get(`/api/v1/neture/admin/products/${id}`);
  return response.data;
}

async function createProduct(data: Partial<Product>): Promise<{ data: Product }> {
  const response = await authClient.api.post('/api/v1/neture/admin/products', data);
  return response.data;
}

async function updateProduct(id: string, data: Partial<Product>): Promise<{ data: Product }> {
  const response = await authClient.api.patch(`/api/v1/neture/admin/products/${id}`, data);
  return response.data;
}

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = productId === 'new';

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    subtitle: '',
    description: '',
    category: 'other',
    base_price: 0,
    sale_price: null,
    stock: 0,
    sku: '',
    tags: '',
    is_featured: false,
  });

  const { data: productResponse, isLoading } = useQuery({
    queryKey: ['neture', 'admin', 'product', productId],
    queryFn: () => fetchProduct(productId!),
    enabled: !isNew && !!productId,
  });

  useEffect(() => {
    if (productResponse?.data) {
      const product = productResponse.data;
      setFormData({
        name: product.name,
        subtitle: product.subtitle || '',
        description: product.description || '',
        category: product.category,
        base_price: product.base_price,
        sale_price: product.sale_price,
        stock: product.stock,
        sku: product.sku || '',
        tags: product.tags?.join(', ') || '',
        is_featured: product.is_featured,
      });
    }
  }, [productResponse]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Product>) => {
      if (isNew) {
        return createProduct(data);
      }
      return updateProduct(productId!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'products'] });
      navigate('/neture/products');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const productData: Partial<Product> = {
      name: formData.name,
      subtitle: formData.subtitle || null,
      description: formData.description || null,
      category: formData.category,
      base_price: formData.base_price,
      sale_price: formData.sale_price,
      stock: formData.stock,
      sku: formData.sku || null,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : null,
      is_featured: formData.is_featured,
    };

    saveMutation.mutate(productData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? (value === '' ? null : Number(value)) : value,
    }));
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isNew ? '새 상품 등록' : '상품 수정'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">기본 정보</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="상품명을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부제목</label>
            <input
              type="text"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="부제목을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상품 설명</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="상품에 대한 상세 설명을 입력하세요"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">가격 및 재고</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정가 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="base_price"
                value={formData.base_price}
                onChange={handleChange}
                required
                min={0}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">할인가 (원)</label>
              <input
                type="number"
                name="sale_price"
                value={formData.sale_price ?? ''}
                onChange={handleChange}
                min={0}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="할인가가 없으면 비워두세요"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">재고</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min={0}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="상품 고유 코드"
              />
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">추가 정보</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="쉼표로 구분하여 입력 (예: 비타민, 건강, 영양제)"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_featured"
              id="is_featured"
              checked={formData.is_featured}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_featured" className="text-sm text-gray-700">
              추천 상품으로 표시
            </label>
          </div>
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
            {saveMutation.isPending ? '저장 중...' : isNew ? '등록' : '저장'}
          </button>
        </div>

        {saveMutation.isError && (
          <div className="text-red-600 text-sm">
            저장에 실패했습니다. 다시 시도해주세요.
          </div>
        )}
      </form>
    </div>
  );
};

export default ProductDetailPage;
