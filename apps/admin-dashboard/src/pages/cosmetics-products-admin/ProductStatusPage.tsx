/**
 * Cosmetics Product Status Page
 *
 * 화장품 제품 상태 변경 페이지
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
  AGSelect,
  AGTag,
} from '@o4o/ui';
import {
  Package,
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type ProductStatus = 'draft' | 'visible' | 'hidden' | 'sold_out';

const statusLabels: Record<ProductStatus, string> = {
  draft: '초안',
  visible: '공개',
  hidden: '숨김',
  sold_out: '품절',
};

const statusColors: Record<ProductStatus, 'gray' | 'green' | 'yellow' | 'red' | 'blue'> = {
  draft: 'gray',
  visible: 'green',
  hidden: 'yellow',
  sold_out: 'red',
};

interface ProductData {
  id: string;
  name: string;
  status: ProductStatus;
}

const ProductStatusPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;

  const [data, setData] = useState<ProductData | null>(null);
  const [newStatus, setNewStatus] = useState<ProductStatus | ''>('');
  const [reason, setReason] = useState('');
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
        setData(response.data.data);
        setNewStatus(response.data.data.status);
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !productId || !newStatus) return;
    if (newStatus === data.status) {
      setSubmitError('현재 상태와 동일합니다.');
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const response = await api.patch(`/api/v1/cosmetics/admin/products/${productId}/status`, {
        status: newStatus,
        reason: reason || undefined,
      });
      if (response.data) {
        navigate('/cosmetics-products');
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      if (err.response?.status === 403) {
        setSubmitError('권한이 없습니다.');
      } else if (err.response?.status === 400) {
        setSubmitError(err.response?.data?.error?.message || '상태 변경이 불가능합니다.');
      } else {
        setSubmitError(err.message || '상태 변경에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  }, [api, data, productId, newStatus, reason, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
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
        title="상태 변경"
        description={`${data.name} 상태 변경`}
        icon={<RefreshCw className="w-5 h-5" />}
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
                {/* Current Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    현재 상태
                  </label>
                  <AGTag color={statusColors[data.status]} size="lg">
                    {statusLabels[data.status]}
                  </AGTag>
                </div>

                {/* New Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    변경할 상태 <span className="text-red-500">*</span>
                  </label>
                  <AGSelect
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ProductStatus)}
                    className="w-full max-w-xs"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </AGSelect>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    변경 사유
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="상태 변경 사유를 입력하세요 (선택)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
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
                  disabled={saving || newStatus === data.status}
                  iconLeft={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                  {saving ? '변경 중...' : '상태 변경'}
                </AGButton>
              </div>
            </AGCard>
          </AGSection>
        </form>
      </div>
    </div>
  );
};

export default ProductStatusPage;
