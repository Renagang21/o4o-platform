/**
 * Glycopharm Pharmacy List Page
 *
 * 약국 목록 페이지 (Admin)
 * - 약국 카드 그리드
 * - 상태 필터
 * - 검색
 *
 * Phase B-3: Glycopharm Admin Integration
 * API Endpoint: /api/v1/glycopharm/admin/pharmacies
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
  AGSelect,
} from '@o4o/ui';
import {
  Building2,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Package,
  Phone,
  MapPin,
} from 'lucide-react';

/**
 * API Response Types (Phase B-1 Glycopharm API)
 */
type PharmacyStatus = 'active' | 'inactive' | 'suspended';

interface Pharmacy {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  owner_name?: string;
  business_number?: string;
  status: PharmacyStatus;
  sort_order: number;
  product_count?: number;
  created_at: string;
  updated_at: string;
}

interface PharmacyListResponse {
  data: Pharmacy[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusLabels: Record<PharmacyStatus, string> = {
  active: '운영중',
  inactive: '비활성',
  suspended: '정지',
};

const statusColors: Record<PharmacyStatus, 'green' | 'gray' | 'red'> = {
  active: 'green',
  inactive: 'gray',
  suspended: 'red',
};

const PharmacyListPage: React.FC = () => {
  const api = authClient.api;
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PharmacyStatus | 'all'>('all');

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await api.get<PharmacyListResponse>(
        `/api/v1/glycopharm/admin/pharmacies?${params.toString()}`
      );
      if (response.data) {
        setPharmacies(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch pharmacies:', err);
      setError(err.message || '약국 목록을 불러오는데 실패했습니다.');
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter]);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  if (loading && pharmacies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <AGPageHeader
        title="약국 관리"
        description="Glycopharm 약국 목록"
        icon={<Building2 className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchPharmacies}
              iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              새로고침
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <AGSection>
          <div className="flex flex-wrap gap-4">
            <AGSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PharmacyStatus | 'all')}
              className="w-40"
            >
              <option value="all">전체 상태</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </AGSelect>
          </div>
        </AGSection>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{pharmacies.length}</span>개 약국
          </p>
        </div>

        {/* Pharmacy Grid */}
        <AGSection>
          {pharmacies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 약국이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pharmacies.map((pharmacy) => (
                <Link
                  key={pharmacy.id}
                  to={`/glycopharm/pharmacies/${pharmacy.id}`}
                >
                  <AGCard hoverable padding="lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-blue-500" />
                          <h3 className="font-semibold text-gray-900">
                            {pharmacy.name}
                          </h3>
                          <AGTag
                            color={statusColors[pharmacy.status]}
                            size="sm"
                          >
                            {statusLabels[pharmacy.status]}
                          </AGTag>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          코드: {pharmacy.code}
                        </p>
                        {pharmacy.address && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">{pharmacy.address}</span>
                          </div>
                        )}
                        {pharmacy.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                            <Phone className="w-3 h-3" />
                            <span>{pharmacy.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Package className="w-4 h-4" />
                          <span>{pharmacy.product_count || 0}개 상품</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default PharmacyListPage;
