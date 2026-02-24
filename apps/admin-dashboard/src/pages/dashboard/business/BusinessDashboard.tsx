/**
 * Business Dashboard v1.2
 *
 * WO-O4O-BUSINESS-DASHBOARD-V1
 * WO-O4O-BUSINESS-DASHBOARD-USAGE-SNAPSHOT-V1
 * WO-O4O-CONTENT-COPY-MINIMAL-V1
 *
 * 사업자(Partner/Affiliate) 전용 대시보드
 * - Admin/Operator 대시보드와 완전 분리
 * - Content Core 소비 원칙 준수 (READ-ONLY)
 * - 공용 콘텐츠 복사 기능 (v1.2)
 *
 * 구성:
 * 1. Overview - 콘텐츠 현황, 최근 활동
 * 2. Usage Snapshot - 소유자/공개설정/상태별 분포 (시각화)
 * 3. 내 콘텐츠 - LMS 생성 콘텐츠, 복사한 콘텐츠
 * 4. 공용 콘텐츠 - 운영자/커뮤니티/공급사 콘텐츠 + 복사 기능
 *
 * @see docs/platform/content-core/CONTENT-CONSUMPTION-SCENARIOS.md
 */

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  TrendingUp,
  Video,
  Image,
  FileText,
  Blocks,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  PieChart,
  Building2,
  Globe,
  Lock,
} from 'lucide-react';

import {
  ContentType,
  ContentStatus,
  ContentOwnerType,
} from '@o4o-apps/content-core';

import { contentAssetsApi, ContentAssetStats, ContentAssetView } from '@/api/content-assets.api';

/**
 * Section Card Component
 */
const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, icon, children, action }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/**
 * Stat Card Component
 */
const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div className={`p-4 rounded-lg ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="opacity-60">{icon}</div>
    </div>
  </div>
);

/**
 * Distribution Bar Component - 시각적 분포 표시
 */
const DistributionBar: React.FC<{
  items: Array<{ label: string; value: number; color: string }>;
  total: number;
}> = ({ items, total }) => {
  if (total === 0) {
    return (
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full w-full bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
      {items.map((item, idx) => {
        const percentage = (item.value / total) * 100;
        if (percentage === 0) return null;
        return (
          <div
            key={idx}
            className={`h-full ${item.color}`}
            style={{ width: `${percentage}%` }}
            title={`${item.label}: ${item.value} (${percentage.toFixed(1)}%)`}
          />
        );
      })}
    </div>
  );
};

/**
 * Usage Snapshot Card - 분포 요약 카드
 */
const UsageSnapshotCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: Array<{ label: string; value: number; color: string; bgColor: string }>;
  total: number;
}> = ({ title, icon, items, total }) => (
  <div className="bg-white rounded-lg border border-gray-100 p-4">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-sm font-medium text-gray-700">{title}</span>
      <span className="ml-auto text-xs text-gray-400">{total}개</span>
    </div>

    {/* Distribution Bar */}
    <DistributionBar items={items} total={total} />

    {/* Legend */}
    <div className="mt-3 flex flex-wrap gap-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${item.bgColor}`} />
          <span className="text-xs text-gray-600">{item.label}</span>
          <span className="text-xs font-medium text-gray-800">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Content List Item Component
 */
const ContentListItem: React.FC<{
  asset: ContentAssetView;
  showCopyButton?: boolean;
  isCopying?: boolean;
  onCopy?: (asset: ContentAssetView) => void;
}> = ({ asset, showCopyButton, isCopying, onCopy }) => {
  const typeIcons: Record<ContentType, React.ReactNode> = {
    [ContentType.VIDEO]: <Video className="w-4 h-4" />,
    [ContentType.IMAGE]: <Image className="w-4 h-4" />,
    [ContentType.DOCUMENT]: <FileText className="w-4 h-4" />,
    [ContentType.BLOCK]: <Blocks className="w-4 h-4" />,
  };

  const statusColors: Record<ContentStatus, string> = {
    [ContentStatus.DRAFT]: 'bg-gray-100 text-gray-600',
    [ContentStatus.PENDING]: 'bg-blue-100 text-blue-700',
    [ContentStatus.PUBLISHED]: 'bg-green-100 text-green-700',
    [ContentStatus.ARCHIVED]: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
          {typeIcons[asset.type]}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{asset.title}</p>
          {asset.description && (
            <p className="text-xs text-gray-500 truncate max-w-xs">{asset.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[asset.status]}`}>
          {asset.status}
        </span>
        {showCopyButton && (
          <button
            onClick={() => onCopy?.(asset)}
            disabled={isCopying}
            className={`p-1.5 rounded transition-colors ${
              isCopying
                ? 'text-blue-400 bg-blue-50 cursor-not-allowed'
                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title={isCopying ? '복사 중...' : '내 콘텐츠로 복사'}
          >
            {isCopying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}
        <button
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
          title="상세 보기"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Copy Status for feedback UI
 */
type CopyStatus = {
  status: 'idle' | 'copying' | 'success' | 'error';
  message?: string;
  assetId?: string;
};

/**
 * Business Dashboard Main Component
 */
export default function BusinessDashboard() {
  // State
  const [stats, setStats] = useState<ContentAssetStats | null>(null);
  const [myContent, setMyContent] = useState<ContentAssetView[]>([]);
  const [publicContent, setPublicContent] = useState<ContentAssetView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>({ status: 'idle' });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch stats and content in parallel
      const [statsResult, allContent] = await Promise.all([
        contentAssetsApi.getStats(),
        contentAssetsApi.list({ limit: 50 }),
      ]);

      setStats(statsResult);

      // Separate my content (SERVICE/PARTNER) from public content (PLATFORM)
      const my = allContent.assets.filter(
        (a) => a.ownerType === ContentOwnerType.SERVICE || a.ownerType === ContentOwnerType.PARTNER
      );
      const pub = allContent.assets.filter(
        (a) => a.ownerType === ContentOwnerType.PLATFORM
      );

      setMyContent(my.slice(0, 5));
      setPublicContent(pub.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch business dashboard data:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle copy action
  const handleCopyToMyContent = useCallback(async (asset: ContentAssetView) => {
    // Prevent multiple copies
    if (copyStatus.status === 'copying') return;

    setCopyStatus({ status: 'copying', assetId: asset.id });

    try {
      const result = await contentAssetsApi.copy(asset.id);

      if (result) {
        setCopyStatus({
          status: 'success',
          message: `"${asset.title}" 이(가) 내 콘텐츠로 복사되었습니다.`,
          assetId: asset.id,
        });

        // Add to my content list (at the top)
        setMyContent((prev) => [result.asset, ...prev].slice(0, 5));

        // Clear success message after 3 seconds
        setTimeout(() => {
          setCopyStatus({ status: 'idle' });
        }, 3000);
      } else {
        setCopyStatus({
          status: 'error',
          message: '복사에 실패했습니다. 다시 시도해주세요.',
          assetId: asset.id,
        });
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.message ||
        '복사에 실패했습니다. 다시 시도해주세요.';

      setCopyStatus({
        status: 'error',
        message: errorMessage,
        assetId: asset.id,
      });

      // Clear error message after 5 seconds
      setTimeout(() => {
        setCopyStatus({ status: 'idle' });
      }, 5000);
    }
  }, [copyStatus.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">사업자 대시보드</h1>
            <p className="text-sm text-gray-500">Business Dashboard v1.0</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto text-sm text-red-600 hover:text-red-700 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Copy Feedback Toast */}
      {copyStatus.status !== 'idle' && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all ${
            copyStatus.status === 'copying'
              ? 'bg-blue-50 border border-blue-200'
              : copyStatus.status === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {copyStatus.status === 'copying' && (
            <>
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              <p className="text-blue-700">콘텐츠 복사 중...</p>
            </>
          )}
          {copyStatus.status === 'success' && (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700">{copyStatus.message}</p>
            </>
          )}
          {copyStatus.status === 'error' && (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{copyStatus.message}</p>
            </>
          )}
        </div>
      )}

      {/* Section 1: Overview */}
      <div className="mb-6">
        <SectionCard
          title="Overview"
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          action={
            <button
              onClick={fetchData}
              className="p-1.5 text-gray-400 hover:text-gray-600"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="전체 콘텐츠"
              value={stats?.totalAssets ?? 0}
              icon={<FolderOpen className="w-6 h-6" />}
              color="bg-blue-50"
            />
            <StatCard
              label="Published"
              value={stats?.byStatus.published ?? 0}
              icon={<CheckCircle className="w-6 h-6" />}
              color="bg-green-50"
            />
            <StatCard
              label="Draft"
              value={stats?.byStatus.draft ?? 0}
              icon={<Clock className="w-6 h-6" />}
              color="bg-gray-50"
            />
            <StatCard
              label="공개 콘텐츠"
              value={stats?.byVisibility.public ?? 0}
              icon={<Eye className="w-6 h-6" />}
              color="bg-purple-50"
            />
          </div>

          {/* Type Distribution */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">타입별 분포</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">Video: {stats?.byType.video ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Image: {stats?.byType.image ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-gray-600">Document: {stats?.byType.document ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Blocks className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600">Block: {stats?.byType.block ?? 0}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Section 2: Usage Snapshot - 현황 계기판 */}
      <div className="mb-6">
        <SectionCard
          title="Usage Snapshot"
          icon={<PieChart className="w-5 h-5 text-indigo-500" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Owner Distribution */}
            <UsageSnapshotCard
              title="소유자별"
              icon={<Building2 className="w-4 h-4 text-blue-500" />}
              total={stats?.totalAssets ?? 0}
              items={[
                {
                  label: 'Platform',
                  value: stats?.byOwner.platform ?? 0,
                  color: 'bg-blue-500',
                  bgColor: 'bg-blue-500',
                },
                {
                  label: 'Service',
                  value: stats?.byOwner.service ?? 0,
                  color: 'bg-green-500',
                  bgColor: 'bg-green-500',
                },
                {
                  label: 'Partner',
                  value: stats?.byOwner.partner ?? 0,
                  color: 'bg-purple-500',
                  bgColor: 'bg-purple-500',
                },
              ]}
            />

            {/* Visibility Distribution */}
            <UsageSnapshotCard
              title="공개 설정별"
              icon={<Globe className="w-4 h-4 text-green-500" />}
              total={stats?.totalAssets ?? 0}
              items={[
                {
                  label: 'Public',
                  value: stats?.byVisibility.public ?? 0,
                  color: 'bg-emerald-500',
                  bgColor: 'bg-emerald-500',
                },
                {
                  label: 'Restricted',
                  value: stats?.byVisibility.restricted ?? 0,
                  color: 'bg-amber-500',
                  bgColor: 'bg-amber-500',
                },
              ]}
            />

            {/* Status Distribution */}
            <UsageSnapshotCard
              title="상태별"
              icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
              total={stats?.totalAssets ?? 0}
              items={[
                {
                  label: 'Published',
                  value: stats?.byStatus.published ?? 0,
                  color: 'bg-green-500',
                  bgColor: 'bg-green-500',
                },
                {
                  label: 'Draft',
                  value: stats?.byStatus.draft ?? 0,
                  color: 'bg-gray-400',
                  bgColor: 'bg-gray-400',
                },
                {
                  label: 'Archived',
                  value: stats?.byStatus.archived ?? 0,
                  color: 'bg-amber-500',
                  bgColor: 'bg-amber-500',
                },
              ]}
            />
          </div>
        </SectionCard>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: My Content */}
        <SectionCard
          title="내 콘텐츠"
          icon={<FolderOpen className="w-5 h-5 text-green-500" />}
          action={
            <span className="text-xs text-gray-400">
              {myContent.length}개
            </span>
          }
        >
          {myContent.length > 0 ? (
            <div>
              {myContent.map((asset) => (
                <ContentListItem key={asset.id} asset={asset} />
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                <a
                  href="/content/assets"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  전체 보기 →
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>내 콘텐츠가 없습니다</p>
              <p className="text-xs mt-1">LMS에서 콘텐츠를 생성하거나 공용 콘텐츠를 복사하세요</p>
            </div>
          )}
        </SectionCard>

        {/* Section 3: Public Content */}
        <SectionCard
          title="공용 콘텐츠"
          icon={<Users className="w-5 h-5 text-purple-500" />}
          action={
            <span className="text-xs text-gray-400">
              {publicContent.length}개
            </span>
          }
        >
          {publicContent.length > 0 ? (
            <div>
              {publicContent.map((asset) => (
                <ContentListItem
                  key={asset.id}
                  asset={asset}
                  showCopyButton
                  isCopying={copyStatus.status === 'copying' && copyStatus.assetId === asset.id}
                  onCopy={handleCopyToMyContent}
                />
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                <a
                  href="/content/assets"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  전체 보기 →
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>공용 콘텐츠가 없습니다</p>
              <p className="text-xs mt-1">운영자가 공개한 콘텐츠가 여기에 표시됩니다</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Content Core Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Content Core 소비 모드</p>
            <p className="text-blue-700 text-sm mt-1">
              이 화면은 cms_media 데이터를 Content Core 관점으로 표시합니다.
              콘텐츠 조회만 가능하며, 생성/수정/삭제는 각 서비스(LMS/CMS)에서 수행하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          Work Order: WO-O4O-BUSINESS-DASHBOARD-V1, WO-O4O-BUSINESS-DASHBOARD-USAGE-SNAPSHOT-V1, WO-O4O-CONTENT-COPY-MINIMAL-V1 |
          Content Core 소비 원칙 준수 (READ-ONLY, 복사 예외) |
          참조: docs/platform/content-core/CONTENT-CONSUMPTION-SCENARIOS.md
        </p>
      </div>
    </div>
  );
}
