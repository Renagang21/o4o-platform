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

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Tablet, ChevronUp, ChevronDown, X, Plus,
  ArrowLeft, Save, Package, ShoppingBag, AlertTriangle, Tv,
} from 'lucide-react';
import { IdlePlaylistEditor, type IdlePlaylistItem, type LibraryAsset } from '@o4o/tablet-kiosk-core';
import { getStoreLibraryItems } from '../../api/storeLibrary';
import {
  fetchTablets,
  fetchTabletDisplays,
  fetchProductPool,
  saveTabletDisplays,
  fetchTabletIdlePlaylist,
  saveTabletIdlePlaylist,
} from '../../api/tabletDisplays';
import type { Tablet as TabletType, ProductPool } from '../../api/tabletDisplays';

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

  // Idle changes detection (shallow JSON compare)
  const idleHasChanges = JSON.stringify(idleItems) !== JSON.stringify(idleInitial);

  // WO-O4O-TABLET-IDLE-MEDIA-LIBRARY-V1
  // 매장 자료함의 image/video 자산만 가져와 LibraryAsset 으로 변환.
  // store_library_items 의 mime_type 기반 필터링. runtime 은 url 만 사용 — assetId lookup 없음.
  const fetchIdleLibraryAssets = useCallback(async (): Promise<LibraryAsset[]> => {
    const res = await getStoreLibraryItems({ limit: 100 });
    if (!res.success) return [];
    const items = res.data?.items ?? [];
    return items
      .map((item) => {
        const mime = item.mimeType ?? '';
        const isVideo = mime.startsWith('video/');
        const isImage = mime.startsWith('image/');
        if (!isVideo && !isImage) return null;
        const url = item.fileUrl ?? item.url ?? '';
        if (!url) return null;
        return {
          id: item.id,
          title: item.title,
          type: isVideo ? ('video' as const) : ('image' as const),
          url,
          thumbnail: item.fileUrl ?? undefined,
        };
      })
      .filter((a): a is LibraryAsset => a !== null);
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
              태블릿에 표시할 상품을 구성합니다. 공급 상품과 자체 상품을 혼합할 수 있습니다.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-600/25"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          저장
        </button>
      </div>

      {/* Loading */}
      {loadingTablets && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <span className="ml-3 text-slate-400">태블릿 로딩 중...</span>
        </div>
      )}

      {/* No tablets */}
      {!loadingTablets && tablets.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <Tablet className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">등록된 태블릿이 없습니다</h3>
          <p className="text-slate-500">매장에 태블릿을 먼저 등록해 주세요.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tablet selector + editor */}
      {!loadingTablets && tablets.length > 0 && (
        <>
          {/* Tablet selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">태블릿:</label>
            <select
              value={selectedTabletId || ''}
              onChange={(e) => setSelectedTabletId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {tablets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.location ? `(${t.location})` : ''}
                </option>
              ))}
            </select>
            {hasChanges && (
              <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                변경사항 있음
              </span>
            )}
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

          {/* Editor */}
          {!loadingPool && pool && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Product Pool */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-700">상품 풀</h3>
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
                      공급 상품 ({pool.supplierProducts.filter((p) => !isInDisplay('supplier', p.id)).length})
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
                      자체 상품 ({pool.localProducts.filter((p) => !isInDisplay('local', p.id)).length})
                    </button>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {poolItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      {poolTab === 'supplier'
                        ? '추가 가능한 공급 상품이 없습니다.'
                        : '추가 가능한 자체 상품이 없습니다.'}
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
                            {item.type === 'supplier' ? '공급' : '자체'}
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
                      진열할 상품이 없습니다. 왼쪽 상품 풀에서 추가하세요.
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
