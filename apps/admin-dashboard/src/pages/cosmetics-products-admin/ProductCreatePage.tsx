/**
 * Cosmetics Product Create Page
 *
 * 화장품 제품 등록 페이지
 * Phase 11: Web Admin Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 OpenAPI 스펙을 수정하고 재생성하세요.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  subtitle?: string;
  brand_id: string;
  line_id?: string;
  description?: string;
  short_description?: string;
  base_price: number;
  sale_price?: number;
  manufacturer?: string;
  origin_country?: string;
  legal_category?: string;
  certification_ids?: string[];
  usage_info?: string;
  caution_info?: string;
  sku?: string;
  barcodes?: string[];
}

interface FormErrors {
  [key: string]: string;
}

const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const api = authClient.api;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    subtitle: '',
    brand_id: '',
    line_id: '',
    description: '',
    short_description: '',
    base_price: undefined,
    sale_price: undefined,
    manufacturer: '',
    origin_country: '',
    legal_category: '',
    certification_ids: [],
    usage_info: '',
    caution_info: '',
    sku: '',
    barcodes: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name) {
      newErrors.name = '상품명은(는) 필수입니다.';
    }
    if (!formData.brand_id) {
      newErrors.brand_id = '브랜드은(는) 필수입니다.';
    }
    if (!formData.base_price) {
      newErrors.base_price = '기본가은(는) 필수입니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);

    try {
      const response = await api.post('/api/v1/cosmetics/admin/products', formData);
      if (response.data) {
        navigate('/cosmetics-products');
      }
    } catch (err: any) {
      console.error('Failed to create:', err);
      if (err.response?.status === 403) {
        setSubmitError('권한이 없습니다.');
      } else if (err.response?.status === 400) {
        setSubmitError(err.response?.data?.error?.message || '입력값을 확인해주세요.');
      } else {
        setSubmitError(err.message || '등록에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, formData, validate, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title="화장품 제품 등록"
        description="새로운 화장품 제품 등록"
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

                {/* 서브타이틀 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    서브타이틀
                  </label>
                  <AGInput
                    type="text"
                    value={formData.subtitle || ''}
                    onChange={(e) => handleChange('subtitle', e.target.value)}
                    placeholder="서브타이틀을 입력하세요"
                    className="w-full"
                  />
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

                {/* 짧은 설명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    짧은 설명
                  </label>
                  <textarea
                    value={formData.short_description || ''}
                    onChange={(e) => handleChange('short_description', e.target.value)}
                    placeholder="목록 페이지에 표시될 짧은 설명을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>

                {/* 법적 정보 섹션 */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">법적 정보</h3>

                  <div className="space-y-4">
                    {/* 제조사 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        제조사
                      </label>
                      <AGInput
                        type="text"
                        value={formData.manufacturer || ''}
                        onChange={(e) => handleChange('manufacturer', e.target.value)}
                        placeholder="제조사명을 입력하세요"
                        className="w-full"
                      />
                    </div>

                    {/* 원산지 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        원산지
                      </label>
                      <AGInput
                        type="text"
                        value={formData.origin_country || ''}
                        onChange={(e) => handleChange('origin_country', e.target.value)}
                        placeholder="예: 대한민국"
                        className="w-full"
                      />
                    </div>

                    {/* 법적 분류 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        법적 분류
                      </label>
                      <AGInput
                        type="text"
                        value={formData.legal_category || ''}
                        onChange={(e) => handleChange('legal_category', e.target.value)}
                        placeholder="예: 기능성화장품"
                        className="w-full"
                      />
                    </div>

                    {/* 인증/허가 번호 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        인증/허가 번호
                      </label>
                      <textarea
                        value={formData.certification_ids?.join('\n') || ''}
                        onChange={(e) => handleChange('certification_ids', e.target.value.split('\n').filter(Boolean))}
                        placeholder="한 줄에 하나씩 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                      <p className="mt-1 text-xs text-gray-500">각 인증번호를 줄바꿈으로 구분하여 입력하세요</p>
                    </div>
                  </div>
                </div>

                {/* 상세 정보 섹션 */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">상세 정보</h3>

                  <div className="space-y-4">
                    {/* 사용 정보 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        사용 정보
                      </label>
                      <textarea
                        value={formData.usage_info || ''}
                        onChange={(e) => handleChange('usage_info', e.target.value)}
                        placeholder="사용 방법, 사용 시기 등을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                    </div>

                    {/* 주의사항 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        주의사항
                      </label>
                      <textarea
                        value={formData.caution_info || ''}
                        onChange={(e) => handleChange('caution_info', e.target.value)}
                        placeholder="사용 시 주의사항을 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* 식별자 섹션 */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">식별자</h3>

                  <div className="space-y-4">
                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SKU (재고 관리 코드)
                      </label>
                      <AGInput
                        type="text"
                        value={formData.sku || ''}
                        onChange={(e) => handleChange('sku', e.target.value)}
                        placeholder="예: COS-001"
                        className="w-full"
                      />
                      <p className="mt-1 text-xs text-gray-500">⚠️ SKU는 한 번 설정하면 변경할 수 없습니다 (Product DB Constitution v1)</p>
                    </div>

                    {/* 바코드 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        바코드
                      </label>
                      <textarea
                        value={formData.barcodes?.join('\n') || ''}
                        onChange={(e) => handleChange('barcodes', e.target.value.split('\n').filter(Boolean))}
                        placeholder="한 줄에 하나씩 입력하세요"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                      />
                      <p className="mt-1 text-xs text-gray-500">각 바코드를 줄바꿈으로 구분하여 입력하세요</p>
                    </div>
                  </div>
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
                  disabled={loading}
                  iconLeft={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {loading ? '등록 중...' : '등록'}
                </AGButton>
              </div>
            </AGCard>
          </AGSection>
        </form>
      </div>
    </div>
  );
};

export default ProductCreatePage;
