/**
 * Store Tablet Displays Management Page
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1: Idle 재생 목록 편집 섹션 추가
 *
 * Tablet display configuration: mix supplier + local products.
 * Uses store_tablet_displays with product_type discriminator.
 *
 * 페이지 구성:
 *   1. 진열 상품 (Pool / Display grid + 자체 저장)
 *   2. Idle 재생 목록 (IdlePlaylistEditor + 자체 저장)
 *      - 매장 단위 설정 (device pairing 부재로 매장당 N tablet 동일 idle 사용)
 *      - 데이터는 store_tablets.idle_playlist_items JSONB 에 저장
 *      - kiosk runtime 은 매장의 첫 active tablet row 의 값을 사용 (public API)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Tablet, ChevronUp, ChevronDown, X, Plus,
  ArrowLeft, Save, Package, ShoppingBag, AlertTriangle, Tv,
} from 'lucide-react';
import {
  IdlePlaylistEditor, TabletKioskPage,
  type IdlePlaylistItem, type LibraryAsset, type TabletKioskApi,
} from '@o4o/tablet-kiosk-core';
// WO-O4O-KPA-TABLET-PREVIEW-V1: 공개 뷰어 재사용 미리보기 — 공개 데이터 조회 + 매장 slug
import { fetchTabletProducts, fetchTabletSettings } from '../../api/tablet';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { extractSnapshotMediaList, type SnapshotForMedia } from '@o4o/store-asset-policy-core';
import { getStoreExecutionAssets } from '../../api/storeExecutionAssets';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import {
  fetchTablets,
  createTablet,
  deleteTablet,
  fetchTabletDisplays,
  fetchProductPool,
  saveTabletDisplays,
  fetchTabletIdlePlaylist,
  saveTabletIdlePlaylist,
  fetchTabletDisplaySettings,
  saveTabletDisplaySettings,
} from '../../api/tabletDisplays';
import type { Tablet as TabletType, ProductPool, TabletDisplaySettings } from '../../api/tabletDisplays';
import { DataTable, type Column, ActionBar } from '@o4o/ui';

// ==================== Types ====================

interface DisplayEntry {
  productType: 'supplier' | 'local';
  productId: string;
  productName: string;
  sortOrder: number;
  isVisible: boolean;
}

// ==================== Component ====================

export default function StoreTabletDisplaysPage() {
  const navigate = useNavigate();

  // Tablet state
  const [tablets, setTablets] = useState<TabletType[]>([]);
  const [selectedTabletId, setSelectedTabletId] = useState<string | null>(null);
  const [loadingTablets, setLoadingTablets] = useState(true);

  // Pool & display state
  const [pool, setPool] = useState<ProductPool | null>(null);
  const [displays, setDisplays] = useState<DisplayEntry[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Pool tab
  const [poolTab, setPoolTab] = useState<'supplier' | 'local'>('supplier');
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set());

  // Idle playlist state (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1)
  const [idleItems, setIdleItems] = useState<IdlePlaylistItem[]>([]);
  const [idleInitial, setIdleInitial] = useState<IdlePlaylistItem[]>([]);
  const [savingIdle, setSavingIdle] = useState(false);

  // Display settings state (WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1) — 매장 공통
  const [settings, setSettings] = useState<TabletDisplaySettings>({
    showPrice: true,
    showQr: true,
    showConsultationButton: true,
    autoSlideSeconds: 10,
    idleSlideSeconds: 10,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Load display settings (once)
  useEffect(() => {
    let cancelled = false;
    fetchTabletDisplaySettings()
      .then((s) => { if (!cancelled) setSettings(s); })
      .catch(() => { /* 기본값 유지 */ });
    return () => { cancelled = true; };
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true);
    try {
      const saved = await saveTabletDisplaySettings(settings);
      setSettings(saved);
      setToast({ type: 'success', message: '전시 설정이 저장되었습니다.' });
    } catch {
      setToast({ type: 'error', message: '전시 설정 저장에 실패했습니다.' });
    } finally {
      setSavingSettings(false);
    }
  }, [settings]);

  // ── 고객 화면 미리보기 (WO-O4O-KPA-TABLET-PREVIEW-V1) ──
  //   kiosk-core 공개 뷰어를 재사용. 저장된 공개 데이터(products/settings) 기준.
  //   V1은 매장 단위 공개 화면 기준(위치별 분리는 후속). 상담 POST 는 차단.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewSettings, setPreviewSettings] = useState<TabletDisplaySettings | undefined>(undefined);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 미리보기 전용 api: products 는 공개 조회, 상담은 실제 전송하지 않고 안내만.
  const previewApi = useMemo<TabletKioskApi>(() => ({
    fetchProducts: (slug, params) => fetchTabletProducts(slug, params),
    submitInterest: async () => {
      throw new Error('미리보기에서는 상담 요청이 전송되지 않습니다.');
    },
    checkStatus: async () => {
      throw new Error('미리보기에서는 상담 요청이 전송되지 않습니다.');
    },
  }), []);

  const handleOpenPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const slug = await getStoreSlug();
      if (!slug) {
        setToast({ type: 'error', message: '매장 공개 주소(slug)를 찾을 수 없어 미리보기를 열 수 없습니다.' });
        return;
      }
      // 저장된 전시 설정 기준(공개 endpoint)
      const saved = await fetchTabletSettings(slug).catch(() => undefined);
      setPreviewSettings(saved);
      setPreviewSlug(slug);
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewSlug(null);
  }, []);

  // Tablet registration form (WO-O4O-STORE-TABLET-REGISTER-UI-V1)
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerLocation, setRegisterLocation] = useState('');
  const [registering, setRegistering] = useState(false);
  const [deletingTabletId, setDeletingTabletId] = useState<string | null>(null);

  // WO-O4O-KPA-STORE-TABLET-DISPLAYS-STANDARD-TABLE-V1: DataTable 행 선택 (bulk delete)
  const [selectedTabletKeys, setSelectedTabletKeys] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load tablets
  useEffect(() => {
    (async () => {
      setLoadingTablets(true);
      try {
        const data = await fetchTablets();
        const active = data.filter((t) => t.is_active);
        setTablets(active);
        if (active.length > 0) {
          setSelectedTabletId(active[0].id);
        }
      } catch (err: any) {
        setError(err.message || '태블릿 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoadingTablets(false);
      }
    })();
  }, []);

  // Load pool + displays + idle playlist when tablet changes
  const loadTabletData = useCallback(async () => {
    if (!selectedTabletId) return;
    setLoadingPool(true);
    setError(null);
    try {
      const [poolData, displayData, idleData] = await Promise.all([
        fetchProductPool(selectedTabletId),
        fetchTabletDisplays(selectedTabletId),
        fetchTabletIdlePlaylist(selectedTabletId).catch(() => [] as IdlePlaylistItem[]),
      ]);
      setPool(poolData);
      setIdleItems(idleData);
      setIdleInitial(idleData);

      // Map display items to entries with product names
      const entries: DisplayEntry[] = displayData.map((d) => {
        let productName = '(알 수 없음)';
        if (d.product_type === 'supplier') {
          const sp = poolData.supplierProducts.find((p) => p.id === d.product_id);
          productName = sp?.product_name || '(삭제된 공급 상품)';
        } else {
          const lp = poolData.localProducts.find((p) => p.id === d.product_id);
          productName = lp?.name || '(삭제된 자체 상품)';
        }
        return {
          productType: d.product_type,
          productId: d.product_id,
          productName,
          sortOrder: d.sort_order,
          isVisible: d.is_visible,
        };
      });
      setDisplays(entries);
      setHasChanges(false);
      setSelectedPoolIds(new Set());
    } catch (err: any) {
      setError(err.message || '태블릿 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoadingPool(false);
    }
  }, [selectedTabletId]);

  useEffect(() => {
    loadTabletData();
  }, [loadTabletData]);

  // Already in display?
  const isInDisplay = (productType: string, productId: string) =>
    displays.some((d) => d.productType === productType && d.productId === productId);

  // Pool items filtered (not already in display)
  const poolItems =
    poolTab === 'supplier'
      ? (pool?.supplierProducts || [])
          .filter((p) => !isInDisplay('supplier', p.id))
          .map((p) => ({ id: p.id, name: p.product_name, type: 'supplier' as const }))
      : (pool?.localProducts || [])
          .filter((p) => !isInDisplay('local', p.id))
          .map((p) => ({ id: p.id, name: p.name, type: 'local' as const }));

  // Toggle pool selection
  const togglePoolItem = (id: string) => {
    setSelectedPoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Add selected to display
  const handleAddToDisplay = () => {
    const newEntries: DisplayEntry[] = [];
    for (const item of poolItems) {
      if (selectedPoolIds.has(item.id)) {
        newEntries.push({
          productType: item.type,
          productId: item.id,
          productName: item.name,
          sortOrder: displays.length + newEntries.length,
          isVisible: true,
        });
      }
    }
    if (newEntries.length > 0) {
      setDisplays((prev) => [...prev, ...newEntries]);
      setSelectedPoolIds(new Set());
      setHasChanges(true);
    }
  };

  // Move item in display
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= displays.length) return;
    const next = [...displays];
    [next[index], next[target]] = [next[target], next[index]];
    setDisplays(next.map((d, i) => ({ ...d, sortOrder: i })));
    setHasChanges(true);
  };

  // Remove item from display
  const removeItem = (index: number) => {
    setDisplays((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, sortOrder: i })));
    setHasChanges(true);
  };

  // Save
  const handleSave = async () => {
    if (!selectedTabletId) return;
    setSaving(true);
    try {
      await saveTabletDisplays(
        selectedTabletId,
        displays.map((d, i) => ({
          productType: d.productType,
          productId: d.productId,
          sortOrder: i,
          isVisible: d.isVisible,
        })),
      );
      setToast({ type: 'success', message: '진열 구성이 저장되었습니다.' });
      setHasChanges(false);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  // WO-O4O-KPA-STORE-TABLET-DISPLAYS-STANDARD-TABLE-V1: bulk delete fan-out
  const handleBulkDeleteTablets = useCallback(async () => {
    if (selectedTabletKeys.length === 0 || bulkDeleting) return;
    if (!window.confirm(`선택한 ${selectedTabletKeys.length}개 태블릿을 삭제하시겠습니까?\n삭제 후에는 해당 진열 구성도 함께 사라집니다.`)) return;
    setBulkDeleting(true);
    try {
      const settled = await Promise.allSettled(selectedTabletKeys.map((id) => deleteTablet(id)));
      const successIds = new Set(selectedTabletKeys.filter((_, i) => settled[i].status === 'fulfilled'));
      if (successIds.size > 0) {
        const remaining = tablets.filter((t) => !successIds.has(t.id));
        setTablets(remaining);
        if (selectedTabletId && successIds.has(selectedTabletId)) {
          setSelectedTabletId(remaining.length > 0 ? remaining[0].id : null);
        }
        setSelectedTabletKeys([]);
        setToast({ type: 'success', message: `${successIds.size}개 태블릿이 삭제되었습니다.` });
      }
      const failCount = settled.filter((r) => r.status === 'rejected').length;
      if (failCount > 0) {
        setToast({ type: 'error', message: `${failCount}개 삭제에 실패했습니다.` });
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedTabletKeys, bulkDeleting, tablets, selectedTabletId]);

  // Idle changes detection (shallow JSON compare)
  const idleHasChanges = JSON.stringify(idleItems) !== JSON.stringify(idleInitial);

  // WO-O4O-TABLET-IDLE-MEDIA-LIBRARY-V1
  // WO-O4O-TABLET-IDLE-LIBRARY-SNAPSHOT-SUPPORT-V1: o4o_asset_snapshots 미디어 병합
  // 매장 자료함의 두 source 를 병합해 image/video LibraryAsset 으로 변환:
  //   1) store_library_items (직접 업로드)
  //   2) o4o_asset_snapshots (Community → Store snapshot copy)
  // runtime 은 url 만 사용 — assetId lookup 없음. 동일 url 은 dedupe 처리.
  const fetchIdleLibraryAssets = useCallback(async (): Promise<LibraryAsset[]> => {
    // (1) store_execution_assets
    const directAssetsP = getStoreExecutionAssets({ limit: 100 }).then((res) => {
      if (!res.success) return [] as LibraryAsset[];
      const items = res.data?.items ?? [];
      const out: LibraryAsset[] = [];
      for (const item of items) {
        const mime = item.mimeType ?? '';
        const isVideo = mime.startsWith('video/');
        const isImage = mime.startsWith('image/');
        if (!isVideo && !isImage) continue;
        const url = item.fileUrl ?? item.url ?? '';
        if (!url) continue;
        const asset: LibraryAsset = {
          id: item.id,
          title: item.title,
          type: isVideo ? 'video' : 'image',
          url,
        };
        if (item.fileUrl) asset.thumbnail = item.fileUrl;
        out.push(asset);
      }
      return out;
    });

    // (2) o4o_asset_snapshots → 미디어 추출
    const snapshotAssetsP = assetSnapshotApi
      .list({ limit: 100 })
      .then((res) => {
        const items = res?.data?.items ?? [];
        const snapshots: SnapshotForMedia[] = items.map((s) => ({
          id: s.id,
          assetType: s.assetType,
          title: s.title,
          contentJson: s.contentJson,
        }));
        return extractSnapshotMediaList(snapshots) as LibraryAsset[];
      })
      .catch(() => [] as LibraryAsset[]);

    const [direct, fromSnapshots] = await Promise.all([directAssetsP, snapshotAssetsP]);

    // dedupe by url (직접 업로드 우선)
    const seen = new Set<string>();
    const merged: LibraryAsset[] = [];
    for (const a of [...direct, ...fromSnapshots]) {
      if (seen.has(a.url)) continue;
      seen.add(a.url);
      merged.push(a);
    }
    return merged;
  }, []);

  // Save idle playlist (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1)
  const handleSaveIdle = async () => {
    if (!selectedTabletId) return;
    setSavingIdle(true);
    try {
      const saved = await saveTabletIdlePlaylist(selectedTabletId, idleItems);
      setIdleItems(saved);
      setIdleInitial(saved);
      setToast({ type: 'success', message: 'Idle 재생 목록이 저장되었습니다.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Idle 저장에 실패했습니다.' });
    } finally {
      setSavingIdle(false);
    }
  };

  // WO-O4O-STORE-TABLET-REGISTER-UI-V1 — 태블릿 등록
  const handleRegister = async () => {
    if (!registerName.trim()) return;
    setRegistering(true);
    try {
      const created = await createTablet(registerName.trim(), registerLocation.trim() || undefined);
      setTablets((prev) => [...prev, created]);
      setSelectedTabletId(created.id);
      setRegisterName('');
      setRegisterLocation('');
      setShowRegisterForm(false);
      setToast({ type: 'success', message: `태블릿 "${created.name}"이 등록되었습니다.` });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || '태블릿 등록에 실패했습니다.' });
    } finally {
      setRegistering(false);
    }
  };

  // WO-O4O-STORE-TABLET-REGISTER-UI-V1 — 태블릿 삭제(비활성화)
  const handleDeleteTablet = async (id: string, name: string) => {
    if (!confirm(`"${name}" 태블릿을 삭제하시겠습니까?\n삭제 후에는 진열 구성도 함께 사라집니다.`)) return;
    setDeletingTabletId(id);
    try {
      await deleteTablet(id);
      const remaining = tablets.filter((t) => t.id !== id);
      setTablets(remaining);
      if (selectedTabletId === id) {
        setSelectedTabletId(remaining.length > 0 ? remaining[0].id : null);
      }
      setToast({ type: 'success', message: `태블릿 "${name}"이 삭제되었습니다.` });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || '삭제에 실패했습니다.' });
    } finally {
      setDeletingTabletId(null);
    }
  };

  // WO-O4O-KPA-STORE-TABLET-DISPLAYS-STANDARD-TABLE-V1: 태블릿 목록 DataTable 컬럼 정의
  const tabletColumns = useMemo<Column<TabletType>[]>(() => [
    {
      key: 'name',
      title: '태블릿명',
      render: (_v, t) => (
        <span style={{ fontWeight: t.id === selectedTabletId ? 700 : 500, color: '#0f172a' }}>
          {t.name}
        </span>
      ),
    },
    {
      key: 'location',
      title: '위치',
      render: (_v, t) => (
        <span style={{ color: t.location ? '#334155' : '#94a3b8' }}>
          {t.location || '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '등록일',
      render: (_v, t) => (
        <span style={{ color: '#64748b', fontSize: '13px' }}>
          {new Date(t.created_at).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'action',
      title: '액션',
      align: 'center' as const,
      width: '80px',
      render: (_v, t) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteTablet(t.id, t.name); }}
          disabled={deletingTabletId === t.id || bulkDeleting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
            color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca',
            cursor: 'pointer', opacity: deletingTabletId === t.id ? 0.5 : 1,
          }}
          title="태블릿 삭제"
        >
          {deletingTabletId === t.id
            ? <Loader2 style={{ width: 12, height: 12 }} />
            : <X style={{ width: 12, height: 12 }} />}
          삭제
        </button>
      ),
    },
  ], [selectedTabletId, deletingTabletId, bulkDeleting, handleDeleteTablet]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/store/commerce/local-products')}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Tablet className="w-7 h-7 text-teal-600" />
              태블릿 진열 관리
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              취급 중인 O4O 제품에 등록된 제품을 타블렛별로 선택해 진열합니다. 타블렛은 주문 채널이 아니라 매장 내 제품 안내·상담 유도 화면입니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* WO-O4O-KPA-TABLET-PREVIEW-V1: 고객 화면 미리보기 (타블렛 선택 시) */}
          <button
            onClick={handleOpenPreview}
            disabled={!selectedTabletId || previewLoading}
            title={selectedTabletId ? '고객 화면 미리보기' : '미리보기를 보려면 먼저 타블렛을 선택해 주세요.'}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tv className="w-4 h-4" />}
            고객 화면 미리보기
          </button>
          {/* WO-O4O-STORE-TABLET-REGISTER-UI-V1: 목록 있을 때도 추가 버튼 */}
          <button
            onClick={() => setShowRegisterForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            태블릿 추가
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-600/25"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      {/* Loading */}
      {loadingTablets && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <span className="ml-3 text-slate-400">태블릿 로딩 중...</span>
        </div>
      )}

      {/* WO-O4O-STORE-TABLET-REGISTER-UI-V1: 인라인 등록 폼 — empty/non-empty 공용 */}
      {!loadingTablets && showRegisterForm && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-teal-100">
          <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-teal-700">새 태블릿 추가</h3>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  태블릿 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  placeholder="예: 카운터 태블릿"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={registering}
                  autoFocus
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  위치 <span className="text-slate-400">(선택)</span>
                </label>
                <input
                  type="text"
                  value={registerLocation}
                  onChange={(e) => setRegisterLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  placeholder="예: 1층 카운터"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={registering}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => { setShowRegisterForm(false); setRegisterName(''); setRegisterLocation(''); }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                disabled={registering}
              >
                취소
              </button>
              <button
                onClick={handleRegister}
                disabled={registering || !registerName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {registering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {registering ? '등록 중...' : '태블릿 추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No tablets */}
      {!loadingTablets && tablets.length === 0 && !showRegisterForm && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <Tablet className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">등록된 태블릿이 없습니다</h3>
          <p className="text-slate-500 mb-4">태블릿을 추가하면 진열 구성을 시작할 수 있습니다.</p>
          <button
            onClick={() => setShowRegisterForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 태블릿 추가
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tablet list DataTable + editor */}
      {!loadingTablets && tablets.length > 0 && (
        <>
          {/* WO-O4O-KPA-STORE-TABLET-DISPLAYS-STANDARD-TABLE-V1: 태블릿 목록 DataTable */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Tablet className="w-4 h-4 text-teal-600" />
                태블릿 목록 ({tablets.length})
              </h3>
              {hasChanges && (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                  변경사항 있음
                </span>
              )}
            </div>
            <ActionBar
              selectedCount={selectedTabletKeys.length}
              onClearSelection={() => setSelectedTabletKeys([])}
              actions={[
                {
                  key: 'delete',
                  label: '삭제',
                  icon: <X className="w-4 h-4" />,
                  variant: 'danger',
                  onClick: handleBulkDeleteTablets,
                  disabled: bulkDeleting,
                },
              ]}
            />
            <DataTable<TabletType>
              columns={tabletColumns}
              dataSource={tablets}
              rowKey="id"
              rowSelection={{
                selectedRowKeys: selectedTabletKeys,
                onChange: setSelectedTabletKeys,
              }}
              onRowClick={(t) => setSelectedTabletId(t.id)}
              onRow={(t) => ({
                className: t.id === selectedTabletId ? 'bg-teal-50' : '',
              })}
              emptyText="등록된 태블릿이 없습니다"
            />
          </div>

          {/* Loading pool */}
          {loadingPool && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              <span className="ml-3 text-slate-400">데이터 로딩 중...</span>
            </div>
          )}

          {/* Idle Playlist Editor (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1) */}
          {!loadingPool && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-700">Idle 재생 목록</h3>
                  {idleHasChanges && (
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">
                      변경사항 있음
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSaveIdle}
                  disabled={!idleHasChanges || savingIdle}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingIdle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Idle 저장
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 mb-3">
                  매장이 일정 시간 사용되지 않을 때 태블릿이 자동으로 보여줄 이미지/영상 목록입니다.
                  고객이 화면을 터치하면 즉시 상품 안내 화면으로 돌아갑니다.
                </p>
                <IdlePlaylistEditor
                  items={idleItems}
                  onChange={setIdleItems}
                  disabled={savingIdle}
                  fetchLibraryAssets={fetchIdleLibraryAssets}
                />
              </div>
            </div>
          )}

          {/* 전시 설정 (WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1) — 매장 공통 */}
          {!loadingPool && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">전시 설정</h3>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  전시 설정 저장
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-slate-500">
                  타블렛 고객 화면에서 가격, QR, 상담 버튼, 자동 전환 방식을 설정합니다. 매장의 모든 타블렛에 공통 적용됩니다.
                </p>

                {/* 토글: 가격 / QR / 상담 버튼 */}
                {([
                  { key: 'showPrice', label: '가격 표시', desc: '타블렛 고객 화면에 제품 가격을 표시합니다.' },
                  { key: 'showQr', label: 'QR 표시', desc: '제품 상세·모바일 확인용 QR을 표시합니다.' },
                  { key: 'showConsultationButton', label: '상담 요청 버튼', desc: '상담 요청은 주문이 아니며, 고객이 관심을 표시하면 약국 근무자에게 알림이 전송됩니다.' },
                ] as const).map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start justify-between gap-3 cursor-pointer">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-800">{label}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
                      className="mt-1 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                  </label>
                ))}

                {/* 자동 넘김 시간 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800">자동 넘김 시간</span>
                    <p className="text-xs text-slate-400 mt-0.5">제품·안내 화면이 자동으로 넘어가는 시간입니다.</p>
                  </div>
                  <select
                    value={settings.autoSlideSeconds}
                    onChange={(e) => setSettings((s) => ({ ...s, autoSlideSeconds: Number(e.target.value) }))}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:ring-teal-500"
                  >
                    <option value={0}>사용 안 함</option>
                    <option value={5}>5초</option>
                    <option value={10}>10초</option>
                    <option value={15}>15초</option>
                    <option value={30}>30초</option>
                  </select>
                </div>

                {/* Idle 화면 전환 시간 */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800">Idle 화면 전환 시간</span>
                    <p className="text-xs text-slate-400 mt-0.5">사용하지 않을 때 재생되는 이미지·영상의 전환 시간입니다. (영상은 재생 시간 우선)</p>
                  </div>
                  <select
                    value={settings.idleSlideSeconds}
                    onChange={(e) => setSettings((s) => ({ ...s, idleSlideSeconds: Number(e.target.value) }))}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:ring-teal-500"
                  >
                    <option value={5}>5초</option>
                    <option value={10}>10초</option>
                    <option value={15}>15초</option>
                    <option value={30}>30초</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Editor */}
          {!loadingPool && pool && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Product Pool */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  {/* WO-O4O-KPA-TABLET-STORE-PRODUCT-LINKING-V1: 취급 중인 O4O 제품 ↔ 타블렛 진열 연결 명시 */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-700">진열할 제품 선택</h3>
                    <button
                      type="button"
                      onClick={() => navigate('/store/my-products')}
                      className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap"
                    >
                      취급 중인 O4O 제품 관리 →
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    취급 중인 O4O 제품에 등록된 제품을 선택해 이 타블렛에 진열합니다.
                  </p>
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={() => { setPoolTab('supplier'); setSelectedPoolIds(new Set()); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        poolTab === 'supplier'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      취급 중인 O4O 제품 ({pool.supplierProducts.filter((p) => !isInDisplay('supplier', p.id)).length})
                    </button>
                    <button
                      onClick={() => { setPoolTab('local'); setSelectedPoolIds(new Set()); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        poolTab === 'local'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      매장 경영활용 제품 ({pool.localProducts.filter((p) => !isInDisplay('local', p.id)).length})
                    </button>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {poolItems.length === 0 ? (
                    <div className="py-8 px-4 text-center text-sm text-slate-400">
                      {poolTab === 'supplier' ? (
                        <>
                          <p>타블렛에 진열할 취급 중인 O4O 제품이 없습니다.</p>
                          <p className="mt-1">취급 중인 O4O 제품을 먼저 등록한 뒤 타블렛에 배치해 주세요.</p>
                          <button
                            type="button"
                            onClick={() => navigate('/store/my-products')}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700"
                          >
                            <Plus className="w-3.5 h-3.5" /> 취급 중인 O4O 제품 등록
                          </button>
                        </>
                      ) : (
                        <>
                          <p>타블렛에 진열할 매장 경영활용 제품이 없습니다.</p>
                          <p className="mt-1">매장 경영활용 제품을 먼저 등록한 뒤 타블렛에 배치해 주세요.</p>
                          <button
                            type="button"
                            onClick={() => navigate('/store/commerce/local-products')}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700"
                          >
                            <Plus className="w-3.5 h-3.5" /> 매장 경영활용 제품 등록
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {poolItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPoolIds.has(item.id)}
                            onChange={() => togglePoolItem(item.id)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-900 truncate block">{item.name}</span>
                          </div>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              item.type === 'supplier'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {item.type === 'supplier' ? '내 매장' : '자체'}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {selectedPoolIds.size > 0 && (
                  <div className="px-4 py-3 border-t">
                    <button
                      onClick={handleAddToDisplay}
                      className="flex items-center gap-2 w-full justify-center px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
                    >
                      <Plus className="w-4 h-4" />
                      {selectedPoolIds.size}개 항목 추가
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Current Display */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-700">
                    현재 진열 구성 ({displays.length})
                  </h3>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {displays.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      이 타블렛에 진열된 제품이 없습니다. 왼쪽에서 제품을 선택해 추가하세요.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {displays.map((entry, index) => (
                        <div
                          key={`${entry.productType}-${entry.productId}`}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
                        >
                          <span className="text-xs text-slate-400 w-5 text-right">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-900 truncate block">
                              {entry.productName}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                              entry.productType === 'supplier'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {entry.productType === 'supplier' ? '공급' : '자체'}
                          </span>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => moveItem(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                              title="위로"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveItem(index, 'down')}
                              disabled={index === displays.length - 1}
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                              title="아래로"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeItem(index)}
                              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                              title="제거"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 고객 화면 미리보기 오버레이 (WO-O4O-KPA-TABLET-PREVIEW-V1) */}
      {previewOpen && previewSlug && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
          {/* 상단 안내 + 닫기 (kiosk fullscreen 위에 표시) */}
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100001 }}
            className="flex items-center justify-between gap-3 bg-slate-900/90 text-white px-4 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">타블렛 고객 화면 미리보기</p>
              <p className="text-[11px] text-slate-300 truncate">
                현재 저장된 타블렛 구성·전시 설정 기준 (매장 공개 화면 기준 — 위치별 타블렛 분리는 후속). 상담 요청은 전송되지 않습니다.
              </p>
            </div>
            <button
              onClick={handleClosePreview}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              <X className="w-4 h-4" /> 닫기
            </button>
          </div>
          {/* kiosk-core 재사용 (Router 중첩 금지 → slug prop 직접 주입) */}
          <div style={{ position: 'absolute', top: 48, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
            <TabletKioskPage
              api={previewApi}
              slug={previewSlug}
              displaySettings={previewSettings}
              showQrBadge={previewSettings?.showQr !== false}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium"
          style={{
            backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
            borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
            color: toast.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </div>
  );
}
