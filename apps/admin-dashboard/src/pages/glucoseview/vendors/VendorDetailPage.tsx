/**
 * GlucoseView Vendor Detail Page
 *
 * Phase C-3: GlucoseView Admin Integration
 * CGM vendor detail view with status management
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
  Building2,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  supported_devices: string[];
  integration_type: string;
  status: 'active' | 'inactive' | 'planned';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface VendorDetailResponse {
  data: Vendor;
}

const statusLabels: Record<string, string> = {
  active: '지원 중',
  inactive: '지원 중단',
  planned: '예정',
};

const statusColors: Record<string, 'green' | 'gray' | 'blue'> = {
  active: 'green',
  inactive: 'gray',
  planned: 'blue',
};

const VendorDetailPage: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchVendor = useCallback(async () => {
    if (!vendorId) {
      setError('제조사 ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<VendorDetailResponse>(
        `/api/v1/glucoseview/admin/vendors/${vendorId}`
      );
      if (response.data) {
        setVendor(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch vendor:', err);
      if (err.response?.status === 404) {
        setError('제조사를 찾을 수 없습니다.');
      } else {
        setError(err.message || '제조사 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, vendorId]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  const handleStatusChange = async (newStatus: string) => {
    if (!vendor) return;

    setUpdating(true);
    try {
      await api.patch(`/api/v1/glucoseview/admin/vendors/${vendor.id}/status`, {
        status: newStatus,
      });
      setVendor({ ...vendor, status: newStatus as any });
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert('상태 변경에 실패했습니다.');
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
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || '제조사를 찾을 수 없습니다'}</p>
          <AGButton variant="outline" onClick={() => navigate('/glucoseview/vendors')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title={vendor.name}
        description={vendor.code}
        icon={<Building2 className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/glucoseview/vendors"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            제조사 목록
          </Link>
        }
        actions={
          <AGTag color={statusColors[vendor.status]} size="md">
            {statusLabels[vendor.status]}
          </AGTag>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Basic Info */}
        <AGSection title="기본 정보">
          <AGCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  제조사명
                </label>
                <p className="text-gray-900">{vendor.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  코드
                </label>
                <p className="text-gray-900 font-mono">{vendor.code}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  설명
                </label>
                <p className="text-gray-900">{vendor.description || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  연동 방식
                </label>
                <p className="text-gray-900">
                  {vendor.integration_type === 'api' && 'API 연동'}
                  {vendor.integration_type === 'manual' && '수동 입력'}
                  {vendor.integration_type === 'file_import' && '파일 가져오기'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  웹사이트
                </label>
                {vendor.website_url ? (
                  <a
                    href={vendor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {vendor.website_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-gray-400">-</p>
                )}
              </div>
            </div>
          </AGCard>
        </AGSection>

        {/* Supported Devices */}
        <AGSection title="지원 기기">
          <AGCard>
            {vendor.supported_devices.length === 0 ? (
              <p className="text-gray-400">등록된 지원 기기가 없습니다</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vendor.supported_devices.map((device, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg"
                  >
                    <Cpu className="w-4 h-4" />
                    {device}
                  </span>
                ))}
              </div>
            )}
          </AGCard>
        </AGSection>

        {/* Status Management */}
        <AGSection title="상태 관리">
          <AGCard>
            <p className="text-sm text-gray-500 mb-4">
              제조사의 지원 상태를 변경합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <AGButton
                variant={vendor.status === 'active' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('active')}
                disabled={updating || vendor.status === 'active'}
                iconLeft={<CheckCircle className="w-4 h-4" />}
              >
                지원 중
              </AGButton>
              <AGButton
                variant={vendor.status === 'planned' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('planned')}
                disabled={updating || vendor.status === 'planned'}
                iconLeft={<Clock className="w-4 h-4" />}
              >
                예정
              </AGButton>
              <AGButton
                variant={vendor.status === 'inactive' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('inactive')}
                disabled={updating || vendor.status === 'inactive'}
                iconLeft={<XCircle className="w-4 h-4" />}
              >
                지원 중단
              </AGButton>
            </div>
          </AGCard>
        </AGSection>

        {/* Metadata */}
        <AGSection title="메타 정보">
          <AGCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">생성일:</span>{' '}
                <span className="text-gray-900">{formatDate(vendor.created_at)}</span>
              </div>
              <div>
                <span className="text-gray-500">수정일:</span>{' '}
                <span className="text-gray-900">{formatDate(vendor.updated_at)}</span>
              </div>
              <div>
                <span className="text-gray-500">정렬 순서:</span>{' '}
                <span className="text-gray-900">{vendor.sort_order}</span>
              </div>
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default VendorDetailPage;
