/**
 * useStoreTabletDisplays — 태블릿 진열 화면 상태 hook
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 *
 * 두 서비스가 동일하게 갖고 있던 tablet 선택 · pool/display 로드 · 선택 · 정렬 ·
 * 저장 · idle playlist · toast/error 상태를 한 단위로 모은다.
 * idle 항목 타입은 서비스(@o4o/tablet-kiosk-core)의 것을 그대로 쓰도록 제네릭으로 둔다.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  buildDisplayEntries,
  buildPoolCandidates,
  hasIdleChanges,
  moveEntry,
  removeEntryAt,
  toDisplaySavePayload,
} from './tabletHelpers';
import type {
  StoreTabletDisplaysApi,
  StoreTabletProductPool,
  StoreTabletSummary,
  TabletDisplayEntry,
} from './types';

export interface TabletToastState {
  type: 'success' | 'error';
  message: string;
}

export function useStoreTabletDisplays<TIdleItem>(api: StoreTabletDisplaysApi<TIdleItem>) {
  const [tablets, setTablets] = useState<StoreTabletSummary[]>([]);
  const [selectedTabletId, setSelectedTabletId] = useState<string | null>(null);
  const [loadingTablets, setLoadingTablets] = useState(true);

  const [pool, setPool] = useState<StoreTabletProductPool | null>(null);
  const [displays, setDisplays] = useState<TabletDisplayEntry[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [poolTab, setPoolTab] = useState<'supplier' | 'local'>('supplier');
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set());

  const [idleItems, setIdleItems] = useState<TIdleItem[]>([]);
  const [idleInitial, setIdleInitial] = useState<TIdleItem[]>([]);
  const [savingIdle, setSavingIdle] = useState(false);

  const [toast, setToast] = useState<TabletToastState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Toast auto-clear (기존 3초 동작 유지)
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // 태블릿 목록 — 활성만 노출하고 첫 항목을 선택한다(기존 동작).
  useEffect(() => {
    (async () => {
      setLoadingTablets(true);
      try {
        const data = await api.fetchTablets();
        const active = data.filter((t) => t.is_active);
        setTablets(active);
        if (active.length > 0) setSelectedTabletId(active[0].id);
      } catch (err: any) {
        setError(err?.message || '태블릿 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoadingTablets(false);
      }
    })();
    // api 는 서비스에서 모듈 상수로 주입된다 — 최초 1회만 로드(기존 동작).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTabletData = useCallback(async () => {
    if (!selectedTabletId) return;
    setLoadingPool(true);
    setError(null);
    try {
      const [poolData, displayData, idleData] = await Promise.all([
        api.fetchProductPool(selectedTabletId),
        api.fetchTabletDisplays(selectedTabletId),
        api.fetchTabletIdlePlaylist(selectedTabletId).catch(() => [] as TIdleItem[]),
      ]);
      setPool(poolData);
      setIdleItems(idleData);
      setIdleInitial(idleData);
      setDisplays(buildDisplayEntries(displayData, poolData));
      setHasChanges(false);
      setSelectedPoolIds(new Set());
    } catch (err: any) {
      setError(err?.message || '태블릿 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoadingPool(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTabletId]);

  useEffect(() => {
    loadTabletData();
  }, [loadTabletData]);

  const poolItems = buildPoolCandidates(pool, poolTab, displays);

  const changePoolTab = (tab: 'supplier' | 'local') => {
    setPoolTab(tab);
    setSelectedPoolIds(new Set());
  };

  const togglePoolItem = (id: string) => {
    setSelectedPoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedToDisplay = () => {
    const newEntries: TabletDisplayEntry[] = [];
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
    if (newEntries.length === 0) return;
    setDisplays((prev) => [...prev, ...newEntries]);
    setSelectedPoolIds(new Set());
    setHasChanges(true);
  };

  const moveDisplayItem = (index: number, direction: 'up' | 'down') => {
    setDisplays((prev) => {
      const next = moveEntry(prev, index, direction);
      if (next !== prev) setHasChanges(true);
      return next;
    });
  };

  const removeDisplayItem = (index: number) => {
    setDisplays((prev) => removeEntryAt(prev, index));
    setHasChanges(true);
  };

  const saveDisplays = async () => {
    if (!selectedTabletId) return;
    setSaving(true);
    try {
      await api.saveTabletDisplays(selectedTabletId, toDisplaySavePayload(displays));
      setToast({ type: 'success', message: '진열 구성이 저장되었습니다.' });
      setHasChanges(false);
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const idleChanged = hasIdleChanges(idleItems, idleInitial);

  const saveIdle = async () => {
    if (!selectedTabletId) return;
    setSavingIdle(true);
    try {
      const saved = await api.saveTabletIdlePlaylist(selectedTabletId, idleItems);
      setIdleItems(saved);
      setIdleInitial(saved);
      setToast({ type: 'success', message: 'Idle 재생 목록이 저장되었습니다.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Idle 저장에 실패했습니다.' });
    } finally {
      setSavingIdle(false);
    }
  };

  return {
    tablets, selectedTabletId, setSelectedTabletId, loadingTablets,
    pool, displays, loadingPool, saving, hasChanges,
    poolTab, changePoolTab, poolItems, selectedPoolIds, togglePoolItem,
    addSelectedToDisplay, moveDisplayItem, removeDisplayItem, saveDisplays,
    idleItems, setIdleItems, idleChanged, savingIdle, saveIdle,
    toast, setToast, error,
    reload: loadTabletData,
  };
}
