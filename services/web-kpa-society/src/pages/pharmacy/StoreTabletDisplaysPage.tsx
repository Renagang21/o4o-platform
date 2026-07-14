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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Tablet, ChevronUp, ChevronDown, X, Plus, Info,
  ArrowLeft, Save, Package, ShoppingBag, AlertTriangle, Tv,
} from 'lucide-react';
import {
  IdlePlaylistEditor, TabletKioskPage,
  type IdlePlaylistItem, type LibraryAsset, type TabletKioskApi,
} from '@o4o/tablet-kiosk-core';
// WO-O4O-KPA-TABLET-PREVIEW-V1: 공개 뷰어 재사용 미리보기 — 공개 데이터 조회 + 매장 slug
import { fetchTabletProducts, fetchTabletSettings, fetchTabletScreen } from '../../api/tablet';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { extractSnapshotMediaList, type SnapshotForMedia } from '@o4o/store-asset-policy-core';
import { getStoreExecutionAssets } from '../../api/storeExecutionAssets';
import { assetSnapshotApi, handledProductContentApi, type LinkedContentItem } from '../../api/assetSnapshot';
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
  // WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1
  fetchOperatorCommonIdleCandidates,
  fetchOperatorCommonIdleSelection,
  selectOperatorCommonIdle,
  clearOperatorCommonIdle,
  type OperatorCommonIdleCandidate,
  type OperatorCommonIdleSelection,
  // WO-O4O-KPA-TABLET-TOUCH-FIRST-CORNER-HOME-V1: 코너 카드 홈에 현재 화면 세트명/블록수 표시용.
  fetchScreenSets,
} from '../../api/tabletDisplays';
import type { Tablet as TabletType, ProductPool, TabletDisplaySettings } from '../../api/tabletDisplays';
// WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1: 화면 세트 관리 UI
import TabletScreenSetManager from './TabletScreenSetManager';

// ==================== Types ====================

interface DisplayEntry {
  productType: 'supplier' | 'local';
  productId: string;
  productName: string;
  sortOrder: number;
  isVisible: boolean;
  // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열별 선택 콘텐츠(null=선택 안 함). 기본 콘텐츠 미지정.
  contentId: string | null;
}

// 콘텐츠 상태 → 한글 라벨 (workspace_status)
const CONTENT_STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_ai: 'AI 대기',
  ai_processed: 'AI 처리됨',
  ready_curation: '큐레이션 준비',
  archived: '보관됨',
};

function contentOptionLabel(it: LinkedContentItem): string {
  const status = CONTENT_STATUS_LABEL[it.status] ?? it.status;
  const date = (() => {
    const d = new Date(it.updatedAt);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ko-KR');
  })();
  return [it.title || '(제목 없음)', status, date].filter(Boolean).join(' · ');
}

// ==================== Component ====================

export default function StoreTabletDisplaysPage() {
  const navigate = useNavigate();

  // WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1: 두 업무를 탭으로 분리.
  //   'corners'  = 코너별 운영(코너 선택 → 현재 콘텐츠 · 교체 · 화면 열기)
  //   'contents' = 태블릿 콘텐츠(화면 세트 = 콘텐츠 원본 목록 · 수정 · 보관)
  const [activeTab, setActiveTab] = useState<'corners' | 'contents'>('corners');
  // 코너 상세의 legacy 실행 편집기(대기화면·화면설정·진열·공통영상)는 primary 에서 접이식 '고급 설정'으로.
  //   공개 뷰어가 아직 화면 세트를 소비하지 않아 legacy 가 실제 고객 화면을 결정하므로 제거하지 않고 보존한다.
  const [showAdvanced, setShowAdvanced] = useState(false);

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
  // WO-O4O-KPA-TABLET-OPERATION-GUIDE-MODAL-V1: 상단 상시 안내 박스 → 버튼+모달.
  const [showGuide, setShowGuide] = useState(false);
  // WO-O4O-KPA-TABLET-TOUCH-FIRST-CORNER-HOME-V1: currentScreenSetId → {name, blockCount} 인덱스(코너 카드 표시용).
  const [screenSetIndex, setScreenSetIndex] = useState<Record<string, { name: string; blockCount: number }>>({});
  // WO-O4O-KPA-TABLET-TOUCH-FIRST-TABLET-CONNECT-FLOW-V1: 실행 주소 원문은 기본 숨김(보조 토글).
  const [showRunUrl, setShowRunUrl] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchScreenSets()
      .then((sets) => {
        if (cancelled) return;
        const idx: Record<string, { name: string; blockCount: number }> = {};
        for (const s of sets) idx[s.id] = { name: s.name, blockCount: s.blockCount ?? 0 };
        setScreenSetIndex(idx);
      })
      .catch(() => { /* 코너 카드 부가정보 실패는 무시(카드 자체는 표시) */ });
    return () => { cancelled = true; };
  }, [tablets.length]);
  useEffect(() => {
    if (!showGuide) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowGuide(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGuide]);

  // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열 제품별 연결 콘텐츠 후보(by-product) 캐시.
  const [contentCandidates, setContentCandidates] = useState<Record<string, LinkedContentItem[]>>({});
  const contentCandidatesRef = useRef(contentCandidates);
  contentCandidatesRef.current = contentCandidates;

  // Pool tab
  const [poolTab, setPoolTab] = useState<'supplier' | 'local'>('supplier');
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set());

  // Idle playlist state (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1)
  const [idleItems, setIdleItems] = useState<IdlePlaylistItem[]>([]);
  const [idleInitial, setIdleInitial] = useState<IdlePlaylistItem[]>([]);
  const [savingIdle, setSavingIdle] = useState(false);

  // Display settings state (WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1) — 매장 공통
  // WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1:
  //   태블릿 V1 = 공용 안내 화면. 상담 요청 버튼 기본 OFF(후속 기능).
  const [settings, setSettings] = useState<TabletDisplaySettings>({
    showPrice: true,
    showQr: true,
    showConsultationButton: false,
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

  // WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1:
  //   코너별 태블릿 공개 URL(?tabletId=). 매장 slug 는 한 번 조회해 보관.
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getStoreSlug().then((s) => { if (!cancelled) setStoreSlug(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  // 미리보기가 열릴 때 대상 tabletId(선택 태블릿). previewApi 재생성을 피하려 ref 사용.
  const previewTabletIdRef = useRef<string | null>(null);

  const publicTabletUrl = (tabletId: string): string => {
    const base = (import.meta.env.VITE_KPA_WEB_ORIGIN as string | undefined) || window.location.origin;
    return `${base}/tablet/${encodeURIComponent(storeSlug ?? '')}?tabletId=${tabletId}`;
  };

  // WO-O4O-KPA-TABLET-TOUCH-FIRST-TABLET-CONNECT-FLOW-V1: 실행 액션(신규 API/pairing 없음 — 기존 URL 재사용).
  //   화면 열기 = 공개 viewer 새 탭. 팝업 차단/ slug 부재 시 안내.
  const handleOpenTabletScreen = (tabletId: string) => {
    if (!storeSlug) { setToast({ type: 'error', message: '태블릿 실행 주소를 만들 수 없습니다. 매장 기본 정보를 먼저 확인해 주세요.' }); return; }
    const w = window.open(publicTabletUrl(tabletId), '_blank', 'noopener,noreferrer');
    if (!w) setToast({ type: 'error', message: '팝업이 차단되어 화면을 열지 못했습니다. 주소를 복사해 태블릿에서 직접 열어 주세요.' });
  };
  const handleCopyTabletUrl = (tabletId: string) => {
    if (!storeSlug) { setToast({ type: 'error', message: '태블릿 실행 주소를 만들 수 없습니다. 매장 기본 정보를 먼저 확인해 주세요.' }); return; }
    navigator.clipboard?.writeText(publicTabletUrl(tabletId))
      .then(() => setToast({ type: 'success', message: '태블릿 실행 주소가 복사되었습니다.' }))
      .catch(() => setToast({ type: 'error', message: '주소를 복사하지 못했습니다. 직접 열어 다시 시도해 주세요.' }));
  };

  // WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1: 서비스 공통 대기 영상(태블릿별 1개 선택)
  const [ocSelection, setOcSelection] = useState<OperatorCommonIdleSelection | null>(null);
  const [ocModalOpen, setOcModalOpen] = useState(false);
  const [ocCandidates, setOcCandidates] = useState<OperatorCommonIdleCandidate[]>([]);
  const [ocLoading, setOcLoading] = useState(false);
  const [ocBusy, setOcBusy] = useState(false);

  useEffect(() => {
    if (!selectedTabletId) { setOcSelection(null); return; }
    let cancelled = false;
    fetchOperatorCommonIdleSelection(selectedTabletId)
      .then((s) => { if (!cancelled) setOcSelection(s); })
      .catch(() => { if (!cancelled) setOcSelection(null); });
    return () => { cancelled = true; };
  }, [selectedTabletId]);

  const openOcModal = useCallback(async () => {
    setOcModalOpen(true);
    setOcLoading(true);
    try {
      setOcCandidates(await fetchOperatorCommonIdleCandidates());
    } catch {
      setOcCandidates([]);
    } finally {
      setOcLoading(false);
    }
  }, []);

  const handleOcSelect = useCallback(async (forcedContentId: string) => {
    if (!selectedTabletId || ocBusy) return;
    setOcBusy(true);
    try {
      await selectOperatorCommonIdle(selectedTabletId, forcedContentId);
      setOcSelection(await fetchOperatorCommonIdleSelection(selectedTabletId));
      setOcModalOpen(false);
      setToast({ type: 'success', message: '서비스 공통 대기 영상이 선택되었습니다.' });
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '선택에 실패했습니다.' });
    } finally {
      setOcBusy(false);
    }
  }, [selectedTabletId, ocBusy]);

  const handleOcClear = useCallback(async () => {
    if (!selectedTabletId || ocBusy) return;
    setOcBusy(true);
    try {
      await clearOperatorCommonIdle(selectedTabletId);
      setOcSelection(null);
      setToast({ type: 'success', message: '선택이 해제되었습니다.' });
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || '해제에 실패했습니다.' });
    } finally {
      setOcBusy(false);
    }
  }, [selectedTabletId, ocBusy]);

  const ocStatusLabel: Record<string, string> = {
    active: '방영 중', upcoming: '방영 예정', expired: '기간 만료', unavailable: '사용 불가',
  };

  // 미리보기 전용 api: products 는 공개 조회, 상담은 실제 전송하지 않고 안내만.
  const previewApi = useMemo<TabletKioskApi>(() => ({
    fetchProducts: (slug, params) =>
      fetchTabletProducts(slug, { ...params, tabletId: previewTabletIdRef.current ?? undefined }),
    submitInterest: async () => {
      throw new Error('미리보기에서는 상담 요청이 전송되지 않습니다.');
    },
    checkStatus: async () => {
      throw new Error('미리보기에서는 상담 요청이 전송되지 않습니다.');
    },
    // WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1: 미리보기도 적용 screen set 반영
    fetchScreen: (slug) => fetchTabletScreen(slug, previewTabletIdRef.current ?? undefined),
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
      previewTabletIdRef.current = selectedTabletId; // 선택 태블릿 기준으로 미리보기
      setPreviewSettings(saved);
      setPreviewSlug(slug);
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedTabletId]);

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
          contentId: d.contentId ?? null,
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

  // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1:
  //   진열 제품별 연결 콘텐츠 후보를 by-product 로 조회(캐시). supplier↔listing / local↔local 매핑.
  const displayKeysStr = useMemo(
    () => Array.from(new Set(displays.map((d) => `${d.productType}:${d.productId}`))).join('|'),
    [displays],
  );
  useEffect(() => {
    const keys = displayKeysStr ? displayKeysStr.split('|') : [];
    const missing = keys.filter((k) => !(k in contentCandidatesRef.current));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        missing.map(async (k) => {
          const [ptype, pid] = k.split(':');
          const sourceType = ptype === 'supplier' ? 'listing' : 'local';
          try {
            const res = await handledProductContentApi.byProduct(sourceType, pid);
            return [k, res?.data?.items ?? []] as const;
          } catch {
            return [k, [] as LinkedContentItem[]] as const;
          }
        }),
      );
      if (cancelled) return;
      setContentCandidates((prev) => {
        const next = { ...prev };
        results.forEach(([k, v]) => { next[k] = v; });
        return next;
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayKeysStr]);

  // 진열 항목 선택 콘텐츠 변경(null=선택 안 함). 콘텐츠가 1개여도 자동 선택하지 않는다(직접 선택).
  const setContentForIndex = useCallback((index: number, contentId: string | null) => {
    setDisplays((prev) => prev.map((d, i) => (i === index ? { ...d, contentId } : d)));
    setHasChanges(true);
  }, []);

  // 후보 로드 후, 더 이상 연결되지 않은(unlink) 선택 콘텐츠는 자동 해제 → 저장 시 400 방지 + 폴백 정합.
  useEffect(() => {
    setDisplays((prev) => {
      let changed = false;
      const next = prev.map((d) => {
        if (!d.contentId) return d;
        const cands = contentCandidates[`${d.productType}:${d.productId}`];
        if (cands && !cands.some((c) => c.contentId === d.contentId)) {
          changed = true;
          return { ...d, contentId: null };
        }
        return d;
      });
      return changed ? next : prev;
    });
  }, [contentCandidates]);

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
          contentId: null,
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
          contentId: d.contentId,
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

  // WO-O4O-KPA-TABLET-LOCATION-FIRST-UX-REFIT-V1: 위치/코너 우선 정렬 (같은 위치끼리 묶임, 위치 없는 태블릿은 뒤로)
  const sortedTablets = useMemo(
    () =>
      [...tablets].sort(
        (a, b) =>
          (a.location?.trim() || '￿').localeCompare(b.location?.trim() || '￿', 'ko') ||
          a.name.localeCompare(b.name, 'ko'),
      ),
    [tablets],
  );
  // 위치/코너 표시명: location 우선, 없으면 name
  const cornerPrimary = (t: TabletType) => t.location?.trim() || t.name;
  const cornerSecondary = (t: TabletType) => (t.location?.trim() ? t.name : null);
  const selectedTablet = tablets.find((t) => t.id === selectedTabletId) ?? null;

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
              태블릿 상품 안내 관리
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              크롬 태블릿에서 실행되는 매장 공용 안내 화면입니다. 태블릿에 보여줄 상품과 상세 설명, 대기 화면을 구성합니다. 주문 채널이 아니라 매장 내 제품·코너 안내 화면입니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1: 헤더 간소화 —
              고객 화면 미리보기(상단) 제거 · 코너 추가/저장 은 각 탭의 맥락 버튼으로 이동.
              운영 안내(도움말)만 상단 유지. */}
          {/* WO-O4O-KPA-TABLET-OPERATION-GUIDE-MODAL-V1: 상단 상시 안내 → 버튼(모달) */}
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Info className="w-4 h-4 text-sky-600" />
            운영 안내
          </button>
        </div>
      </div>

      {/* WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1: 상단 탭 — 코너별 운영 / 태블릿 콘텐츠 */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { key: 'corners', label: '코너별 운영' },
          { key: 'contents', label: '태블릿 콘텐츠' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* WO-O4O-KPA-TABLET-OPERATION-GUIDE-MODAL-V1:
          상단 상시 안내 박스를 제거하고 헤더 '운영 안내' 버튼 → 모달로 이동(작업 영역 우선).
          문구는 현재 screen_set/content_list 구조에 맞게 정리. */}
      {showGuide && (
        <div
          className="fixed inset-0 z-[950] bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setShowGuide(false)}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[86vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Tablet className="w-5 h-5 text-sky-600" /> 크롬 태블릿 운영 안내
              </h3>
              <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-slate-600" aria-label="닫기">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700 leading-relaxed">
                <li>크롬 브라우저에서 매장 태블릿 주소를 열어 사용합니다.</li>
                <li>홈 화면에 바로가기로 추가하면 주소 입력 없이 실행할 수 있습니다.</li>
                <li>화면 자동 꺼짐(절전) 시간을 매장 상황에 맞게 확인하세요.</li>
                <li>화면 구성을 바꾼 뒤에는 태블릿에서 새로고침하거나 다시 열어 최신 화면을 확인하세요.</li>
                <li>‘고객 화면 미리보기’로 실제 태블릿 화면을 미리 확인할 수 있습니다.</li>
                <li>고객 태블릿 화면에는 해당 코너에 적용된 화면 세트의 내용(코너 설명·콘텐츠·상품·QR·대기화면)이 표시됩니다.</li>
                <li>공개 URL에 tabletId가 포함되면 해당 코너/태블릿 화면이 표시됩니다. tabletId가 없거나 유효하지 않으면 기본 활성 태블릿 기준으로 표시됩니다.</li>
              </ol>
            </div>
            <div className="px-5 py-3 border-t flex justify-end">
              <button onClick={() => setShowGuide(false)} className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800">
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loadingTablets && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <span className="ml-3 text-slate-400">태블릿 로딩 중...</span>
        </div>
      )}

      {/* WO-O4O-STORE-TABLET-REGISTER-UI-V1: 인라인 등록 폼 — empty/non-empty 공용 (코너별 운영 탭 전용) */}
      {activeTab === 'corners' && !loadingTablets && showRegisterForm && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-teal-100">
          <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-teal-700">새 코너 화면 만들기</h3>
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
                {registering ? '만드는 중...' : '코너 화면 만들기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No tablets (코너별 운영 탭 전용) */}
      {activeTab === 'corners' && !loadingTablets && tablets.length === 0 && !showRegisterForm && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <Tablet className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">아직 코너 화면이 없습니다</h3>
          <p className="text-slate-500 mb-4">코너를 만들면 태블릿에서 실행할 화면을 준비할 수 있습니다.</p>
          <button
            onClick={() => setShowRegisterForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 코너 화면 만들기
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

      {/* WO-O4O-KPA-TABLET-TOUCH-FIRST-CORNER-HOME-V1: 첫 화면 = 코너 카드 홈(태블릿 목록 아님).
          코너 = store_tablets(location||name). 카드 선택 시 기존 상세/편집기(아래) 재사용.
          미선택(selectedTabletId=null) 상태에서만 홈을 표시한다. */}
      {activeTab === 'corners' && !loadingTablets && tablets.length > 0 && !selectedTabletId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Tablet className="w-5 h-5 text-teal-600" /> 코너 화면
              <span className="text-sm font-normal text-slate-400">({tablets.length})</span>
            </h2>
            {/* 태블릿 추가는 보조 액션으로 낮춤(연결 흐름 재설계는 후속 WO) */}
            <button
              onClick={() => setShowRegisterForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-teal-700 bg-white border border-teal-200 rounded-xl hover:bg-teal-50"
            >
              <Plus className="w-4 h-4" /> 코너/태블릿 추가
            </button>
          </div>
          <p className="text-xs text-slate-400">관리할 코너를 선택하세요. 각 코너는 매장 위치 기준의 태블릿 화면입니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {sortedTablets.map((t) => {
              const set = t.currentScreenSetId ? screenSetIndex[t.currentScreenSetId] : null;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTabletId(t.id)}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3 cursor-pointer hover:border-teal-200 hover:shadow-md transition"
                >
                  <div className="min-w-0">
                    <div className="text-base font-bold text-slate-900 truncate">{cornerPrimary(t)}</div>
                    {cornerSecondary(t) && <div className="text-xs text-slate-400 truncate mt-0.5">{cornerSecondary(t)}</div>}
                  </div>
                  <div className="space-y-1 text-sm min-w-0">
                    <div className="text-slate-600 truncate">
                      화면 세트: <span className="font-medium text-slate-800">{set ? set.name : (t.currentScreenSetId ? '적용됨' : '기본 화면')}</span>
                    </div>
                    {set && <div className="text-xs text-slate-400">블록 {set.blockCount}개</div>}
                    <div className="text-xs">
                      <span className={t.is_active ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{t.is_active ? '● 연결됨(활성)' : '○ 비활성'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {storeSlug && (
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(publicTabletUrl(t.id), '_blank', 'noopener,noreferrer'); }}
                        className="flex-1 min-h-[44px] px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                      >
                        공개 화면 확인
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedTabletId(t.id); }}
                      className="flex-1 min-h-[44px] px-3 py-2 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700"
                    >
                      관리
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tablet list DataTable + editor (선택 코너 상세 — 기존 2단 레이아웃 재사용, 코너별 운영 탭 전용) */}
      {activeTab === 'corners' && !loadingTablets && tablets.length > 0 && selectedTabletId && (
        <>
          {/* WO-O4O-KPA-TABLET-TOUCH-FIRST-CORNER-HOME-V1: 코너 홈으로 돌아가기 */}
          <button
            onClick={() => setSelectedTabletId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" /> 코너 목록
          </button>
          {/* WO-O4O-KPA-TABLET-LOCATION-FIRST-UX-REFIT-V1: 위치/코너 우선 2단 레이아웃
              좌측 = 위치/코너 태블릿 목록(1차 기준축), 우측 = 선택 코너의 현재 구성.
              데이터 구조·API·public runtime 무변경 (UI 재배치만). */}
          <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6 lg:items-start">
            {/* 좌측: 위치/코너 사이드바 */}
            <aside className="space-y-2 mb-4 lg:mb-0 lg:sticky lg:top-4">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Tablet className="w-4 h-4 text-teal-600" />
                    코너 · 위치 ({tablets.length})
                  </h3>
                  <button
                    onClick={() => setShowRegisterForm((v) => !v)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> 추가
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
                  {sortedTablets.map((t) => {
                    const isSel = t.id === selectedTabletId;
                    const secondary = cornerSecondary(t);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTabletId(t.id)}
                        className={`flex items-start gap-2 px-4 py-3 cursor-pointer border-l-4 ${
                          isSel ? 'bg-teal-50 border-teal-500' : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate ${isSel ? 'font-bold text-teal-800' : 'font-semibold text-slate-800'}`}>
                            {cornerPrimary(t)}
                          </div>
                          {secondary && <div className="text-xs text-slate-400 truncate mt-0.5">{secondary}</div>}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTablet(t.id, t.name); }}
                          disabled={deletingTabletId === t.id}
                          className="p-1 rounded text-slate-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0 disabled:opacity-50"
                          title="이 태블릿 삭제"
                        >
                          {deletingTabletId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 px-1">
                코너/위치는 태블릿의 ‘위치’ 값 기준으로 정렬됩니다. 위치를 입력하면 같은 코너끼리 모여 보입니다.
              </p>
            </aside>

            {/* 우측: 선택 코너의 현재 구성 */}
            <div className="space-y-6 min-w-0">
              {/* WO-O4O-KPA-TABLET-TOUCH-FIRST-TABLET-CONNECT-FLOW-V1:
                  상단 = 태블릿 연결·실행(현재 상태·화면 세트·실행 액션), 하단 = 화면 구성 요약(제작 컨텍스트).
                  긴 실행 URL 은 기본 숨김(보조 토글). QR 은 재사용 가능한 client QR 컴포넌트 부재로 Deferred(화면 열기+주소 복사). */}
              {selectedTablet && (
                <div className="bg-white rounded-2xl shadow-sm border border-teal-100 overflow-hidden">
                  {/* 상단: 태블릿 연결·실행 */}
                  <div className="p-4 space-y-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-teal-600 mb-0.5">태블릿 연결·실행</div>
                      <h2 className="text-lg font-bold text-slate-900 truncate">{cornerPrimary(selectedTablet)}</h2>
                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                        <span className={selectedTablet.is_active ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                          {selectedTablet.is_active ? '● 사용 중(활성)' : '○ 비활성'}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 truncate">
                          화면 세트: <span className="font-medium text-slate-700">{selectedTablet.currentScreenSetId ? (screenSetIndex[selectedTablet.currentScreenSetId]?.name ?? '적용됨') : '없음'}</span>
                        </span>
                      </div>
                    </div>

                    {storeSlug ? (
                      <>
                        <p className="text-xs text-slate-500">이 코너 화면을 태블릿에서 실행할 수 있습니다. 태블릿 크롬에서 ‘화면 열기’로 열거나, 주소를 복사해 북마크하세요.</p>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenTabletScreen(selectedTablet.id)}
                            className="flex-1 min-w-[150px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700"
                          >
                            <Tv className="w-4 h-4" /> 태블릿에서 화면 열기
                          </button>
                          <button
                            onClick={() => handleCopyTabletUrl(selectedTablet.id)}
                            className="flex-1 min-w-[120px] min-h-[44px] inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                          >
                            주소 복사
                          </button>
                          <button
                            onClick={handleOpenPreview}
                            disabled={previewLoading}
                            className="flex-1 min-w-[120px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
                          >
                            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tv className="w-4 h-4" />} 미리보기
                          </button>
                        </div>
                        {!selectedTablet.currentScreenSetId && (
                          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            연결할 화면 세트가 아직 없습니다. 아래에서 화면 세트를 만들어 적용해 주세요.
                          </div>
                        )}
                        <div>
                          <button onClick={() => setShowRunUrl((v) => !v)} className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2">
                            {showRunUrl ? '실행 주소 숨기기' : '실행 주소 보기'}
                          </button>
                          {showRunUrl && (
                            <code className="block mt-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 break-all">
                              {publicTabletUrl(selectedTablet.id)}
                            </code>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        태블릿 실행 주소를 만들 수 없습니다. 매장 기본 정보(공개 주소)를 먼저 확인해 주세요.
                      </div>
                    )}
                  </div>

                  {/* 하단: 화면 구성 요약(화면 제작 컨텍스트) */}
                  <div className="px-4 py-3 border-t bg-slate-50/60">
                    <div className="text-[11px] font-medium text-slate-500 mb-2">화면 구성</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                        <div className="text-[11px] text-slate-400">진열 상품</div>
                        <div className="text-sm font-bold text-slate-800">
                          {displays.length}
                          {displays.length > 0 && (
                            <span className="text-[11px] font-normal text-slate-400"> · 노출 {displays.filter((d) => d.isVisible).length}</span>
                          )}
                          {hasChanges && <span className="text-[11px] font-medium text-amber-600"> · 변경됨</span>}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                        <div className="text-[11px] text-slate-400">대기 화면</div>
                        <div className="text-sm font-bold text-slate-800">
                          {idleItems.length}
                          {idleHasChanges && <span className="text-[11px] font-medium text-amber-600"> · 변경됨</span>}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                        <div className="text-[11px] text-slate-400">공통 대기영상</div>
                        <div className="text-sm font-bold text-slate-800">
                          {ocSelection ? (ocStatusLabel[ocSelection.status] ?? '선택됨') : '없음'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1: 코너 모드 — 현재 사용 중 세트 + 교체(적용/해제)만.
                  세트 원본 수정/생성/보관은 '태블릿 콘텐츠' 탭으로 이동. */}
              {selectedTabletId && (
                <TabletScreenSetManager
                  mode="corner"
                  tabletId={selectedTabletId}
                  currentScreenSetId={selectedTablet?.currentScreenSetId ?? null}
                  onCurrentChange={(id) => setTablets((prev) => prev.map((t) => (t.id === selectedTabletId ? { ...t, currentScreenSetId: id } : t)))}
                  onToast={setToast}
                />
              )}

              {/* WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1: 고급 설정(접이식) —
                  대기화면·화면설정·진열·공통 대기영상은 legacy 실행 편집기다.
                  공개 뷰어가 아직 화면 세트를 소비하지 않아 이 값들이 현재 실제 고객 화면을 결정하므로
                  제거하지 않고 primary 에서 접어 둔다(교체·화면 열기 중심으로 코너 상세를 축소). */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                <button
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-2">
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    고급 설정 (대기화면 · 화면 설정 · 진열 · 공통 대기영상)
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">현재 고객 화면에 반영되는 항목</span>
                </button>
              </div>

              {showAdvanced && (
              <>
          {/* WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1: 서비스 공통 대기 영상(태블릿별 1개) */}
          {selectedTabletId && (
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-slate-700">서비스 공통 대기 영상</p>
                <div className="flex gap-2">
                  <button
                    onClick={openOcModal}
                    disabled={ocBusy}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    {ocSelection ? '다른 영상 선택' : '영상 선택'}
                  </button>
                  {ocSelection && (
                    <button
                      onClick={handleOcClear}
                      disabled={ocBusy}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      선택 해제
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                서비스 운영자가 제공한 영상 중 이 태블릿 대기화면에 사용할 영상을 1개 선택합니다. 영상 자체는 매장에서 수정할 수 없습니다.
              </p>
              {ocSelection ? (
                <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <div className="font-medium">{ocSelection.title}</div>
                  <div className="text-slate-500 mt-0.5">
                    {ocSelection.sourceType.toUpperCase()} · 방영 {ocSelection.startAt.slice(0, 10)} ~ {ocSelection.endAt.slice(0, 10)} · 상태: {ocStatusLabel[ocSelection.status] ?? ocSelection.status}
                  </div>
                  {(ocSelection.status === 'expired' || ocSelection.status === 'unavailable') && (
                    <div className="text-amber-600 mt-1">
                      선택한 서비스 공통 영상의 방영 기간이 종료되었습니다. 현재 태블릿에는 사용 가능한 공통 영상이 자동 노출됩니다. 코너에 맞는 다른 공통 영상을 선택해 주세요.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400">선택된 서비스 공통 영상이 없습니다. 사용 가능한 공통 영상이 있으면 자동으로 노출될 수 있습니다.</div>
              )}
            </div>
          )}

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
                  <h3 className="text-sm font-bold text-slate-700">대기 화면</h3>
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
                  대기 화면 저장
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
                <h3 className="text-sm font-bold text-slate-700">태블릿 화면 설정</h3>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  화면 설정 저장
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
                  { key: 'showConsultationButton', label: '상담 요청 버튼 (후속 기능 · 권장하지 않음)', desc: '태블릿 V1은 공용 안내 화면으로, 고객 개인정보 입력·상담 접수를 받지 않습니다. 상담 요청/개인정보 입력은 후속 모바일 앱/PWA 기능에서 다룹니다. 기본은 꺼짐이며, 켜더라도 개인정보 없이 관심만 전송됩니다.' },
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
                    <h3 className="text-sm font-bold text-slate-700">태블릿에 보여줄 상품 선택</h3>
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
                <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-700">
                    현재 태블릿 화면 구성 ({displays.length})
                    {hasChanges && <span className="ml-1 text-xs font-medium text-amber-600">· 변경됨</span>}
                  </h3>
                  {/* WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1: 진열 저장(상단 헤더 저장 제거 → 진열 섹션 맥락 저장) */}
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    진열 저장
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {displays.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      이 타블렛에 진열된 제품이 없습니다. 왼쪽에서 제품을 선택해 추가하세요.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {displays.map((entry, index) => {
                        // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열별 표시 콘텐츠 후보/선택.
                        const candKey = `${entry.productType}:${entry.productId}`;
                        const candidates = contentCandidates[candKey];
                        const selectValue = candidates?.some((c) => c.contentId === entry.contentId)
                          ? (entry.contentId as string)
                          : '';
                        return (
                          <div
                            key={`${entry.productType}-${entry.productId}`}
                            className="px-4 py-2.5 hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3">
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

                            {/* 상품 상세에서 보여줄 설명 선택 (기본 콘텐츠 미지정 — 진열마다 직접 선택)
                                WO-O4O-KPA-TABLET-CORNER-PRODUCT-GUIDE-UX-AND-CHROME-OPERABILITY-V1 */}
                            <div className="mt-2 pl-7">
                              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                상품 상세에서 보여줄 설명
                              </label>
                              {candidates === undefined ? (
                                <span className="text-xs text-slate-400">불러오는 중…</span>
                              ) : candidates.length === 0 ? (
                                <span className="text-xs text-slate-400">
                                  연결된 설명 콘텐츠가 없습니다. 태블릿 상세 화면에는 기본 상품 설명이 표시됩니다.
                                  상품별 설명을 따로 보여주려면 먼저 상품 설명 콘텐츠를 만들고 이 제품에 연결하세요.
                                </span>
                              ) : (
                                <>
                                  <select
                                    value={selectValue}
                                    onChange={(e) => setContentForIndex(index, e.target.value || null)}
                                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white"
                                  >
                                    <option value="">설명 콘텐츠 선택 안 함 (기본 상품 설명 사용)</option>
                                    {candidates.map((c) => (
                                      <option key={c.contentId} value={c.contentId}>
                                        {contentOptionLabel(c)}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="mt-1 text-[10px] text-slate-400">
                                    연결된 설명 콘텐츠가 있으면 태블릿 상세 화면에서 우선 표시됩니다. 선택 안 함 = 기본 상품 설명이 표시됩니다.
                                  </p>
                                  {/* WO-O4O-KPA-TABLET-INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE-V1 */}
                                  <p className="mt-0.5 text-[10px] text-teal-600">
                                    선택한 설명 콘텐츠에 검수 완료된 다국어 번역이 있으면, 태블릿 상세 화면에서 고객이 언어를 선택해 볼 수 있습니다.
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
              </>
              )}{/* /고급 설정 (WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1) */}
            </div>{/* /우측: 선택 코너 현재 구성 */}
          </div>{/* /위치·코너 2단 그리드 (WO-O4O-KPA-TABLET-LOCATION-FIRST-UX-REFIT-V1) */}
        </>
      )}

      {/* WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1: 태블릿 콘텐츠 탭 — 화면 세트(콘텐츠 원본) 라이브러리.
          목록/수정/보관/생성 담당. 코너 적용(교체)은 코너별 운영 탭. tablets 로 '사용 중인 코너' 표시. */}
      {activeTab === 'contents' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            태블릿 코너에 보여줄 화면 세트(콘텐츠)를 만들고 수정·보관합니다. 실제 코너 적용·교체는 <b>코너별 운영</b> 탭에서 합니다.
          </p>
          <TabletScreenSetManager
            mode="library"
            tabletId={null}
            currentScreenSetId={null}
            onToast={setToast}
            tablets={tablets}
          />
        </div>
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
              <p className="text-sm font-semibold">태블릿 고객 화면 미리보기</p>
              <p className="text-[11px] text-slate-300">
                저장된 진열 구성 기준으로 미리 봅니다(첫 번째 활성 태블릿 · 위치별 태블릿 분리는 후속). 변경 후에는 저장한 다음 확인해 주세요. 실제 크롬 태블릿에서는 화면 크기·방향에 따라 표시가 달라질 수 있습니다. 상담 요청은 전송되지 않습니다.
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

      {/* WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1: 공통 영상 선택 모달 */}
      {ocModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.5)' }} className="flex items-center justify-center p-4" onClick={() => setOcModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">서비스 공통 대기 영상 선택</h3>
              <button onClick={() => setOcModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>
            <div className="p-4 overflow-y-auto">
              {ocLoading ? (
                <div className="text-center py-8 text-sm text-slate-400">불러오는 중…</div>
              ) : ocCandidates.filter(c => c.status !== 'expired').length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">현재 사용 가능한 서비스 공통 영상이 없습니다.</div>
              ) : (
                <ul className="divide-y">
                  {ocCandidates.filter(c => c.status !== 'expired').map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900 truncate">{c.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.sourceType.toUpperCase()} · 방영 {c.startAt.slice(0, 10)} ~ {c.endAt.slice(0, 10)} · {ocStatusLabel[c.status] ?? c.status}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOcSelect(c.id)}
                        disabled={ocBusy}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        선택
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-slate-400 mt-3">영상 등록·수정·삭제·기간 변경은 서비스 운영자만 할 수 있습니다.</p>
            </div>
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
