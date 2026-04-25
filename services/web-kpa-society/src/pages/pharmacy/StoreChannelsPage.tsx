/**
 * StoreChannelsPage — 채널 중심 진열 실행 콘솔
 *
 * WO-O4O-STORE-CHANNEL-CENTRIC-V1
 * WO-CHANNEL-EXECUTION-CONSOLE-V1 Phase 1 + Phase 2
 * WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1
 *
 * 구조:
 *  [A] 채널 탭 (B2C / KIOSK / TABLET / SIGNAGE)
 *  [B] 채널 KPI (상태, 노출 상품, 노출 콘텐츠, 강제노출)
 *  [C] Quick Actions + 채널 미리보기
 *  [D] 채널 제품 목록 (B2C/KIOSK만) + 제품 추가 모달 + 순서 변경
 *  [E] 노출 자산 리스트
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
  Plus,
  X,
  Package,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  MoreVertical,
  Trash2,
  Copy,
  Link2,
  AlertCircle,
  BookOpen,
  PenLine,
  Settings2,
} from 'lucide-react';
import {
  fetchChannelOverviewWithCode,
  createChannel,
  fetchLiveSignals,
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
import {
  fetchChannelProducts,
  fetchAvailableProducts,
  addProductToChannel,
  deactivateChannelProduct,
  activateChannelProduct,
  bulkChannelProductAction,
  reorderChannelProducts,
  type ChannelProduct,
  type AvailableProduct,
} from '../../api/channelProducts';
import { fetchChannelOverview } from '../../api/storeHub';

/* ─── Constants ──────────────────────────────── */

const CHANNEL_TABS: { type: ChannelType; label: string; Icon: typeof Globe; assetKey: string | null }[] = [
  { type: 'B2C', label: '온라인 스토어', Icon: Globe, assetKey: 'home' },
  { type: 'KIOSK', label: '키오스크', Icon: Monitor, assetKey: null },
  { type: 'TABLET', label: '태블릿', Icon: Tablet, assetKey: null },
  { type: 'SIGNAGE', label: '사이니지', Icon: Smartphone, assetKey: 'signage' },
];

/** Channels that support product management */
const PRODUCT_CHANNEL_TYPES: ChannelType[] = ['B2C', 'KIOSK'];

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

function formatPrice(price: number | null): string {
  if (price == null) return '-';
  return price.toLocaleString('ko-KR') + '원';
}

function isForcedActive(item: StoreAssetItem): boolean {
  if (!item.isForced) return false;
  const now = new Date();
  if (item.forcedStartAt && new Date(item.forcedStartAt) > now) return false;
  if (item.forcedEndAt && new Date(item.forcedEndAt) < now) return false;
  return true;
}

/* ─── AddProductModal ────────────────────────── */

function AddProductModal({
  open,
  onError,
  onClose,
  channelId,
  onProductAdded,
}: {
  open: boolean;
  onClose: () => void;
  channelId: string;
  onProductAdded: () => void;
  onError?: (message: string) => void;
}) {
  const [available, setAvailable] = useState<AvailableProduct[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !channelId) return;
    setLoadingList(true);
    fetchAvailableProducts(channelId)
      .then(setAvailable)
      .catch(() => setAvailable([]))
      .finally(() => setLoadingList(false));
  }, [open, channelId]);

  if (!open) return null;

  const handleAdd = async (productListingId: string) => {
    setAddingId(productListingId);
    try {
      await addProductToChannel(channelId, productListingId);
      setAvailable(prev => prev.filter(p => p.id !== productListingId));
      onProductAdded();
    } catch {
      onError?.('제품 추가에 실패했습니다.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[1000]"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-[1001] w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">제품 추가</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadingList ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 제품 목록 로딩 중...
            </div>
          ) : available.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">등록 가능한 제품이 없습니다.</p>
              <p className="text-xs mt-1">모든 제품이 이미 이 채널에 등록되어 있거나, 승인된 제품이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {available.map(product => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">
                      {product.productName}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                        {product.serviceKey}
                      </span>
                      <span>{formatPrice(product.retailPrice)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(product.id)}
                    disabled={addingId === product.id}
                    className="ml-3 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {addingId === product.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    추가
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── ChannelPublicUrlCard (WO-O4O-STORE-CHANNEL-PUBLIC-URL-GUIDE-V1) ── */

function ChannelPublicUrlCard({
  channelType,
  orgCode,
  showToast,
}: {
  channelType: ChannelType;
  orgCode: string | null;
  showToast: (type: 'success' | 'error', message: string) => void;
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Determine URL and guidance per channel type
  const getChannelUrl = (): { url: string | null; label: string; guidance: string | null; guidanceLink: string | null } => {
    if (channelType === 'B2C') {
      if (!orgCode) return { url: null, label: '온라인 스토어', guidance: null, guidanceLink: null };
      return { url: `${origin}/store/${orgCode}`, label: '온라인 스토어', guidance: null, guidanceLink: null };
    }
    if (channelType === 'TABLET') {
      if (!orgCode) return { url: null, label: '태블릿', guidance: null, guidanceLink: null };
      return { url: `${origin}/tablet/${orgCode}`, label: '태블릿 상품 안내', guidance: null, guidanceLink: null };
    }
    if (channelType === 'KIOSK') {
      return {
        url: null,
        label: '키오스크',
        guidance: '키오스크는 별도 공개 URL이 없습니다. B2C 스토어 또는 태블릿 채널을 통해 고객이 접근합니다.',
        guidanceLink: null,
      };
    }
    // SIGNAGE
    return {
      url: null,
      label: '사이니지',
      guidance: '재생 화면은 사이니지 관리에서 플레이리스트를 선택하여 실행합니다.',
      guidanceLink: '/store/marketing/signage/player',
    };
  };

  const { url, label, guidance, guidanceLink } = getChannelUrl();

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast('success', '공개 주소가 클립보드에 복사되었습니다.');
    } catch {
      showToast('error', '복사에 실패했습니다. 주소를 직접 복사해 주세요.');
    }
  };

  // No slug case for B2C/TABLET
  if ((channelType === 'B2C' || channelType === 'TABLET') && !orgCode) {
    return (
      <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-amber-200 bg-amber-50">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">공개 주소가 아직 설정되지 않았습니다</p>
          <p className="text-xs text-amber-600 mt-0.5">매장 설정에서 약국 코드를 등록하면 공개 URL이 생성됩니다.</p>
        </div>
        <Link
          to="/store/settings"
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100"
        >
          설정으로 이동
        </Link>
      </div>
    );
  }

  // KIOSK / SIGNAGE guidance
  if (guidance) {
    return (
      <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-slate-200 bg-slate-50">
        <Link2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-600">{guidance}</p>
        </div>
        {guidanceLink && (
          <Link
            to={guidanceLink}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            사이니지 재생 <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    );
  }

  // B2C / TABLET with valid URL
  return (
    <div className="flex items-center gap-3 p-4 mb-6 rounded-lg border border-slate-200 bg-white">
      <Link2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 mb-1">{label} 공개 주소</div>
        <div className="text-[15px] font-mono font-medium text-slate-900 truncate">{url}</div>
        <div className="text-xs text-slate-400 mt-1">이 주소로 고객이 매장 화면에 접속합니다</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200"
          title="주소 복사"
        >
          <Copy className="w-3.5 h-3.5" /> 복사
        </button>
        <a
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          title="새 탭에서 열기"
        >
          <ExternalLink className="w-3.5 h-3.5" /> 열기
        </a>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────── */

export function StoreChannelsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ChannelType>('B2C');
  const [channels, setChannels] = useState<ChannelOverview[]>([]);
  const [assets, setAssets] = useState<StoreAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Product management state (WO-CHANNEL-EXECUTION-CONSOLE-V1)
  const [channelProducts, setChannelProducts] = useState<ChannelProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  // deactivatingId removed — replaced by actionLoading + confirmModal (WO-KPA-STORE-CHANNEL-PRODUCT-LIST-SELECTION-ACTIONS-V1)
  const [reordering, setReordering] = useState(false);
  const [orgCode, setOrgCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // WO-KPA-STORE-CHANNEL-PRODUCT-LIST-SELECTION-ACTIONS-V1
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{
    type: 'delete' | 'deactivate' | 'activate';
    ids: string[];
    isBulk: boolean;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // WO-O4O-STORE-CHANNEL-ACTION-ENHANCEMENT-V1: 대기 관심 요청 카운트
  const [pendingInterestCount, setPendingInterestCount] = useState(0);

  // WO-STORE-CHANNEL-BETA-READINESS-V1: user feedback + operational visibility
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      fetchChannelOverviewWithCode().catch(() => ({ channels: [] as ChannelOverview[], organizationCode: null })),
      storeAssetControlApi.list({ limit: 200 }).then(r => r.data.items).catch(() => [] as StoreAssetItem[]),
    ]);
    const chResult = results[0].status === 'fulfilled'
      ? results[0].value as { channels: ChannelOverview[]; organizationCode: string | null }
      : { channels: [], organizationCode: null };
    setChannels(chResult.channels);
    setOrgCode(chResult.organizationCode);
    setAssets(results[1].status === 'fulfilled' ? results[1].value as StoreAssetItem[] : []);
    setLastFetched(new Date());
    setLoading(false);

    // WO-STORE-CHANNEL-BETA-READINESS-V1: error feedback
    if (chResult.channels.length === 0 && results[0].status === 'rejected') {
      showToast('error', '채널 정보를 불러오지 못했습니다.');
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Current channel info
  const currentChannel = channels.find(ch => ch.channelType === activeTab);
  const currentTab = CHANNEL_TABS.find(t => t.type === activeTab)!;
  const st = currentChannel ? STATUS_CONFIG[currentChannel.status] : null;
  const isProductChannel = PRODUCT_CHANNEL_TYPES.includes(activeTab);

  // Fetch channel products when tab changes
  const loadChannelProducts = useCallback(async (channelId: string) => {
    setProductLoading(true);
    try {
      const products = await fetchChannelProducts(channelId);
      setChannelProducts(products);
    } catch {
      setChannelProducts([]);
      showToast('error', '제품 목록을 불러오지 못했습니다.');
    } finally {
      setProductLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setSelectedIds(new Set());
    setActionMenuId(null);
    if (isProductChannel && currentChannel?.id) {
      loadChannelProducts(currentChannel.id);
    } else {
      setChannelProducts([]);
    }
  }, [isProductChannel, currentChannel?.id, loadChannelProducts]);

  // WO-O4O-STORE-CHANNEL-ACTION-ENHANCEMENT-V1: Fetch pending interest count for TABLET tab
  useEffect(() => {
    if (activeTab !== 'TABLET') return;
    fetchLiveSignals()
      .then(signals => setPendingInterestCount(signals.pendingTabletRequests))
      .catch(() => { /* graceful degradation */ });
  }, [activeTab]);

  // Active products for display
  const activeProducts = useMemo(
    () => channelProducts.filter(p => p.isActive),
    [channelProducts]
  );
  const inactiveProducts = useMemo(
    () => channelProducts.filter(p => !p.isActive),
    [channelProducts]
  );

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
    } catch {
      showToast('error', '채널 설정 변경에 실패했습니다.');
    } finally {
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
    } catch {
      showToast('error', '게시 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Product added callback
  const handleProductAdded = () => {
    if (currentChannel) {
      loadChannelProducts(currentChannel.id);
      fetchChannelOverview().then(setChannels).catch(() => {});
      showToast('success', '제품이 채널에 추가되었습니다.');
    }
  };

  // Reorder handler (Phase 2)
  const handleMoveProduct = async (productId: string, direction: 'up' | 'down') => {
    if (!currentChannel) return;
    const idx = activeProducts.findIndex(p => p.id === productId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= activeProducts.length) return;

    // Optimistic UI swap
    const updated = [...activeProducts];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];

    // Build reorder items with new display_order
    const items = updated.map((p, i) => ({ id: p.id, displayOrder: i }));

    setReordering(true);
    try {
      await reorderChannelProducts(currentChannel.id, items);
      await loadChannelProducts(currentChannel.id);
    } catch {
      showToast('error', '순서 변경에 실패했습니다.');
      await loadChannelProducts(currentChannel.id);
    } finally {
      setReordering(false);
    }
  };

  // ─── Selection helpers ───
  const allProducts = useMemo(() => [...activeProducts, ...inactiveProducts], [activeProducts, inactiveProducts]);
  const allSelected = allProducts.length > 0 && allProducts.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allProducts.map(p => p.id)));
    }
  };

  // ─── Single row action handler ───
  const handleSingleAction = async (type: 'activate' | 'deactivate' | 'delete', productChannelId: string) => {
    if (!currentChannel) return;
    setActionMenuId(null);
    if (type === 'delete') {
      setConfirmModal({ type: 'delete', ids: [productChannelId], isBulk: false });
      return;
    }
    setActionLoading(true);
    try {
      if (type === 'deactivate') {
        await deactivateChannelProduct(currentChannel.id, productChannelId);
        showToast('success', '제품이 비활성화되었습니다.');
      } else {
        await activateChannelProduct(currentChannel.id, productChannelId);
        showToast('success', '제품이 활성화되었습니다.');
      }
      await loadChannelProducts(currentChannel.id);
      fetchChannelOverview().then(setChannels).catch(() => {});
      setSelectedIds(prev => { const n = new Set(prev); n.delete(productChannelId); return n; });
    } catch {
      showToast('error', type === 'deactivate' ? '비활성화에 실패했습니다.' : '활성화에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Bulk action handler ───
  const handleBulkAction = (type: 'activate' | 'deactivate' | 'delete') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (type === 'delete') {
      setConfirmModal({ type: 'delete', ids, isBulk: true });
    } else {
      setConfirmModal({ type, ids, isBulk: true });
    }
  };

  // ─── Confirm modal execute ───
  const handleConfirmAction = async () => {
    if (!confirmModal || !currentChannel) return;
    setActionLoading(true);
    try {
      const result = await bulkChannelProductAction(currentChannel.id, confirmModal.type, confirmModal.ids);
      const labels = { delete: '삭제', deactivate: '비활성화', activate: '활성화' };
      if (result.requested === result.processed) {
        showToast('success', `${result.processed}개 제품이 ${labels[confirmModal.type]}되었습니다.`);
      } else {
        showToast('error', `${result.requested}개 중 ${result.processed}개 처리 완료 (일부 실패)`);
      }
      await loadChannelProducts(currentChannel.id);
      fetchChannelOverview().then(setChannels).catch(() => {});
      setSelectedIds(new Set());
    } catch {
      showToast('error', '작업에 실패했습니다.');
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  // Channel creation handler (WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1)
  const handleCreateChannel = async () => {
    setCreating(true);
    try {
      await createChannel(activeTab);
      await fetchData();
      showToast('success', `${CHANNEL_TABS.find(t => t.type === activeTab)?.label ?? activeTab} 채널이 생성되었습니다.`);
    } catch {
      showToast('error', '채널 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 채널 정보를 불러오는 중...
      </div>
    );
  }

  if (!loading && channels.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-sm text-slate-500 mb-1">
          <Link to="/store" className="text-blue-600 hover:underline">&larr; 대시보드</Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">채널 관리</h1>
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
          <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">아직 등록된 채널이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">아래 버튼으로 첫 채널을 생성하세요.</p>
          <button
            onClick={handleCreateChannel}
            disabled={creating}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            B2C 채널 만들기
          </button>
        </div>
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
          <p className="text-sm text-slate-500 mt-1">각 채널의 제품 진열과 콘텐츠 노출을 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-xs text-slate-400">
              {lastFetched.toLocaleTimeString('ko-KR')} 조회
            </span>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> 새로고침
          </button>
        </div>
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

      {/* ─── Toast Feedback (WO-STORE-CHANNEL-BETA-READINESS-V1) ─── */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px', borderRadius: '8px', border: '1px solid',
          fontSize: '0.875rem', marginBottom: '16px',
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
        }}>
          <span>{toast.type === 'success' ? '\u2705' : '\u274C'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ─── Channel Detail Header ────────────────── */}
      <div className="flex items-center gap-4 mb-6 p-5 bg-white rounded-xl border border-slate-200">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={currentChannel ? { backgroundColor: st!.bg } : { backgroundColor: '#f1f5f9' }}
        >
          <currentTab.Icon
            className="w-6 h-6"
            style={currentChannel ? { color: st!.color } : { color: '#94a3b8' }}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">{currentTab.label} 채널</h2>
            {st && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === 'B2C' && '고객이 온라인으로 상품을 확인하고 구매할 수 있는 스토어프론트'}
            {activeTab === 'KIOSK' && '매장 내 키오스크에서 고객이 직접 상품을 조회합니다'}
            {activeTab === 'TABLET' && '매장 내 태블릿에서 상품 안내 및 관심 요청을 처리합니다'}
            {activeTab === 'SIGNAGE' && '매장 내 디지털 사이니지에 콘텐츠를 표시합니다'}
          </p>
        </div>
        {!currentChannel && (
          <button
            onClick={handleCreateChannel}
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            채널 만들기
          </button>
        )}
      </div>

      {/* ─── Public URL Card (WO-O4O-STORE-CHANNEL-PUBLIC-URL-GUIDE-V1) ─── */}
      {currentChannel && (
        <ChannelPublicUrlCard
          channelType={activeTab}
          orgCode={orgCode}
          showToast={showToast}
        />
      )}

      {/* ─── [B] Channel KPI ─────────────────────── */}
      {currentChannel && (
        <div className={`grid ${forcedAssets.length > 0 || activeTab === 'TABLET' ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-6`}>
          <div className="rounded-lg border border-slate-200 p-4 bg-white">
            <div className="text-xs text-slate-500 mb-1">노출 상품</div>
            <div className="text-2xl font-bold text-slate-900">
              {currentChannel.visibleProductCount}
              <span className="text-sm font-normal text-slate-400 ml-1">
                / {currentChannel.totalProductCount}
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
          {forcedAssets.length > 0 && (
            <div className="rounded-lg border border-red-200 p-4 bg-red-50">
              <div className="text-xs text-red-500 mb-1">강제노출</div>
              <div className="text-2xl font-bold text-red-700">{forcedAssets.length}</div>
            </div>
          )}
          {activeTab === 'TABLET' && (
            <div
              className="rounded-lg border border-emerald-200 p-4 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors"
              onClick={() => navigate('/store/channels/tablet')}
            >
              <div className="text-xs text-emerald-600 mb-1">대기 관심 요청</div>
              <div className="text-2xl font-bold text-emerald-700">{pendingInterestCount}</div>
            </div>
          )}
        </div>
      )}

      {/* ─── [C] Quick Actions ───────────────────── */}
      {currentChannel && (
        <div className="flex flex-wrap gap-2 mb-6">
          {activeTab === 'B2C' && orgCode && (
            <a
              href={`/store/${orgCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              <ExternalLink className="w-3.5 h-3.5" /> 스토어 보기
            </a>
          )}
          {activeTab === 'SIGNAGE' && (
            <>
              <button
                onClick={() => navigate('/store/signage')}
                className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
              >
                사이니지 콘텐츠
              </button>
              <button
                onClick={() => navigate('/store/marketing/signage/player')}
                className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
              >
                재생 실행
              </button>
            </>
          )}
          {activeTab === 'TABLET' && (
            <>
              <button
                onClick={() => navigate('/store/commerce/tablet-displays')}
                className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
              >
                태블릿 진열
              </button>
              <button
                onClick={() => navigate('/store/channels/tablet')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
              >
                관심 요청 확인
                {pendingInterestCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
                    {pendingInterestCount}
                  </span>
                )}
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/store-hub')}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            약국 HUB
          </button>
          <button
            onClick={() => navigate('/store/content')}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            전체 자산
          </button>
        </div>
      )}

      {/* ─── [D] Channel Product List (B2C/KIOSK only) ─── */}
      {isProductChannel && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">진열 제품</h2>
            {currentChannel && currentChannel.status === 'APPROVED' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-3.5 h-3.5" /> 제품 추가
              </button>
            )}
          </div>

          {productLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 bg-white rounded-lg border border-slate-200">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> 제품 목록 로딩 중...
            </div>
          ) : !currentChannel ? (
            <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
              <p className="text-sm text-slate-400">이 채널이 아직 등록되지 않았습니다.</p>
              <button
                onClick={handleCreateChannel}
                disabled={creating}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                채널 만들기
              </button>
            </div>
          ) : currentChannel.status === 'PENDING' ? (
            <div className="text-center py-8 bg-white rounded-lg border border-amber-200 bg-amber-50/50">
              <p className="text-sm text-amber-700 font-medium">채널이 신청되었습니다</p>
              <p className="text-xs text-amber-600 mt-1">승인 후 제품을 진열할 수 있습니다.</p>
            </div>
          ) : activeProducts.length === 0 && inactiveProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-white rounded-lg border border-slate-200">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">이 채널에 등록된 제품이 없습니다.</p>
              <p className="text-xs mt-1">"제품 추가" 버튼으로 제품을 진열하세요.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* ─── Selection Action Bar ─── */}
              {someSelected && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
                  <span className="text-xs font-medium text-blue-700">{selectedIds.size}개 선택됨</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      선택 해제
                    </button>
                    <button
                      onClick={() => handleBulkAction('deactivate')}
                      disabled={actionLoading}
                      className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                    >
                      <EyeOff className="w-3 h-3 inline mr-1" />비활성화
                    </button>
                    <button
                      onClick={() => handleBulkAction('activate')}
                      disabled={actionLoading}
                      className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 disabled:opacity-50"
                    >
                      <Eye className="w-3 h-3 inline mr-1" />활성화
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      disabled={actionLoading}
                      className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />삭제
                    </button>
                  </div>
                </div>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium w-12">#</th>
                    <th className="px-4 py-3 font-medium">상품명</th>
                    <th className="px-4 py-3 font-medium w-20">유형</th>
                    <th className="px-4 py-3 font-medium w-28">가격</th>
                    <th className="px-4 py-3 font-medium w-20">상태</th>
                    <th className="px-4 py-3 font-medium w-16">순서</th>
                    <th className="px-4 py-3 font-medium w-16">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeProducts.map((product, idx) => (
                    <tr key={product.id} className={`hover:bg-slate-50 ${selectedIds.has(product.id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 truncate max-w-sm">
                          {product.productName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                          {product.serviceKey}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatPrice(product.retailPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.listingActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {product.listingActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleMoveProduct(product.id, 'up')}
                            disabled={idx === 0 || reordering}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="위로 이동"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveProduct(product.id, 'down')}
                            disabled={idx === activeProducts.length - 1 || reordering}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="아래로 이동"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === product.id ? null : product.id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenuId === product.id && (
                          <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                            <button
                              onClick={() => handleSingleAction('deactivate', product.id)}
                              className="w-full text-left px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                            >
                              <EyeOff className="w-3.5 h-3.5" /> 비활성화
                            </button>
                            <button
                              onClick={() => handleSingleAction('delete', product.id)}
                              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> 삭제
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {inactiveProducts.length > 0 && (
                    <>
                      <tr className="bg-slate-50/50">
                        <td colSpan={8} className="px-4 py-2 text-xs text-slate-400">
                          비활성 제품 ({inactiveProducts.length})
                        </td>
                      </tr>
                      {inactiveProducts.map(product => (
                        <tr key={product.id} className={`${selectedIds.has(product.id) ? 'bg-blue-50/30' : 'opacity-50'}`}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              className="rounded border-slate-300"
                            />
                          </td>
                          <td className="px-4 py-2 text-slate-300">-</td>
                          <td className="px-4 py-2 text-slate-400 line-through truncate max-w-sm">
                            {product.productName}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-400">
                              {product.serviceKey}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {formatPrice(product.retailPrice)}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
                              비활성
                            </span>
                          </td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 relative">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === product.id ? null : product.id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {actionMenuId === product.id && (
                              <div className="absolute right-4 top-8 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                                <button
                                  onClick={() => handleSingleAction('activate', product.id)}
                                  className="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5" /> 활성화
                                </button>
                                <button
                                  onClick={() => handleSingleAction('delete', product.id)}
                                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── [E] 노출 자산 리스트 ─────────────────── */}
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
        activeTab === 'TABLET' ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-700 mb-4">태블릿 채널 관리</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/store/commerce/tablet-displays')}
                className="flex flex-col items-start gap-1 p-4 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-left"
              >
                <span className="text-sm font-semibold text-indigo-700">태블릿 진열</span>
                <span className="text-xs text-indigo-500">태블릿에 어떤 상품을 표시할지 디바이스별로 구성합니다</span>
              </button>
              <button
                onClick={() => navigate('/store/channels/tablet')}
                className="flex flex-col items-start gap-1 p-4 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-left"
              >
                <span className="text-sm font-semibold text-emerald-700">태블릿 관심 요청</span>
                <span className="text-xs text-emerald-500">태블릿에서 들어온 관심 요청을 확인하고 처리합니다</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 bg-white rounded-lg border border-slate-200">
            <p className="text-sm">이 채널의 콘텐츠 배치 기능은 준비 중입니다.</p>
            <p className="text-xs mt-1">상품 노출은 위 KPI에서 확인할 수 있습니다.</p>
          </div>
        )
      )}

      {/* ─── [F] Blog 유사 채널 (WO-O4O-STORE-BLOG-CHANNEL-CLARITY-V1) ─── */}
      <div className="mt-10 pt-8 border-t border-slate-200">
        <div className="flex items-center gap-4 mb-4 p-5 bg-white rounded-xl border border-slate-200">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl"
            style={{ backgroundColor: '#eff6ff' }}
          >
            <BookOpen className="w-6 h-6" style={{ color: '#2563eb' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">블로그</h2>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: '#dcfce7', color: '#166534' }}
              >
                사용 가능
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              블로그는 상품과 함께 매장 정보를 전달하는 콘텐츠 채널입니다
            </p>
          </div>
        </div>

        {/* Blog URL */}
        {orgCode ? (
          <div className="flex items-center gap-3 p-4 mb-4 rounded-lg border border-slate-200 bg-white">
            <Link2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 mb-1">블로그 공개 주소</div>
              <div className="text-[15px] font-mono font-medium text-slate-900 truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}/store/{orgCode}/blog
              </div>
              <div className="text-xs text-slate-400 mt-1">이 주소로 고객이 매장 블로그에 접속합니다</div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={async () => {
                  const blogUrl = `${window.location.origin}/store/${orgCode}/blog`;
                  try {
                    await navigator.clipboard.writeText(blogUrl);
                    showToast('success', '블로그 주소가 클립보드에 복사되었습니다.');
                  } catch {
                    showToast('error', '복사에 실패했습니다. 주소를 직접 복사해 주세요.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200"
                title="주소 복사"
              >
                <Copy className="w-3.5 h-3.5" /> 복사
              </button>
              <a
                href={`/store/${orgCode}/blog`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                title="새 탭에서 열기"
              >
                <ExternalLink className="w-3.5 h-3.5" /> 열기
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 mb-4 rounded-lg border border-amber-200 bg-amber-50">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">블로그 주소가 아직 설정되지 않았습니다</p>
              <p className="text-xs text-amber-600 mt-0.5">매장 설정에서 약국 코드를 등록하면 블로그 URL이 생성됩니다.</p>
            </div>
            <Link
              to="/store/settings"
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100"
            >
              설정으로 이동
            </Link>
          </div>
        )}

        {/* Blog Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/store/content/blog')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            <PenLine className="w-3.5 h-3.5" /> 글 작성
          </button>
          <button
            onClick={() => navigate('/store/content/blog')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            <Settings2 className="w-3.5 h-3.5" /> 블로그 관리
          </button>
          {orgCode && (
            <a
              href={`/store/${orgCode}/blog`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
            >
              <ExternalLink className="w-3.5 h-3.5" /> 미리보기
            </a>
          )}
        </div>
      </div>

      {/* ─── Add Product Modal ───────────────────── */}
      {currentChannel && (
        <AddProductModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          channelId={currentChannel.id}
          onProductAdded={handleProductAdded}
          onError={(msg) => showToast('error', msg)}
        />
      )}

      {/* ─── Confirm Action Modal (WO-KPA-STORE-CHANNEL-PRODUCT-LIST-SELECTION-ACTIONS-V1) ─── */}
      {confirmModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[1000]" onClick={() => !actionLoading && setConfirmModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-[1001] w-full max-w-sm">
            <div className="px-6 py-5">
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {confirmModal.type === 'delete' ? '제품 삭제 확인' : confirmModal.type === 'deactivate' ? '제품 비활성화 확인' : '제품 활성화 확인'}
              </h3>
              <p className="text-sm text-slate-600">
                {confirmModal.type === 'delete' ? (
                  <>
                    {confirmModal.isBulk ? `선택한 ${confirmModal.ids.length}개` : '이'} 제품을 채널에서 완전히 삭제하시겠습니까?
                    <span className="block mt-1 text-xs text-slate-400">삭제된 제품은 "제품 추가"로 다시 등록해야 합니다.</span>
                  </>
                ) : confirmModal.type === 'deactivate' ? (
                  <>선택한 {confirmModal.ids.length}개 제품을 비활성화하시겠습니까?</>
                ) : (
                  <>선택한 {confirmModal.ids.length}개 제품을 활성화하시겠습니까?</>
                )}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 ${
                  confirmModal.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.type === 'deactivate'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {confirmModal.type === 'delete' ? '삭제' : confirmModal.type === 'deactivate' ? '비활성화' : '활성화'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Click-outside handler for action menu ─── */}
      {actionMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
      )}
    </div>
  );
}

export default StoreChannelsPage;
