/**
 * PharmacyDashboardPage - 매장 운영 OS (5-Block 표준)
 *
 * WO-O4O-STORE-DASHBOARD-RESTRUCTURE-V1
 *
 * 5-Block 구조 (@o4o/operator-ux-core 재사용):
 *  [1] KPI Grid       — 판매 중 상품, 승인 대기, 공개 콘텐츠, 활성 채널, 이용 서비스
 *  [2] AI Summary     — KPI 기반 Rule-based 인사이트 (하드코딩 제거)
 *  [3] Action Queue   — 조건부 즉시 처리 항목
 *  [4] Activity Log   — 최근 자산/신청/채널 활동
 *  [5] Quick Actions  — 매장 운영 바로가기
 */

import { useState, useEffect, useCallback } from 'react';
import {
  OperatorDashboardLayout,
  type OperatorDashboardConfig,
  type KpiItem,
  type AiSummaryItem,
  type ActionItem,
  type ActivityItem,
  type QuickActionItem,
} from '@o4o/operator-ux-core';
import { useOrganization } from '../../contexts';
import {
  fetchChannelOverview,
  type ChannelOverview,
} from '../../api/storeHub';
import {
  getApplications,
  getListings,
  type ProductApplication,
  type ProductListing,
} from '../../api/pharmacyProducts';
import {
  storeAssetControlApi,
  type StoreAssetItem,
} from '../../api/assetSnapshot';
import { listPlatformServices, type PlatformServiceItem } from '../../api/platform-services';

// ─── Data Shape ───

interface StoreDashboardData {
  channels: ChannelOverview[];
  applications: ProductApplication[];
  listings: ProductListing[];
  assets: StoreAssetItem[];
  services: PlatformServiceItem[];
}

// ─── Config Builder ───

function buildStoreDashboardConfig(data: StoreDashboardData): OperatorDashboardConfig {
  const { channels, applications, listings, assets, services } = data;

  const approvedChannels = channels.filter(ch => ch.status === 'APPROVED');
  const activeListings = listings.filter(l => l.is_active);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const publishedAssets = assets.filter(a => a.publishStatus === 'published');
  const inactiveListings = listings.filter(l => !l.is_active);
  const unpublishedAssets = assets.filter(a => a.publishStatus !== 'published');
  const enrolledServices = services.filter(s => s.enrollmentStatus === 'approved');

  // ── Block 1: KPI Grid ──

  const kpis: KpiItem[] = [
    {
      key: 'active-listings',
      label: '판매 중 상품',
      value: activeListings.length,
      status: activeListings.length === 0 && listings.length > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'pending-apps',
      label: '승인 대기 상품',
      value: pendingApps.length,
      status: pendingApps.length > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'published-content',
      label: '공개 콘텐츠',
      value: publishedAssets.length,
      status: publishedAssets.length === 0 && assets.length > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'active-channels',
      label: '활성 채널',
      value: `${approvedChannels.length}/${channels.length}`,
      status: channels.length > 0 && approvedChannels.length === 0 ? 'warning' : 'neutral',
    },
    {
      key: 'enrolled-services',
      label: '이용 서비스',
      value: enrolledServices.length,
      status: 'neutral',
    },
  ];

  // ── Block 2: AI Summary (Rule-based) ──

  const aiSummary: AiSummaryItem[] = [];

  if (pendingApps.length > 0) {
    aiSummary.push({
      id: 'ai-pending-apps',
      message: `승인 대기 상품이 ${pendingApps.length}건 있습니다. 운영자 승인 후 진열 가능합니다.`,
      level: pendingApps.length > 3 ? 'warning' : 'info',
      link: '/store/products',
    });
  }

  if (publishedAssets.length === 0 && assets.length > 0) {
    aiSummary.push({
      id: 'ai-no-published',
      message: '공개된 콘텐츠가 없습니다. 콘텐츠를 게시하여 채널에 노출하세요.',
      level: 'warning',
      link: '/store/content',
    });
  }

  if (channels.length > 0 && approvedChannels.length < 2) {
    aiSummary.push({
      id: 'ai-channels-low',
      message: `활성 채널이 ${approvedChannels.length}개입니다. 채널을 확장하여 노출을 높여보세요.`,
      level: 'info',
      link: '/store/channels',
    });
  }

  if (inactiveListings.length > 0) {
    aiSummary.push({
      id: 'ai-inactive-listings',
      message: `비활성 상품이 ${inactiveListings.length}건 있습니다. 진열을 활성화하세요.`,
      level: 'info',
      link: '/store/products',
    });
  }

  // ── Block 3: Action Queue ──

  const actionQueue: ActionItem[] = [];

  if (pendingApps.length > 0) {
    actionQueue.push({
      id: 'aq-pending-apps',
      label: '승인 대기 상품',
      count: pendingApps.length,
      link: '/store/products',
    });
  }

  if (unpublishedAssets.length > 0) {
    actionQueue.push({
      id: 'aq-unpublished',
      label: '미게시 콘텐츠',
      count: unpublishedAssets.length,
      link: '/store/content',
    });
  }

  if (inactiveListings.length > 0) {
    actionQueue.push({
      id: 'aq-inactive-listings',
      label: '비활성 상품 진열',
      count: inactiveListings.length,
      link: '/store/products',
    });
  }

  // ── Block 4: Activity Log ──

  const activityLog: ActivityItem[] = [];

  // 최근 상품 신청
  for (const app of applications.slice(0, 5)) {
    activityLog.push({
      id: `app-${app.id}`,
      message: `상품 신청: ${app.product_name ?? '상품'} (${app.status === 'pending' ? '대기' : app.status === 'approved' ? '승인' : '거절'})`,
      timestamp: app.created_at,
    });
  }

  // 최근 콘텐츠 자산
  for (const asset of assets.slice(0, 5)) {
    activityLog.push({
      id: `asset-${asset.id}`,
      message: `콘텐츠: ${asset.title} (${asset.publishStatus === 'published' ? '게시됨' : '미게시'})`,
      timestamp: asset.createdAt,
    });
  }

  // 정렬 + 제한
  activityLog.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  activityLog.splice(10);

  // ── Block 5: Quick Actions ──

  const quickActions: QuickActionItem[] = [
    { id: 'qa-products', label: '상품 관리', link: '/store/products', icon: '🏪' },
    { id: 'qa-content', label: '콘텐츠 관리', link: '/store/content', icon: '🗂️' },
    { id: 'qa-orders', label: '주문 관리', link: '/store/orders', icon: '📦' },
    { id: 'qa-channels', label: '채널 관리', link: '/store/channels', icon: '📡' },
    { id: 'qa-signage', label: '사이니지', link: '/store/signage', icon: '🖥️' },
    { id: 'qa-hub', label: '공용공간', link: '/hub', icon: '🔍' },
    { id: 'qa-settings', label: '설정', link: '/store/settings', icon: '⚙️' },
  ];

  return { kpis, aiSummary, actionQueue, activityLog, quickActions };
}

// ─── Component ───

export function PharmacyDashboardPage() {
  const { currentOrganization } = useOrganization();
  const [config, setConfig] = useState<OperatorDashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        fetchChannelOverview().catch(() => [] as ChannelOverview[]),
        getApplications({ limit: 200 }).then(res => res.data).catch(() => [] as ProductApplication[]),
        getListings().then(res => res.data).catch(() => [] as ProductListing[]),
        storeAssetControlApi.list({ limit: 200 }).then(res => res.data.items).catch(() => [] as StoreAssetItem[]),
        listPlatformServices().catch(() => [] as PlatformServiceItem[]),
      ]);

      const channels = results[0].status === 'fulfilled' ? results[0].value : [];
      const applications = results[1].status === 'fulfilled' ? results[1].value : [];
      const listings = results[2].status === 'fulfilled' ? results[2].value : [];
      const assets = results[3].status === 'fulfilled' ? results[3].value : [];
      const services = results[4].status === 'fulfilled' ? results[4].value : [];

      setConfig(buildStoreDashboardConfig({
        channels: channels as ChannelOverview[],
        applications: applications as ProductApplication[],
        listings: listings as ProductListing[],
        assets: assets as StoreAssetItem[],
        services: services as PlatformServiceItem[],
      }));
    } catch (err) {
      setError('데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error || '데이터를 불러올 수 없습니다.'}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
          내 매장관리
        </h1>
        {currentOrganization?.name && (
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748b' }}>
            {currentOrganization.name}
          </p>
        )}
      </div>
      <OperatorDashboardLayout config={config} />
    </div>
  );
}
