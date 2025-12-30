/**
 * GlucoseView View Profile Detail Page
 *
 * Phase C-3: GlucoseView Admin Integration
 * View profile detail with configuration display
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
  LayoutTemplate,
  ArrowLeft,
  AlertCircle,
  Star,
  CheckCircle,
  XCircle,
  FileEdit,
  Check,
  X,
} from 'lucide-react';

interface ViewProfile {
  id: string;
  name: string;
  code: string;
  description?: string;
  summary_level: 'simple' | 'standard' | 'detailed';
  chart_type: 'daily' | 'weekly' | 'trend' | 'agp';
  time_range_days: number;
  show_tir: boolean;
  show_average: boolean;
  show_variability: boolean;
  target_low: number;
  target_high: number;
  status: 'active' | 'inactive' | 'draft';
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ViewProfileDetailResponse {
  data: ViewProfile;
}

const statusLabels: Record<string, string> = {
  active: '활성',
  inactive: '비활성',
  draft: '초안',
};

const statusColors: Record<string, 'green' | 'gray' | 'yellow'> = {
  active: 'green',
  inactive: 'gray',
  draft: 'yellow',
};

const summaryLabels: Record<string, string> = {
  simple: '간단',
  standard: '표준',
  detailed: '상세',
};

const chartLabels: Record<string, string> = {
  daily: '일간 차트',
  weekly: '주간 차트',
  trend: '트렌드 분석',
  agp: 'AGP 리포트',
};

const ViewProfileDetailPage: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const api = authClient.api;
  const [profile, setProfile] = useState<ViewProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!profileId) {
      setError('프로필 ID가 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get<ViewProfileDetailResponse>(
        `/api/v1/glucoseview/admin/view-profiles/${profileId}`
      );
      if (response.data) {
        setProfile(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      if (err.response?.status === 404) {
        setError('표현 규칙을 찾을 수 없습니다.');
      } else {
        setError(err.message || '표현 규칙 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [api, profileId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleStatusChange = async (newStatus: string) => {
    if (!profile) return;

    setUpdating(true);
    try {
      await api.patch(`/api/v1/glucoseview/admin/view-profiles/${profile.id}/status`, {
        status: newStatus,
      });
      setProfile({ ...profile, status: newStatus as any });
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

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || '표현 규칙을 찾을 수 없습니다'}</p>
          <AGButton variant="outline" onClick={() => navigate('/glucoseview/view-profiles')}>
            목록으로 돌아가기
          </AGButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title={profile.name}
        description={profile.code}
        icon={<LayoutTemplate className="w-5 h-5" />}
        breadcrumb={
          <Link
            to="/glucoseview/view-profiles"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            표현 규칙 목록
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            {profile.is_default && (
              <AGTag color="yellow" size="md">
                <Star className="w-3 h-3 inline mr-1 fill-current" />기본
              </AGTag>
            )}
            <AGTag color={statusColors[profile.status]} size="md">
              {statusLabels[profile.status]}
            </AGTag>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Basic Info */}
        <AGSection title="기본 정보">
          <AGCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  규칙명
                </label>
                <p className="text-gray-900">{profile.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  코드
                </label>
                <p className="text-gray-900 font-mono">{profile.code}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  설명
                </label>
                <p className="text-gray-900">{profile.description || '-'}</p>
              </div>
            </div>
          </AGCard>
        </AGSection>

        {/* Display Configuration */}
        <AGSection title="표시 설정">
          <AGCard>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  요약 수준
                </label>
                <p className="text-gray-900">{summaryLabels[profile.summary_level]}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  차트 유형
                </label>
                <p className="text-gray-900">{chartLabels[profile.chart_type]}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  기간
                </label>
                <p className="text-gray-900">{profile.time_range_days}일</p>
              </div>
            </div>
          </AGCard>
        </AGSection>

        {/* Display Options */}
        <AGSection title="표시 옵션">
          <AGCard>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {profile.show_tir ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-gray-300" />
                )}
                <span className={profile.show_tir ? 'text-gray-900' : 'text-gray-400'}>
                  Time in Range (TIR) 표시
                </span>
              </div>
              <div className="flex items-center gap-2">
                {profile.show_average ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-gray-300" />
                )}
                <span className={profile.show_average ? 'text-gray-900' : 'text-gray-400'}>
                  평균 혈당 표시
                </span>
              </div>
              <div className="flex items-center gap-2">
                {profile.show_variability ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-gray-300" />
                )}
                <span className={profile.show_variability ? 'text-gray-900' : 'text-gray-400'}>
                  변동성 지표 표시
                </span>
              </div>
            </div>
          </AGCard>
        </AGSection>

        {/* Target Range */}
        <AGSection title="목표 혈당 범위">
          <AGCard>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-green-100"
                    style={{
                      left: `${(profile.target_low / 300) * 100}%`,
                      width: `${((profile.target_high - profile.target_low) / 300) * 100}%`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-700">
                    {profile.target_low} - {profile.target_high} mg/dL
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>0</span>
                  <span>100</span>
                  <span>200</span>
                  <span>300</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              녹색 영역이 목표 혈당 범위입니다. 이 범위 내에 있는 시간을 Time in Range(TIR)라고 합니다.
            </p>
          </AGCard>
        </AGSection>

        {/* Status Management */}
        <AGSection title="상태 관리">
          <AGCard>
            <p className="text-sm text-gray-500 mb-4">
              표현 규칙의 활성화 상태를 변경합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <AGButton
                variant={profile.status === 'active' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('active')}
                disabled={updating || profile.status === 'active'}
                iconLeft={<CheckCircle className="w-4 h-4" />}
              >
                활성
              </AGButton>
              <AGButton
                variant={profile.status === 'draft' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('draft')}
                disabled={updating || profile.status === 'draft'}
                iconLeft={<FileEdit className="w-4 h-4" />}
              >
                초안
              </AGButton>
              <AGButton
                variant={profile.status === 'inactive' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('inactive')}
                disabled={updating || profile.status === 'inactive'}
                iconLeft={<XCircle className="w-4 h-4" />}
              >
                비활성
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
                <span className="text-gray-900">{formatDate(profile.created_at)}</span>
              </div>
              <div>
                <span className="text-gray-500">수정일:</span>{' '}
                <span className="text-gray-900">{formatDate(profile.updated_at)}</span>
              </div>
              <div>
                <span className="text-gray-500">정렬 순서:</span>{' '}
                <span className="text-gray-900">{profile.sort_order}</span>
              </div>
              <div>
                <span className="text-gray-500">기본 프로필:</span>{' '}
                <span className="text-gray-900">{profile.is_default ? '예' : '아니오'}</span>
              </div>
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
};

export default ViewProfileDetailPage;
