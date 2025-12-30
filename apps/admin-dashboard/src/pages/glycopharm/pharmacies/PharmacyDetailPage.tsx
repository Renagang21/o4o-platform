/**
 * Glycopharm Pharmacy Detail Page
 *
 * 약국 상세 페이지 (Admin)
 * - 약국 정보
 * - 상태 관리
 *
 * Phase B-3: Glycopharm Admin Integration
 * API Endpoint: /api/v1/glycopharm/admin/pharmacies/:id
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
  AGSelect,
} from '@o4o/ui';
import {
  Building2,
  ArrowLeft,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Package,
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

interface PharmacyDetailResponse {
  data: Pharmacy;
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

const PharmacyDetailPage: React.FC = () => {
  const { pharmacyId } = useParams<{ pharmacyId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchPharmacy = useCallback(async () => {
    if (!pharmacyId) {
      setError('약국 ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<PharmacyDetailResponse>(
        `/api/v1/glycopharm/admin/pharmacies/${pharmacyId}`
      );
      if (response.data) {
        setPharmacy(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch pharmacy:', err);
      if (err.response?.status === 404) {
        setError('약국을 찾을 수 없습니다.');
      } else {
        setError(err.message || '약국 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, pharmacyId]);

  useEffect(() => {
    fetchPharmacy();
  }, [fetchPharmacy]);

  const handleStatusChange = async (newStatus: PharmacyStatus) => {
    if (!pharmacyId || !pharmacy) return;

    setUpdating(true);
    try {
      const response = await api.patch<PharmacyDetailResponse>(
        `/api/v1/glycopharm/admin/pharmacies/${pharmacyId}/status`,
        { status: newStatus }
      );
      if (response.data) {
        setPharmacy(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to update pharmacy status:', err);
      alert('상태 변경에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setUpdating(false);
    }
  };

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

  if (error || !pharmacy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || '약국을 찾을 수 없습니다'}</p>
          <AGButton variant="outline" onClick={() => navigate('/glycopharm/pharmacies')}>
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
        title={pharmacy.name}
        description={`코드: ${pharmacy.code}`}
        icon={<Building2 className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/glycopharm/pharmacies"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            약국 목록
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <AGTag color={statusColors[pharmacy.status]} size="md">
              {statusLabels[pharmacy.status]}
            </AGTag>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Pharmacy Info */}
        <AGSection>
          <AGCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">약국명</label>
                  <p className="text-lg font-semibold text-gray-900">{pharmacy.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">약국 코드</label>
                  <p className="text-gray-900">{pharmacy.code}</p>
                </div>
                {pharmacy.owner_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">대표 약사</label>
                      <p className="text-gray-900">{pharmacy.owner_name}</p>
                    </div>
                  </div>
                )}
                {pharmacy.business_number && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">사업자번호</label>
                      <p className="text-gray-900">{pharmacy.business_number}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {pharmacy.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">주소</label>
                      <p className="text-gray-900">{pharmacy.address}</p>
                    </div>
                  </div>
                )}
                {pharmacy.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">전화번호</label>
                      <p className="text-gray-900">{pharmacy.phone}</p>
                    </div>
                  </div>
                )}
                {pharmacy.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">이메일</label>
                      <p className="text-gray-900">{pharmacy.email}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">등록 상품</label>
                    <p className="text-gray-900">{pharmacy.product_count || 0}개</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Management */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-500">상태 변경</label>
                  <p className="text-xs text-gray-400">약국 운영 상태를 변경합니다</p>
                </div>
                <AGSelect
                  value={pharmacy.status}
                  onChange={(e) => handleStatusChange(e.target.value as PharmacyStatus)}
                  disabled={updating}
                  className="w-40"
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </AGSelect>
              </div>
            </div>

            {/* Timestamps */}
            <div className="mt-6 pt-6 border-t text-sm text-gray-500">
              <div className="flex gap-6">
                <span>등록: {formatDate(pharmacy.created_at)}</span>
                <span>수정: {formatDate(pharmacy.updated_at)}</span>
              </div>
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default PharmacyDetailPage;
