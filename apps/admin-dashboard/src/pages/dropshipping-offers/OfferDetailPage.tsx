/**
 * Dropshipping Offer Detail Page
 *
 * 드롭쉬핑 오퍼 상세 페이지
 *
 * Phase 10: Web Extension Generator 자동 생성
 *
 * ⚠️ 자동 생성 코드 - 직접 수정 금지
 * 변경이 필요하면 Generator 입력 정의를 수정하고 재생성하세요.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
} from '@o4o/ui';
import {
  ShoppingBag,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import type { OfferDetail, OfferDetailResponse } from './types';

/**
 * Status Definitions
 */
type OfferStatus = 'draft' | 'active' | 'inactive' | 'archived';

const statusLabels: Record<OfferStatus, string> = {
  draft: '초안',
  active: '활성',
  inactive: '비활성',
  archived: '보관됨',
};

const statusColors: Record<OfferStatus, 'gray' | 'green' | 'yellow' | 'red' | 'blue'> = {
  draft: 'gray',
  active: 'green',
  inactive: 'yellow',
  archived: 'red',
};

const OfferDetailPage: React.FC = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [item, setItem] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!offerId) {
      setError('ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<OfferDetailResponse>(`/api/v1/dropshipping/offers/${offerId}`);
      if (response.data) {
        setItem(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch item:', err);
      if (err.response?.status === 404) {
        setError('데이터를 찾을 수 없습니다.');
      } else {
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, offerId]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
            </>
          ) : (
            <>
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">데이터를 찾을 수 없습니다</p>
            </>
          )}
          <AGButton variant="outline" onClick={() => navigate('/dropshipping-offers')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title={item.name}
        description="드롭쉬핑 오퍼 상세"
        icon={<ShoppingBag className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/dropshipping-offers"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Link>
        }
        actions={
          <AGTag color={statusColors[item.status as OfferStatus]} size="md">
            {statusLabels[item.status as OfferStatus]}
          </AGTag>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Detail Content */}
        <AGSection>
          <AGCard>
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
                {item.description && (
                  <p className="text-gray-600 mt-2">{item.description}</p>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm pt-6 border-t">
                <div>
                  <span className="text-gray-500">생성일</span>
                  <p className="font-medium text-gray-900">{formatDate(item.createdAt)}</p>
                </div>
                <div>
                  <span className="text-gray-500">수정일</span>
                  <p className="font-medium text-gray-900">{formatDate(item.updatedAt)}</p>
                </div>
              </div>
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default OfferDetailPage;
