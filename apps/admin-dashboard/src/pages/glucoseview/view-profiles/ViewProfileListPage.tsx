/**
 * GlucoseView View Profile List Page
 *
 * Phase C-3: GlucoseView Admin Integration
 * Display configuration profiles for CGM data visualization
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
} from '@o4o/ui';
import {
  LayoutTemplate,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Star,
  BarChart3,
  TrendingUp,
  Activity,
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

interface ViewProfileListResponse {
  data: ViewProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
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
  daily: '일간',
  weekly: '주간',
  trend: '트렌드',
  agp: 'AGP',
};

const chartIcons: Record<string, React.ReactNode> = {
  daily: <BarChart3 className="w-4 h-4" />,
  weekly: <Activity className="w-4 h-4" />,
  trend: <TrendingUp className="w-4 h-4" />,
  agp: <LayoutTemplate className="w-4 h-4" />,
};

const ViewProfileListPage: React.FC = () => {
  const api = authClient.api;
  const [profiles, setProfiles] = useState<ViewProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/v1/glucoseview/admin/view-profiles?limit=100';
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      const response = await api.get<ViewProfileListResponse>(url);
      if (response.data) {
        setProfiles(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch view profiles:', err);
      setError(err.message || '표현 규칙 목록을 불러오는데 실패했습니다.');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
      <AGPageHeader
        title="View Profiles"
        description="CGM 데이터 표현 규칙 관리"
        icon={<LayoutTemplate className="w-5 h-5" />}
        actions={
          <AGButton
            variant="ghost"
            size="sm"
            onClick={fetchProfiles}
            iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            새로고침
          </AGButton>
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

        {/* Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            표현 규칙은 CGM 데이터를 약사에게 어떻게 보여줄지 결정합니다.
            이 설정은 원본 데이터에 영향을 주지 않습니다.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === ''
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {['active', 'draft', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{profiles.length}</span>개 표현 규칙
          </p>
        </div>

        {/* Profile Grid */}
        <AGSection>
          {profiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <LayoutTemplate className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 표현 규칙이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <Link
                  key={profile.id}
                  to={`/glucoseview/view-profiles/${profile.id}`}
                >
                  <AGCard hoverable padding="lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {chartIcons[profile.chart_type]}
                          <h3 className="font-semibold text-gray-900">
                            {profile.name}
                          </h3>
                          {profile.is_default && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <AGTag
                            color={statusColors[profile.status]}
                            size="sm"
                          >
                            {statusLabels[profile.status]}
                          </AGTag>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {profile.code}
                        </p>
                        {profile.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                            {profile.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded">
                            {summaryLabels[profile.summary_level]}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                            {chartLabels[profile.chart_type]}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {profile.time_range_days}일
                          </span>
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded">
                            {profile.target_low}-{profile.target_high} mg/dL
                          </span>
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

export default ViewProfileListPage;
