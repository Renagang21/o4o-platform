/**
 * Content Analytics - DB Read-Only Aggregate Metrics
 *
 * WO-O4O-CONTENT-ANALYTICS-DB-READONLY-V1
 *
 * ⚠️ READ-ONLY 집계 화면
 * - cms_media 테이블에서 실제 데이터를 집계합니다
 * - Content Core enum 기준으로 분포를 표시합니다
 * - 실시간 업데이트/필터/Export 기능이 없습니다
 *
 * Analytics는 "현황 인식 도구"다.
 * Source of Truth는 cms_media.
 * 집계는 DB에서, 판단은 하지 않는다.
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  ArrowLeft,
  Video,
  Image,
  FileText,
  Blocks,
  TrendingUp,
  Users,
  Globe,
  Lock,
  Database,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  ContentType,
  ContentStatus,
  ContentVisibility,
  ContentOwnerType,
} from '@o4o-apps/content-core';

import { contentAssetsApi, ContentAssetStats } from '@/api/content-assets.api';

/**
 * 타입별 아이콘 매핑
 */
const TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  [ContentType.VIDEO]: <Video className="w-5 h-5" />,
  [ContentType.IMAGE]: <Image className="w-5 h-5" />,
  [ContentType.DOCUMENT]: <FileText className="w-5 h-5" />,
  [ContentType.BLOCK]: <Blocks className="w-5 h-5" />,
};

/**
 * 타입별 색상
 */
const TYPE_COLORS: Record<ContentType, string> = {
  [ContentType.VIDEO]: 'bg-blue-500',
  [ContentType.IMAGE]: 'bg-green-500',
  [ContentType.DOCUMENT]: 'bg-amber-500',
  [ContentType.BLOCK]: 'bg-purple-500',
};

/**
 * 상태별 색상
 */
const STATUS_COLORS: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: 'bg-gray-400',
  [ContentStatus.PUBLISHED]: 'bg-green-500',
  [ContentStatus.ARCHIVED]: 'bg-amber-500',
};

/**
 * 상태별 라벨
 */
const STATUS_LABELS: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: 'Draft',
  [ContentStatus.PUBLISHED]: 'Published',
  [ContentStatus.ARCHIVED]: 'Archived',
};

/**
 * 소유자별 색상
 */
const OWNER_COLORS: Record<ContentOwnerType, string> = {
  [ContentOwnerType.PLATFORM]: 'bg-blue-500',
  [ContentOwnerType.SERVICE]: 'bg-purple-500',
  [ContentOwnerType.PARTNER]: 'bg-orange-500',
};

/**
 * 소유자별 라벨
 */
const OWNER_LABELS: Record<ContentOwnerType, string> = {
  [ContentOwnerType.PLATFORM]: 'Platform',
  [ContentOwnerType.SERVICE]: 'Service',
  [ContentOwnerType.PARTNER]: 'Partner',
};

// 메트릭 카드 컴포넌트
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = 'text-gray-600',
  loading = false,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1" />
          ) : (
            <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
          )}
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 bg-gray-100 rounded-lg text-gray-500">{icon}</div>
      </div>
    </div>
  );
}

// 수평 막대 차트 컴포넌트
function HorizontalBarChart({
  data,
  colors,
  labels,
  icons,
  loading = false,
}: {
  data: Record<string, number>;
  colors: Record<string, string>;
  labels?: Record<string, string>;
  icons?: Record<string, React.ReactNode>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
            <div className="h-2 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const maxValue = Math.max(...Object.values(data), 1); // Prevent division by zero

  if (total === 0) {
    return (
      <div className="text-center py-4 text-gray-400">
        <p className="text-sm">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {icons && icons[key] && (
                <span className="text-gray-500">{icons[key]}</span>
              )}
              <span className="text-sm text-gray-700">
                {labels ? labels[key] : key}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{value}</span>
              <span className="text-xs text-gray-400">
                ({total > 0 ? Math.round((value / total) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[key]} rounded-full transition-all`}
              style={{ width: `${(value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// 도넛 차트 컴포넌트 (CSS 기반 간단 구현)
function DonutChart({
  data,
  colors,
  labels,
  loading = false,
}: {
  data: Record<string, number>;
  colors: Record<string, string>;
  labels: Record<string, string>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-6 animate-pulse">
        <div className="w-32 h-32 rounded-full bg-gray-200" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-24 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const entries = Object.entries(data);

  if (total === 0) {
    return (
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-sm">No data</span>
        </div>
        <div className="space-y-2">
          {entries.map(([key]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colors[key]}`} />
              <span className="text-sm text-gray-600">{labels[key]}</span>
              <span className="text-sm font-medium text-gray-900">0</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // CSS conic-gradient를 위한 계산
  let accumulated = 0;
  const gradientParts = entries.map(([key, value]) => {
    const start = accumulated;
    const percentage = (value / total) * 100;
    accumulated += percentage;
    // Tailwind 색상을 실제 색상으로 매핑
    const colorMap: Record<string, string> = {
      'bg-gray-400': '#9ca3af',
      'bg-green-500': '#22c55e',
      'bg-amber-500': '#f59e0b',
      'bg-blue-500': '#3b82f6',
      'bg-purple-500': '#a855f7',
      'bg-orange-500': '#f97316',
    };
    const color = colorMap[colors[key]] || '#9ca3af';
    return `${color} ${start}% ${accumulated}%`;
  });

  return (
    <div className="flex items-center gap-6">
      {/* 도넛 차트 */}
      <div
        className="w-32 h-32 rounded-full relative"
        style={{
          background: `conic-gradient(${gradientParts.join(', ')})`,
        }}
      >
        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
          <span className="text-lg font-semibold text-gray-900">{total}</span>
        </div>
      </div>

      {/* 범례 */}
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[key]}`} />
            <span className="text-sm text-gray-600">{labels[key]}</span>
            <span className="text-sm font-medium text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContentAnalyticsPage() {
  // Data state
  const [stats, setStats] = useState<ContentAssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await contentAssetsApi.getStats();
      setStats(data);
      if (!data) {
        setError('통계 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Failed to fetch content stats:', err);
      setError('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Compute derived values
  const totalAssets = stats?.totalAssets || 0;
  const publishedCount = stats?.byStatus.published || 0;
  const publishedRatio = totalAssets > 0 ? Math.round((publishedCount / totalAssets) * 100) : 0;
  const platformAssets = stats?.byOwner.platform || 0;
  const restrictedAssets = stats?.byVisibility.restricted || 0;
  const publicAssets = stats?.byVisibility.public || 0;

  // Transform stats to Content Core enum format for charts
  const byTypeData = stats ? {
    [ContentType.VIDEO]: stats.byType.video,
    [ContentType.IMAGE]: stats.byType.image,
    [ContentType.DOCUMENT]: stats.byType.document,
    [ContentType.BLOCK]: stats.byType.block,
  } : {};

  const byStatusData = stats ? {
    [ContentStatus.DRAFT]: stats.byStatus.draft,
    [ContentStatus.PUBLISHED]: stats.byStatus.published,
    [ContentStatus.ARCHIVED]: stats.byStatus.archived,
  } : {};

  const byOwnerData = stats ? {
    [ContentOwnerType.PLATFORM]: stats.byOwner.platform,
    [ContentOwnerType.SERVICE]: stats.byOwner.service,
    [ContentOwnerType.PARTNER]: stats.byOwner.partner,
  } : {};

  return (
    <div className="p-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/content"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Content
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <BarChart2 className="w-8 h-8 text-gray-400" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Content / Analytics</h1>
              <p className="text-gray-500">콘텐츠 분포 현황 및 지표</p>
            </div>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Read-Only Notice - DB Connected */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium">DB 연결됨 - Read-Only 집계</p>
            <p className="text-green-700 text-sm mt-1">
              이 화면은 cms_media 테이블의 실제 데이터를 Content Core 기준으로 집계합니다.
              집계는 DB에서 수행되며, 데이터 수정 기능은 제공되지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchStats}
              className="ml-auto text-sm text-red-600 hover:text-red-700 underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Assets"
          value={totalAssets}
          subtitle="전체 콘텐츠 자산"
          icon={<Blocks className="w-5 h-5" />}
          loading={loading}
        />
        <MetricCard
          title="Published"
          value={`${publishedRatio}%`}
          subtitle={`${publishedCount}개 게시됨`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-green-600"
          loading={loading}
        />
        <MetricCard
          title="Platform Assets"
          value={platformAssets}
          subtitle="플랫폼 소유"
          icon={<Users className="w-5 h-5" />}
          color="text-blue-600"
          loading={loading}
        />
        <MetricCard
          title="Restricted"
          value={restrictedAssets}
          subtitle="접근 제한 콘텐츠"
          icon={<Lock className="w-5 h-5" />}
          color="text-amber-600"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Type Distribution</h3>
            <p className="text-xs text-gray-500">콘텐츠 유형별 분포</p>
          </div>
          <div className="p-4">
            <HorizontalBarChart
              data={byTypeData}
              colors={TYPE_COLORS}
              labels={{
                [ContentType.VIDEO]: 'Video',
                [ContentType.IMAGE]: 'Image',
                [ContentType.DOCUMENT]: 'Document',
                [ContentType.BLOCK]: 'Block',
              }}
              icons={TYPE_ICONS}
              loading={loading}
            />
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Database className="w-3 h-3" />
              cms_media.type 기반 집계
            </p>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Status Distribution</h3>
            <p className="text-xs text-gray-500">콘텐츠 상태별 분포</p>
          </div>
          <div className="p-4 flex justify-center">
            <DonutChart
              data={byStatusData}
              colors={STATUS_COLORS}
              labels={STATUS_LABELS}
              loading={loading}
            />
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Database className="w-3 h-3" />
              cms_media.isActive 기반 집계 (DRAFT=0)
            </p>
          </div>
        </div>

        {/* Ownership Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Ownership Distribution</h3>
            <p className="text-xs text-gray-500">콘텐츠 소유권별 분포</p>
          </div>
          <div className="p-4">
            <HorizontalBarChart
              data={byOwnerData}
              colors={OWNER_COLORS}
              labels={OWNER_LABELS}
              loading={loading}
            />
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Database className="w-3 h-3" />
              organizationId 기반 집계
            </p>
          </div>
        </div>

        {/* Visibility Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Visibility Distribution</h3>
            <p className="text-xs text-gray-500">콘텐츠 공개 범위별 분포</p>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-gray-100 rounded-lg animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-12 mx-auto mb-1" />
                    <div className="h-4 bg-gray-200 rounded w-16 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Public */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                  <Globe className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-green-700">
                    {publicAssets}
                  </p>
                  <p className="text-sm text-green-600">Public</p>
                  <p className="text-xs text-green-500 mt-1">
                    {totalAssets > 0 ? Math.round((publicAssets / totalAssets) * 100) : 0}%
                  </p>
                </div>

                {/* Restricted */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
                  <Lock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-amber-700">
                    {restrictedAssets}
                  </p>
                  <p className="text-sm text-amber-600">Restricted</p>
                  <p className="text-xs text-amber-500 mt-1">
                    {totalAssets > 0 ? Math.round((restrictedAssets / totalAssets) * 100) : 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Database className="w-3 h-3" />
              isActive 기반 매핑 (active=public)
            </p>
          </div>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">집계 데이터 소스</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">테이블:</span>
            <span className="ml-1">cms_media (READ-ONLY)</span>
          </div>
          <div>
            <span className="font-medium">쿼리 방식:</span>
            <span className="ml-1">SELECT COUNT + GROUP BY</span>
          </div>
          <div>
            <span className="font-medium">타입 매핑:</span>
            <span className="ml-1">cms_media.type → ContentType</span>
          </div>
          <div>
            <span className="font-medium">상태 매핑:</span>
            <span className="ml-1">cms_media.isActive → ContentStatus</span>
          </div>
        </div>
      </div>

      {/* Content Core Type Reference */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Content Core 지표 기반 enum</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">ContentType:</span>
            <span className="ml-1">{Object.values(ContentType).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentStatus:</span>
            <span className="ml-1">{Object.values(ContentStatus).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentVisibility:</span>
            <span className="ml-1">{Object.values(ContentVisibility).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentOwnerType:</span>
            <span className="ml-1">{Object.values(ContentOwnerType).join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Reference */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Work Order: WO-O4O-CONTENT-ANALYTICS-DB-READONLY-V1 |
          데이터 소스: cms_media (READ-ONLY 집계) |
          참조: docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
        </p>
      </div>
    </div>
  );
}
