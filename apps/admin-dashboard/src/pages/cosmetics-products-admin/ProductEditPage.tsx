/**
 * Cosmetics Product Edit Page
 *
 * 화장품 제품 수정 페이지
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGSelect,
  AGTag,
} from '@o4o/ui';
import {
  Package,
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface FormData {
  name: string;
  brand_id: string;
  line_id?: string;
  description?: string;
  base_price: number;
  sale_price?: number;
}

interface FormErrors {
  [key: string]: string;
}

const ProductEditPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;

  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!productId) {
      setFetchError('ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const response = await api.get(`/api/v1/cosmetics/products/${productId}`);
      if (response.data?.data) {
        setFormData(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch:', err);
      if (err.response?.status === 404) {
        setFetchError('데이터를 찾을 수 없습니다.');
      } else {
        setFetchError(err.message || '데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = useCallback((name: string, value: any) => {
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !productId) return;

    setSaving(true);
    setSubmitError(null);

    try {
      const response = await api.put(`/api/v1/cosmetics/admin/products/${productId}`, formData);
      if (response.data) {
        navigate('/cosmetics-products');
      }
    } catch (err: any) {
      console.error('Failed to update:', err);
      if (err.response?.status === 403) {
        setSubmitError('권한이 없습니다.');
      } else if (err.response?.status === 400) {
        setSubmitError(err.response?.data?.error?.message || '입력값을 확인해주세요.');
      } else {
        setSubmitError(err.message || '수정에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  }, [api, formData, productId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{fetchError || '데이터를 찾을 수 없습니다'}</p>
          <AGButton variant="outline" onClick={() => navigate('/cosmetics-products')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title="화장품 제품 수정"
        description="기존 화장품 제품 정보 수정"
        icon={<Package className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/cosmetics-products"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Link>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit}>
          <AGSection>
            <AGCard>
              {submitError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700">{submitError}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* 상품명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상품명 <span className="text-red-500">*</span>
                  </label>
                  <AGInput
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="상품명을 입력하세요"
                    className={`w-full ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* 브랜드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    브랜드 <span className="text-red-500">*</span>
                  </label>
                  <AGInput
                    type="text"
                    value={formData.brand_id || ''}
                    onChange={(e) => handleChange('brand_id', e.target.value)}
                    placeholder="브랜드 ID"
                    className={`w-full ${errors.brand_id ? 'border-red-500' : ''}`}
                  />
                  {errors.brand_id && <p className="mt-1 text-sm text-red-500">{errors.brand_id}</p>}
                </div>

                {/* 라인 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    라인 
                  </label>
                  <AGInput
                    type="text"
                    value={formData.line_id || ''}
                    onChange={(e) => handleChange('line_id', e.target.value)}
                    placeholder="라인 ID"
                    className={`w-full ${errors.line_id ? 'border-red-500' : ''}`}
                  />
                  {errors.line_id && <p className="mt-1 text-sm text-red-500">{errors.line_id}</p>}
                </div>

                {/* 상품 설명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상품 설명 
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="상품 설명을 입력하세요"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                    rows={4}
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                </div>

                {/* 기본가 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기본가 <span className="text-red-500">*</span>
                  </label>
                  <AGInput
                    type="number"
                    value={formData.base_price ?? ''}
                    onChange={(e) => handleChange('base_price', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                    className={`max-w-xs ${errors.base_price ? 'border-red-500' : ''}`}
                  />
                  {errors.base_price && <p className="mt-1 text-sm text-red-500">{errors.base_price}</p>}
                </div>

                {/* 할인가 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    할인가 
                  </label>
                  <AGInput
                    type="number"
                    value={formData.sale_price ?? ''}
                    onChange={(e) => handleChange('sale_price', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                    className={`max-w-xs ${errors.sale_price ? 'border-red-500' : ''}`}
                  />
                  {errors.sale_price && <p className="mt-1 text-sm text-red-500">{errors.sale_price}</p>}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex items-center justify-end gap-3">
                <AGButton
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/cosmetics-products')}
                >
                  취소
                </AGButton>
                <AGButton
                  type="submit"
                  disabled={saving}
                  iconLeft={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {saving ? '저장 중...' : '저장'}
                </AGButton>
              </div>
            </AGCard>
          </AGSection>
        </form>
      </div>
    </div>
  );
};

export default ProductEditPage;
