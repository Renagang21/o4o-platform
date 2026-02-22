/**
 * StoreChannelsPage — 채널 중심 통합 운영 대시보드
 *
 * WO-O4O-STORE-CHANNEL-CENTRIC-V1
 *
 * 기존: 채널 상태 읽기 전용 → 신규: 채널 중심 노출 운영
 *
 * 구조:
 *  [A] 채널 탭 (B2C / KIOSK / TABLET / SIGNAGE)
 *  [B] 채널 KPI (상태, 노출 상품, 노출 콘텐츠, 강제노출)
 *  [C] 노출 자산 리스트 (상품 + 콘텐츠)
 *  [D] Quick Actions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  Lock,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
} from 'lucide-react';
import {
  fetchChannelOverview,
  type ChannelOverview,
  type ChannelType,
  type ChannelStatus,
} from '../../api/storeHub';
import {
  storeAssetControlApi,
  type StoreAssetItem,
  type AssetPublishStatus,
  type ChannelMap,
} from '../../api/assetSnapshot';

/* ─── Constants ──────────────────────────────── */

const CHANNEL_TABS: { type: ChannelType; label: string; Icon: typeof Globe; assetKey: string | null }[] = [
  { type: 'B2C', label: '온라인 스토어', Icon: Globe, assetKey: 'home' },
  { type: 'KIOSK', label: '키오스크', Icon: Monitor, assetKey: null },
  { type: 'TABLET', label: '태블릿', Icon: Tablet, assetKey: null },
  { type: 'SIGNAGE', label: '사이니지', Icon: Smartphone, assetKey: 'signage' },
];

const STATUS_CONFIG: Record<ChannelStatus, { label: string; bg: string; color: string }> = {
  APPROVED: { label: '활성', bg: '#dcfce7', color: '#166534' },
  PENDING: { label: '대기', bg: '#fef3c7', color: '#92400e' },
  REJECTED: { label: '거부', bg: '#fecaca', color: '#991b1b' },
  SUSPENDED: { label: '정지', bg: '#f1f5f9', color: '#64748b' },
  EXPIRED: { label: '만료', bg: '#f1f5f9', color: '#64748b' },
  TERMINATED: { label: '해지', bg: '#f1f5f9', color: '#64748b' },
};

const PUBLISH_CONFIG: Record<AssetPublishStatus, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-slate-100', text: 'text-slate-600' },
  published: { label: '게시됨', bg: 'bg-green-50', text: 'text-green-700' },
  hidden: { label: '숨김', bg: 'bg-orange-50', text: 'text-orange-700' },
};

/* ─── Helpers ────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function isForcedActive(item: StoreAssetItem): boolean {
  if (!item.isForced) return false;
  const now = new Date();
  if (item.forcedStartAt && new Date(item.forcedStartAt) > now) return false;
  if (item.forcedEndAt && new Date(item.forcedEndAt) < now) return false;
  return true;
}

/* ─── Main Component ─────────────────────────── */

export function StoreChannelsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ChannelType>('B2C');
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [assets, setAssets] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      fetchChannelOverview().catch(() => [] as ChannelOverview[]),
      storeAssetControlApi.list({ limit: 200 }).then(r => r.data.items).catch(() => [] as StoreAssetItem[]),
    ]);
    setChannels(results[0].status === 'fulfilled' ? results[0].value as ChannelOverview[] : []);
    setAssets(results[1].status === 'fulfilled' ? results[1].value as StoreAssetItem[] : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Current channel info
  const currentChannel = channels.find(ch => ch.channelType === activeTab);
  const currentTab = CHANNEL_TABS.find(t => t.type === activeTab)!;
  const st = currentChannel ? STATUS_CONFIG[currentChannel.status] : null;

  // Assets filtered by channel
  const channelAssets = useMemo(() => {
    const assetKey = currentTab.assetKey;
    if (!assetKey) return [];
    return assets.filter(a => a.channelMap?.[assetKey]);
  }, [assets, currentTab]);

  const publishedAssets = channelAssets.filter(a => a.publishStatus === 'published');
  const forcedAssets = channelAssets.filter(a => isForcedActive(a));

  // Channel toggle handler
  const handleToggleChannelAsset = async (item: StoreAssetItem) => {
    if (item.isForced || item.isLocked) return;
    const assetKey = currentTab.assetKey;
    if (!assetKey) return;
    const currentMap = item.channelMap || {};
    const newMap: ChannelMap = { ...currentMap, [assetKey]: !currentMap[assetKey] };
    setUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updateChannelMap(item.id, newMap);
      setAssets(prev => prev.map(a =>
        a.id === item.id ? { ...a, channelMap: res.data.channelMap } : a,
      ));
    } catch { /* retry manually */ } finally {
      setUpdatingId(null);
    }
  };

  // Publish toggle handler
  const handleTogglePublish = async (item: StoreAssetItem) => {
    if (item.isForced) return;
    const cycle: AssetPublishStatus[] = ['draft', 'published', 'hidden'];
    const idx = cycle.indexOf(item.publishStatus);
    const next = cycle[(idx + 1) % cycle.length];
    setUpdatingId(item.id);
    try {
      const res = await storeAssetControlApi.updatePublishStatus(item.id, next);
      setAssets(prev => prev.map(a =>
        a.id === item.id ? { ...a, publishStatus: res.data.publishStatus } : a,
      ));
    } catch { /* retry manually */ } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 채널 정보를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link to="/store" className="text-blue-600 hover:underline">&larr; 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">채널 관리</h1>
          <p className="text-sm text-slate-500 mt-1">각 채널에 노출되는 자산을 확인하고 제어합니다</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> 새로고침
        </button>
      </div>

      {/* ─── [A] Channel Tabs ────────────────────── */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1">
          {CHANNEL_TABS.map(tab => {
            const ch = channels.find(c => c.channelType === tab.type);
            const isActive = activeTab === tab.type;
            const chSt = ch ? STATUS_CONFIG[ch.status] : null;
            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.Icon className="w-4 h-4" />
                {tab.label}
                {chSt && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{ background: chSt.bg, color: chSt.color }}
                  >
                    {chSt.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── [B] Channel KPI ─────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <div className="text-xs text-slate-500 mb-1">채널 상태</div>
          {currentChannel ? (
            <span
              className="inline-flex px-2.5 py-1 rounded text-sm font-semibold"
              style={{ background: st!.bg, color: st!.color }}
            >
              {st!.label}
            </span>
          ) : (
            <span className="text-sm text-slate-400">미등록</span>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <div className="text-xs text-slate-500 mb-1">노출 상품</div>
          <div className="text-2xl font-bold text-slate-900">
            {currentChannel ? currentChannel.visibleProductCount : 0}
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {currentChannel ? currentChannel.totalProductCount : 0}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <div className="text-xs text-slate-500 mb-1">노출 콘텐츠</div>
          <div className="text-2xl font-bold text-slate-900">
            {publishedAssets.length}
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {channelAssets.length}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 bg-red-50">
          <div className="text-xs text-red-500 mb-1">강제노출</div>
          <div className="text-2xl font-bold text-red-700">{forcedAssets.length}</div>
        </div>
      </div>

      {/* ─── Quick Actions ───────────────────────── */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => navigate('/hub')}
          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
        >
          약국 HUB으로 이동
        </button>
        <button
          onClick={() => navigate('/store/content')}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
        >
          전체 자산 보기
        </button>
        {activeTab === 'SIGNAGE' && (
          <button
            onClick={() => navigate('/store/signage')}
            className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
          >
            사이니지 운영
          </button>
        )}
        {activeTab === 'TABLET' && (
          <button
            onClick={() => navigate('/store/channels/tablet')}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
          >
            태블릿 요청 관리
          </button>
        )}
      </div>

      {/* ─── [C] 노출 자산 리스트 ─────────────────── */}
      {currentTab.assetKey ? (
        channelAssets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">이 채널에 배치된 콘텐츠가 없습니다.</p>
            <p className="text-xs mt-1">자산 관리에서 채널 배치를 설정하거나, 약국 HUB에서 콘텐츠를 가져오세요.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium w-24">게시 상태</th>
                  <th className="px-4 py-3 font-medium w-24">채널 노출</th>
                  <th className="px-4 py-3 font-medium w-28">복사일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {channelAssets.map(item => {
                  const pubCfg = PUBLISH_CONFIG[item.publishStatus] || PUBLISH_CONFIG.draft;
                  const isUpdating = updatingId === item.id;
                  const forced = isForcedActive(item);
                  const assetKey = currentTab.assetKey!;
                  const isOn = item.channelMap?.[assetKey] ?? false;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${forced ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.assetType === 'cms' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {item.assetType === 'cms' ? 'CMS' : '사이니지'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-md">{item.title}</div>
                        {forced && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 mt-1">
                            <ShieldAlert className="w-3 h-3" /> 강제노출
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {forced ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 opacity-70">
                            <Lock className="w-3 h-3 mr-1" /> {pubCfg.label}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTogglePublish(item)}
                            disabled={isUpdating}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 disabled:opacity-50 ${pubCfg.bg} ${pubCfg.text}`}
                            title="클릭하여 상태 변경"
                          >
                            {isUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                            {pubCfg.label}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {forced || item.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Eye className="w-3.5 h-3.5" /> ON
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleChannelAsset(item)}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isOn
                                ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                            } disabled:opacity-50`}
                            title={`채널 노출 ${isOn ? 'OFF' : 'ON'}`}
                          >
                            {isOn ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {isOn ? 'ON' : 'OFF'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(item.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-16 text-slate-400 bg-white rounded-lg border border-slate-200">
          <p className="text-sm">이 채널의 콘텐츠 배치 기능은 준비 중입니다.</p>
          <p className="text-xs mt-1">상품 노출은 위 KPI에서 확인할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}

export default StoreChannelsPage;
