/**
 * StoreQRPage — 매장 QR 코드 관리
 *
 * WO-O4O-QR-LANDING-PAGE-V1
 * WO-O4O-QR-SCAN-ANALYTICS-V1
 * WO-O4O-QR-PRINT-MODULE-V2
 * WO-STORE-QR-UX-RESTRUCTURE-V1
 *
 * Library에서 자료를 선택 → slug/landingType/landingTargetId 설정 → 백엔드 저장.
 * QR URL: /qr/{slug} (공개)
 * 스캔 통계: totalScans / todayScans / weeklyScans / deviceStats
 * 출력: PNG/SVG 개별 다운로드 + 선택 QR A4 PDF 일괄 출력
 */

import { StoreQrCreateForms } from './qr/StoreQrCreateForms';
import { styles } from './qr/qrStyles';
import { StoreWorkflowNavigation } from '../../components/store/StoreWorkflowNavigation';
import { withWorkspaceMode } from '../../config/storeWorkspace';
import { useState, useEffect } from 'react';
import { useStoreResource } from './hooks/useStoreResource';
import { QrCode, ExternalLink, X, Smartphone, Monitor, Tablet, Download, Printer, FolderOpen, LayoutTemplate, Info, Sparkles, Pencil, BarChart3 } from 'lucide-react';
// WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1 §9:
//   QR 목록·행 액션·출력 메뉴는 공통 Core 로 옮겼다(PharmacyHub 와 같은 화면을 쓴다).
//   여기 남는 것은 KPA 고유 진입점(AI 설명 편집 · 화면 세트 열기)과 일괄 출력뿐이다.
//   표 자체는 여전히 @o4o/ui DataTable 이다 — Core 안에서 그대로 쓴다.
import { getStoreExecutionAsset } from '../../api/storeExecutionAssets';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { GuideBlock } from '@o4o/shared-space-ui';
import { colors } from '../../styles/theme';
// WO-O4O-QR-TEMPLATE-WORKFLOW-V1
import { findTemplate } from './productionTemplates';
import type { ProductionTemplate } from './productionTemplates';
import type { ProductionRouterState } from './productionTargets';
import { StoreAssetSelectorModal } from '../../components/store/StoreAssetSelectorModal';
import type { AssetSelectorResult as LibrarySelectorResult } from '../../components/store/StoreAssetSelectorModal';
import { QrPrintTemplateModal } from './QrPrintTemplateModal';
import type { PrintTemplate } from './QrPrintTemplateModal';
import {
  getStoreQrCodes,
  createStoreQrCode,
  deleteStoreQrCode,
  reactivateStoreQrCode,
  getQrAnalytics,
  listQrPlacements,
  startQrPlacement,
  endQrPlacement,
  getQrPlacementAnalytics,
  cloneQrCode,
  type StoreQrPlacementDto,
  type QrPlacementScanRow,
  // WO-O4O-KPA-STORE-QR-PRINT-EXPORT-UI-WIRING-V1: export foundation 연결
  downloadQrExport,
  // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: QR 설정 모달 저장
  updateStoreQrCode,
  getStorePlacementAnalytics,
} from '../../api/storeQr';
import type {
  StoreQrCode,
  QrAnalyticsData,
  QrExportFormat,
  QrExportPreset,
  StoreQrPlacementAnalyticsDto,
} from '../../api/storeQr';
import { getListings } from '../../api/pharmacyProducts';
import { fetchLocalProducts } from '../../api/localProducts';
import { getAccessToken } from '../../contexts/AuthContext';
import {
  GuideBackLink,
  StoreQrOperationBoard,
  StoreQrPlacementPanel,
  StoreQrPlacementAnalyticsPanel,
  isArchivedCornerQr,
} from '@o4o/store-ui-core';
import { getActiveServicePrefix, getActiveServicePublicOrigin } from '../../lib/serviceContext';

// WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §3: QR 목록 필터 키.
type QrListFilter = 'all' | 'content' | 'ai' | 'screen_set';

// isArchivedCornerQr 판정(보관 코너 QR)은 @o4o/store-ui-core 가 정본이다 — PH 와 같은 판정을 쓴다.

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[가-힣]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || `qr-${Date.now()}`;
}

function autoLandingType(assetType: string): string {
  if (assetType === 'external-link') return 'link';
  return 'page'; // file, content → page
}

// WO-O4O-KPA-STORE-QR-EXPORT-FILE-GUIDE-V1: 출력 파일 선택 안내(상황 → 추천 파일 → 이유)
const QR_EXPORT_GUIDE: { situation: string; recommend: string; reason: string }[] = [
  { situation: '전문 출력소·디자인 업체에 전달', recommend: 'SVG (벡터)', reason: '크기를 키우거나 줄여도 선명하게 출력됩니다' },
  { situation: '대형 POP·포스터·진열대 출력', recommend: 'SVG 우선 · PNG 고해상도', reason: '큰 사이즈 출력에 유리합니다' },
  { situation: 'PPT·문서·POP 편집에 삽입', recommend: 'PNG 고해상도', reason: '일반 문서 편집 도구에서 사용하기 쉽습니다' },
  { situation: '약국에서 A4로 바로 출력', recommend: 'A4 1장 PDF', reason: '별도 편집 없이 바로 출력하기 좋습니다' },
  { situation: '작은 안내카드 여러 장', recommend: 'A4 4분할 PDF', reason: '잘라서 여러 곳에 부착하기 좋습니다' },
  { situation: '임시 확인·간단 공유', recommend: 'PNG (이미지)', reason: '가장 간단하지만 확대 출력에는 적합하지 않습니다' },
];

// 출력 메뉴(QR_EXPORT_PRESETS 5종 · DataTable overflow 클리핑을 피하는 portal)는
// @o4o/store-ui-core 의 StoreQrOperationBoard 안으로 옮겼다
// (WO-O4O-KPA-STORE-QR-EXPORT-MENU-CLIP-FIX-V1 의 해법을 Core 로 승격).

async function loadQrCodes(): Promise<StoreQrCode[]> {
  const response = await getStoreQrCodes({ limit: 100, includeInactive: true });
  if (!response.success || !response.data) throw new Error('QR_LOAD_FAILED');
  return response.data.items;
}

export function StoreQRPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const workspaceMode = new URLSearchParams(location.search).get('workspace') === 'use' ? 'use' : 'studio';
  const [createdTitle, setCreatedTitle] = useState<string | null>(null);

  const { data: items, setData: setItems, loading, error: listError, reload: fetchItems } = useStoreResource(loadQrCodes, []);
  // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: 목록 필터 + QR 설정 모달
  // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §3: 'screen_set'(태블릿 코너) 추가.
  const [listFilter, setListFilter] = useState<QrListFilter>('all');
  const [settingsQr, setSettingsQr] = useState<StoreQrCode | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openSelector = () => {
    navigate(withWorkspaceMode(`${location.pathname}${location.search}`, 'studio'), { state: location.state });
    setShowSelector(true);
  };

  // Create form state
  const [creating, setCreating] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<LibrarySelectorResult | null>(null);
  const [formSlug, setFormSlug] = useState('');
  const [formLandingType, setFormLandingType] = useState('product');
  const [formLandingTargetId, setFormLandingTargetId] = useState('');
  // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 내 매장 동영상 → QR 생성 prefill (library 자료와 별도 경로)
  const [videoTarget, setVideoTarget] = useState<{ id: string; title: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // WO-O4O-QR-TEMPLATE-WORKFLOW-V1: title/description AI 생성 + template 상태
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);
  // WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1: 콘텐츠(page) QR 하단 상담 요청 버튼 옵션
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [ctaLabel, setCtaLabel] = useState('');

  // Analytics state
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<QrAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Print / download state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  // WO-O4O-KPA-STORE-QR-EXPORT-FILE-GUIDE-V1: 출력 파일 선택 안내 모달
  const [showExportGuide, setShowExportGuide] = useState(false);
  // WO-O4O-KPA-STORE-QR-PRINT-EXPORT-UI-WIRING-V1: 출력 진행 중인 QR id (중복 클릭 방지 + 로딩 표시)
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Product dropdown state
  const [productOptions, setProductOptions] = useState<{ id: string; name: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productRetry, setProductRetry] = useState(0);

  // Load product options when landingType is 'product'
  useEffect(() => {
    if (formLandingType !== 'product' || !creating) { setProductError(null); setLoadingProducts(false); return; }
    let cancelled = false;
    setLoadingProducts(true); setProductError(null);
    Promise.all([
      getListings(),
      fetchLocalProducts({ limit: 100 }),
    ]).then(([listingsRes, localRes]) => {
      if (cancelled) return;
      if (!listingsRes.success) throw new Error('PRODUCT_LOAD_FAILED');
      const combined: { id: string; name: string }[] = [];
      if (listingsRes.success && Array.isArray(listingsRes.data)) {
        for (const l of listingsRes.data) {
          if (l.is_active) combined.push({ id: l.id, name: l.product_name });
        }
      }
      const localItems = 'items' in localRes ? localRes.items : [];
      for (const p of localItems) {
        if (p.is_active) combined.push({ id: p.id, name: p.name });
      }
      setProductOptions(combined);
    }).catch(() => { if (!cancelled) { setProductOptions([]); setProductError('상품 목록을 불러오지 못했습니다.'); } })
      .finally(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, [formLandingType, creating, productRetry]);

  // Router state 기반 자동 선택 — canonical production.source.items[] 단일 시그니처:
  //  - 내 자료함 → 제작 시작 → QR (다건 가능, 첫 library 항목 사용)
  //  - 상품 마케팅 → QR 만들기 (단건 자동 prefill, productContext 동반)
  // WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1
  // WO-O4O-KPA-STORE-QR-PRODUCT-CONTEXT-CANONICAL-MERGE-V1
  // WO-O4O-QR-TEMPLATE-WORKFLOW-V1: selectedTemplateId 수신
  useEffect(() => {
    const state = location.state as ProductionRouterState | null;
    // template 조회: selectedTemplateId 우선, 없으면 qr-product-intro 기본값
    const templateId = state?.production?.selectedTemplateId ?? 'qr-product-intro';
    const tpl = findTemplate(templateId) ?? findTemplate('qr-product-intro') ?? null;
    if (tpl) setSelectedTemplate(tpl);

    const incoming = (state as any)?.production?.source?.items?.find(
      (it: any) => it.origin === 'library',
    );
    if (incoming) {
      // 자료실 항목 fetch 후 creation mode 진입
      (async () => {
        try {
          const res = await getStoreExecutionAsset(incoming.id);
          const lib = res.data;
          handleLibrarySelect({
            id: lib.id,
            title: lib.title,
            category: lib.category,
            fileUrl: lib.fileUrl,
            assetType: lib.assetType,
            url: lib.url,
            htmlContent: lib.htmlContent,
          });
        } catch {
          // skip
        } finally {
          window.history.replaceState({}, document.title);
        }
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: PharmacyVideoPage 에서 "QR 생성" 진입 시 동영상 대상 prefill.
  //   landingType='video' + landingTargetId=동영상 사본 id. library 자료 흐름과 분리된 전용 폼.
  useEffect(() => {
    const state = location.state as { prefillVideo?: { id: string; title: string } } | null;
    const pv = state?.prefillVideo;
    if (pv && pv.id) {
      setVideoTarget({ id: pv.id, title: pv.title });
      setSelectedLibrary(null);
      setFormLandingType('video');
      setFormLandingTargetId(pv.id);
      setFormTitle(pv.title);
      setFormDescription('');
      setFormSlug(toSlug(pv.title));
      setFormError(null);
      setCreating(true);
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateVideo = async () => {
    if (!videoTarget) return;
    if (!formSlug.trim()) {
      setFormError('슬러그를 입력해주세요');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await createStoreQrCode({
        title: formTitle.trim() || videoTarget.title,
        description: formDescription.trim() || undefined,
        landingType: 'video',
        landingTargetId: videoTarget.id,
        slug: formSlug.trim(),
      });
      if (res.success && res.data) {
        setCreatedTitle(res.data.title);
        setItems((prev) => [res.data, ...prev]);
        setCreating(false);
        setVideoTarget(null);
      } else {
        setFormError('저장에 실패했습니다');
      }
    } catch {
      setFormError('슬러그가 이미 사용중이거나 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleLibrarySelect = (item: LibrarySelectorResult) => {
    setSelectedLibrary(item);
    setFormSlug(toSlug(item.title));
    // WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (B안) / MLC:
    //   블로그(source='blog')·다국어 제품 콘텐츠(source='mlc')는 공개 URL link 연결 —
    //   landingType='link', landingTargetId=절대 URL.
    //   콘텐츠 허브(source='content-hub')는 handleCreate 에서 page 참조형으로 처리(여기선 page prefill).
    //   그 외(asset)는 기존 autoLandingType 규칙.
    if (item.source === 'blog' || item.source === 'mlc') {
      setFormLandingType('link');
      setFormLandingTargetId(item.url || '');
    } else {
      setFormLandingType(autoLandingType(item.assetType || 'file'));
      setFormLandingTargetId(item.assetType === 'external-link' && item.url ? item.url : '');
    }
    // WO-O4O-QR-TEMPLATE-WORKFLOW-V1: title/description 초기화
    setFormTitle(item.title);
    setFormDescription('');
    setFormError(null);
    setShowSelector(false);
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!selectedLibrary) return;
    if (!formSlug.trim()) {
      setFormError('슬러그를 입력해주세요');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      // WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1 §7.4:
      //   운영자 콘텐츠 허브(kpa_contents) 참조형 — landingType='page', landingTargetId=content.id.
      //   사본 복사가 아니므로 libraryItemId 는 보내지 않는다(백엔드가 page 랜딩으로 inline 렌더).
      const isContentRef = selectedLibrary.source === 'content-hub';
      // WO-O4O-KPA-QR-ASSET-PICKER-INCLUDE-DIRECT-CONTENTS-V1:
      //   매장 직접 작성 콘텐츠(kpa_store_contents) 참조형 — content-hub 와 동일하게 page 참조
      //   (landingType='page', landingTargetId=content.id, libraryItemId 미전송). 공개 landing 이 본문 inline 렌더.
      const isDirectRef = selectedLibrary.source === 'direct-content';
      const isPageRef = isContentRef || isDirectRef;
      // WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (B안) / MLC:
      //   블로그·다국어 제품 콘텐츠 참조형 — landingType='link', landingTargetId=공개 URL(form 값).
      //   사본 복사 아님(다국어는 publicKey 발급으로 매장 사본 그룹을 공개) → libraryItemId 미전송.
      const isBlogRef = selectedLibrary.source === 'blog' || selectedLibrary.source === 'mlc';
      const res = await createStoreQrCode({
        // WO-O4O-QR-TEMPLATE-WORKFLOW-V1: AI 생성 제목/설명 우선 사용
        title: formTitle.trim() || selectedLibrary.title,
        description: formDescription.trim() || undefined,
        libraryItemId: (isPageRef || isBlogRef) ? undefined : selectedLibrary.id,
        landingType: isPageRef ? 'page' : formLandingType,
        landingTargetId: isPageRef ? selectedLibrary.id : (formLandingTargetId || undefined),
        slug: formSlug.trim(),
        // WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1: page(콘텐츠 참조) QR 에서만 상담 CTA 설정 전송
        ...(isPageRef && ctaEnabled
          ? { consultationCtaEnabled: true, consultationCtaLabel: ctaLabel.trim() || undefined }
          : {}),
      });

      if (res.success && res.data) {
        setCreatedTitle(res.data.title);
        setItems((prev) => [res.data, ...prev]);
        setCreating(false);
        setSelectedLibrary(null);
        setCtaEnabled(false);
        setCtaLabel('');
      } else {
        setFormError('저장에 실패했습니다');
      }
    } catch {
      setFormError('슬러그가 이미 사용중이거나 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  /**
   * QR 내리기 — 물리 삭제가 아니라 is_active=false 다(서버도 soft delete 만 한다).
   * 목록에서 지우지 않고 '내림' 으로 남긴다 — 그래야 다시 올릴 수 있다.
   */
  const handleDeactivate = async (id: string) => {
    if (!confirm('이 QR을 내리시겠습니까?\n주소(/qr/…)는 그대로 남아 언제든 다시 올릴 수 있습니다.')) return;
    try {
      await deleteStoreQrCode(id);
      setItems((prev) => prev.map((q) => (q.id === id ? { ...q, isActive: false, landable: false } : q)));
    } catch {
      toast.error('QR을 내리지 못했습니다.');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateStoreQrCode(id);
      setItems((prev) => prev.map((q) => (q.id === id ? { ...q, isActive: true } : q)));
      // landable 은 화면 세트 상태 등 다른 축에도 달려 있어 서버 판정을 다시 받는다.
      fetchItems();
    } catch {
      toast.error('QR을 다시 올리지 못했습니다.');
    }
  };

  const handleCopyUrl = (slug: string, id: string) => {
    // 공개 QR 경로는 서비스 앱이 서빙한다(store 호스트에는 /qr 없음) — URL-FIRST-CENSUS §7-6
    const url = `${getActiveServicePublicOrigin()}/qr/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── 사용처(Placement) — WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §9 ──
  //   표시·경고·폼은 공통 Core(StoreQrPlacementPanel)가 담당한다. 여기는 adapter 축뿐이다.
  const [placementId, setPlacementId] = useState<string | null>(null);
  const [placementItems, setPlacementItems] = useState<StoreQrPlacementDto[]>([]);
  const [placementScans, setPlacementScans] = useState<QrPlacementScanRow[]>([]);
  const [placementLoading, setPlacementLoading] = useState(false);
  const [placementBusy, setPlacementBusy] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);

  const loadPlacements = async (id: string) => {
    setPlacementLoading(true);
    setPlacementError(null);
    try {
      const [list, scans] = await Promise.all([listQrPlacements(id), getQrPlacementAnalytics(id)]);
      setPlacementItems(list?.data?.items ?? []);
      setPlacementScans(scans?.data?.byPlacement ?? []);
    } catch (e: any) {
      setPlacementError(e?.response?.data?.error?.message || e?.message || '사용처를 불러오지 못했습니다.');
    } finally {
      setPlacementLoading(false);
    }
  };

  const handleShowPlacements = async (id: string) => {
    if (placementId === id) {
      setPlacementId(null);
      setPlacementItems([]);
      setPlacementScans([]);
      return;
    }
    setPlacementId(id);
    await loadPlacements(id);
  };

  const runPlacementAction = async (id: string, fn: () => Promise<unknown>) => {
    setPlacementBusy(true);
    setPlacementError(null);
    try {
      await fn();
      await loadPlacements(id);
      await fetchItems();
    } catch (e: any) {
      setPlacementError(e?.response?.data?.error?.message || e?.message || '처리하지 못했습니다.');
    } finally {
      setPlacementBusy(false);
    }
  };

  // ── 매장 전체 스캔 분포(§13) ────────────────────────────────────────────────
  //   QR 1건 단위 통계와 다른 질문이다. "이 QR 이 몇 번 찍혔나" 가 아니라
  //   "우리 매장 스캔이 어느 사용처/출처/대상에 몰려 있나" 를 본다.
  const [distOpen, setDistOpen] = useState(false);
  const [distDays, setDistDays] = useState<number | null>(30);
  const [distData, setDistData] = useState<StoreQrPlacementAnalyticsDto | null>(null);
  const [distLoading, setDistLoading] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);

  const loadDistribution = async (days: number | null) => {
    setDistLoading(true);
    setDistError(null);
    try {
      const res = await getStorePlacementAnalytics(days);
      setDistData(res?.data ?? null);
    } catch (e: any) {
      setDistError(e?.response?.data?.error?.message || e?.message || '분포를 불러오지 못했습니다.');
    } finally {
      setDistLoading(false);
    }
  };

  const handleToggleDistribution = async () => {
    if (distOpen) {
      setDistOpen(false);
      return;
    }
    setDistOpen(true);
    await loadDistribution(distDays);
  };

  const handleChangeDistDays = async (days: number | null) => {
    setDistDays(days);
    await loadDistribution(days);
  };

  const handleShowAnalytics = async (id: string) => {
    if (analyticsId === id) {
      setAnalyticsId(null);
      setAnalyticsData(null);
      return;
    }
    setAnalyticsId(id);
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    try {
      const res = await getQrAnalytics(id);
      if (res.success && res.data) {
        setAnalyticsData(res.data);
      }
    } catch {
      // silent
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/${getActiveServicePrefix()}`
    : `/api/v1/${getActiveServicePrefix()}`;

  // WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1: 자체 row checkbox 제거 (DataTable rowSelection 통일).
  // handleToggleSelect 는 더 이상 사용처 없음 — 행 selection 은 DataTable 이 처리.
  // handleSelectAll 은 외부 toolbar 의 "전체 선택" 라벨에서 그대로 사용.

  // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §1:
  //   보관 코너 QR 은 일괄 출력 대상에서도 제외한다(개별 출력 차단과 동일 기준).
  const printableItems = items.filter((i) => !isArchivedCornerQr(i));

  const handleSelectAll = () => {
    if (selectedIds.size === printableItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(printableItems.map((i) => i.id)));
    }
  };

  // WO-O4O-KPA-STORE-QR-PRINT-EXPORT-UI-WIRING-V1:
  //   레거시 image?format= 직접 다운로드 → export foundation(downloadQrExport) 연결.
  //   preset 별 PDF(A4·4분할)/PNG/SVG 다운로드. 동일 QR 출력 중 중복 클릭 방지.
  const handleExport = async (id: string, format: QrExportFormat, preset: QrExportPreset) => {
    if (exportingId === id) return;
    setExportingId(id);
    try {
      await downloadQrExport(id, format, preset);
    } catch {
      toast.error('QR 출력 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setExportingId(null);
    }
  };

  const handleOpenPrintModal = () => {
    // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §1:
    //   보관 코너 QR 이 선택에 섞여 있으면 **조용히 빼지 않고** 명시적으로 알린 뒤 제외한다.
    const archivedSelected = items.filter((i) => selectedIds.has(i.id) && isArchivedCornerQr(i));
    if (archivedSelected.length > 0) {
      const keep = new Set(Array.from(selectedIds).filter((id) => !archivedSelected.some((a) => a.id === id)));
      setSelectedIds(keep);
      toast.error(`보관된 화면 세트의 코너 QR ${archivedSelected.length}건은 출력할 수 없어 선택에서 제외했습니다.`);
      if (keep.size === 0) return;
    }
    if (selectedIds.size === 0) {
      toast.error('출력할 QR을 먼저 선택해 주세요.');
      return;
    }
    setShowPrintModal(true);
  };

  const handleConfirmPrint = async (template: PrintTemplate) => {
    setShowPrintModal(false);
    setPrinting(true);
    try {
      const token = getAccessToken();
      const authHeaders: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      if (template === 'sheet') {
        // 기본 QR 시트 — 기존 일괄 출력
        const resp = await fetch(`${apiBase}/pharmacy/qr/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ qrIds: Array.from(selectedIds) }),
        });
        if (!resp.ok) throw new Error('Print failed');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }

      // Flyer 템플릿 — product 타입 QR만 처리
      const templateNum = template === 'flyer1' ? 1 : template === 'flyer4' ? 4 : 8;
      const productQrs = items.filter(
        (i) => selectedIds.has(i.id) && i.landingType === 'product' && i.landingTargetId,
      );
      if (productQrs.length === 0) {
        toast.error('이 템플릿은 상품 QR에만 사용할 수 있습니다.');
        return;
      }
      for (const qr of productQrs) {
        const resp = await fetch(
          `${apiBase}/pharmacy/qr/${qr.id}/flyer?template=${templateNum}`,
          { headers: authHeaders },
        );
        if (!resp.ok) throw new Error('Flyer generation failed');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch {
      toast.error('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setPrinting(false);
    }
  };

  const qrBaseUrl = `${getActiveServicePublicOrigin()}/qr/`;

  // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: 목록 필터(전체 | 콘텐츠 연결 | AI 설명)
  // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §3: '태블릿 코너'(screen_set) 필터 추가.
  //   일반 QR · AI 설명 QR · 코너 QR 구분을 유지한다(코너 QR 은 화면 세트 저장 시 자동 생성 — 수동 생성 경로 없음).
  const filteredItems = items.filter((q) => {
    if (listFilter === 'ai') return !!q.aiDescriptionMode;
    if (listFilter === 'content') return q.landingType === 'page' && !q.aiDescriptionMode;
    if (listFilter === 'screen_set') return q.landingType === 'screen_set';
    return true;
  });
  const aiCount = items.filter((q) => !!q.aiDescriptionMode).length;
  const contentCount = items.filter((q) => q.landingType === 'page' && !q.aiDescriptionMode).length;
  const cornerCount = items.filter((q) => q.landingType === 'screen_set').length;
  const FILTER_TABS: { key: QrListFilter; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: items.length },
    { key: 'content', label: '콘텐츠 연결', count: contentCount },
    { key: 'ai', label: 'AI 설명', count: aiCount },
    { key: 'screen_set', label: '태블릿 코너', count: cornerCount },
  ];
  // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §2:
  //   홈 '활성 QR' KPI 와 **같은 판정(landable)** 으로 센 값. 두 화면의 숫자가 어긋나지 않아야 한다.
  //   landable 미제공(구버전 응답)이면 isActive 로 안전 폴백.
  const activeCount = items.filter((q) => q.landable ?? q.isActive).length;
  const archivedCount = items.length - activeCount;

  return (
    <div style={styles.container}>
      <StoreWorkflowNavigation subject="QR" />
      {createdTitle && <div role="status" className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm">{createdTitle} QR을 저장했습니다. <Link className="font-semibold underline" to={withWorkspaceMode(`${location.pathname}${location.search}`, 'use')}>배치·출력으로 이어가기</Link></div>}
      {/* WO-O4O-STORE-WORKSPACE-QR-PREFILL-V2: QR canonical 안내 */}
      <div style={{ marginBottom: '16px' }}>
        <GuideBlock
          variant="warning"
          title="QR 코드는 '연결 대상'을 저장합니다"
          description="QR 코드는 내용을 직접 저장하지 않고, 고객이 스캔했을 때 이동할 연결 대상을 저장합니다. 운영자가 제공한 QR 템플릿을 가져오거나, 내 자료/외부 URL을 연결해 새 QR을 만들 수 있습니다."
        />
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {/* WO-O4O-KPA-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1:
                breadcrumb 상위·현재 항목을 실제 사이드바(콘텐츠·활용 > QR-code)와 일치시킨다. */}
            <Link to="/store" style={{ color: colors.neutral400, fontSize: '13px', textDecoration: 'none' }}>
              콘텐츠·활용
            </Link>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>QR-code</span>
          </div>
          <h1 style={styles.title}>QR 코드</h1>
          <p style={styles.subtitle}>
            매장에 부착·재사용할 QR 코드를 모아 출력합니다 · 상품마다 고정된 <b>상품 대표 QR</b> 은
            취급제품 화면에서 따로 출력합니다
          </p>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <GuideBackLink to="/guide/features/qr" label="QR 활용 방법" />
            {/* WO-O4O-KPA-STORE-QR-EXPORT-FILE-GUIDE-V1: 출력 파일 선택 기준 안내 보조 버튼 */}
            <button
              type="button"
              onClick={() => setShowExportGuide(true)}
              style={styles.exportGuideBtn}
            >
              <Info size={13} />
              파일 선택 안내
            </button>
          </div>
        </div>
        {/* WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (A안):
            QR 생성 진입을 페이지 내부 선택 모달로 직접 오픈 (내 자료함 이탈 동선 보완).
            기존 운영자 제공 QR "가져오기" 동선은 보조로 유지. */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={openSelector}
            style={styles.addBtn}
          >
            <QrCode size={14} />
            QR 만들기
          </button>
          {/* WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: QR 전용 AI 설명 만들기 진입 */}
          <Link to="/store/marketing/qr/ai-description" style={styles.aiDescBtn}>
            <Sparkles size={14} />
            AI 설명 QR 만들기
          </Link>
          <Link to="/store/library/qr" style={styles.hubImportBtn}>
            <Download size={14} />
            자료 가져오기
          </Link>
        </div>
      </div>

      {/* Batch Print Toolbar */}
      {listError && <div role="alert">{listError} <button type="button" onClick={() => void fetchItems()} disabled={loading}>다시 시도</button></div>}
      {workspaceMode === 'studio' && creating && formLandingType === 'product' && productError && <div role="alert">{productError} <button type="button" onClick={() => setProductRetry(value => value + 1)} disabled={loadingProducts}>상품 목록 다시 시도</button></div>}
      {items.length > 0 && (
        <div style={styles.printToolbar}>
          <label style={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={selectedIds.size === printableItems.length && printableItems.length > 0}
              onChange={handleSelectAll}
              style={styles.checkbox}
            />
            {/* WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §1: 분모 = 출력 가능한 QR(보관 제외). */}
            전체 선택 ({selectedIds.size}/{printableItems.length})
          </label>
          {selectedIds.size > 0 && (
            <button
              onClick={handleOpenPrintModal}
              disabled={printing}
              style={{ ...styles.printBtn, opacity: printing ? 0.7 : 1 }}
            >
              <Printer size={14} />
              {printing ? 'PDF 생성 중...' : `선택 QR 출력 (${selectedIds.size})`}
            </button>
          )}
        </div>
      )}

      {workspaceMode === 'studio' && <StoreQrCreateForms
        creating={creating}
        videoTarget={videoTarget}
        selectedLibrary={selectedLibrary}
        formTitle={formTitle}
        formDescription={formDescription}
        formSlug={formSlug}
        formLandingType={formLandingType}
        formLandingTargetId={formLandingTargetId}
        selectedTemplate={selectedTemplate}
        ctaEnabled={ctaEnabled}
        ctaLabel={ctaLabel}
        formError={formError}
        saving={saving}
        qrBaseUrl={qrBaseUrl}
        loadingProducts={loadingProducts}
        productOptions={productOptions}
        setFormTitle={setFormTitle}
        setFormDescription={setFormDescription}
        setFormSlug={setFormSlug}
        setFormLandingType={setFormLandingType}
        setFormLandingTargetId={setFormLandingTargetId}
        setCtaEnabled={setCtaEnabled}
        setCtaLabel={setCtaLabel}
        setCreating={setCreating}
        setVideoTarget={setVideoTarget}
        setSelectedLibrary={setSelectedLibrary}
        setShowSelector={(value) => { if (value) openSelector(); else setShowSelector(false); }}
        handleCreateVideo={handleCreateVideo}
        handleCreate={handleCreate}
      />}

      {/* QR Code List — WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1:
          카드형 → @o4o/ui DataTable. 자체 selectedIds (Set<string>) + handleBulkPrint
          (외부 toolbar) 는 그대로 보존 — DataTable rowSelection 은 Set ↔ Array 변환만.
          analytics 토글은 행 아래 펼침이 직접 지원 안 되므로 표 하단에 별도 패널로 표시. */}
      <div style={styles.body}>
        {!loading && !listError && items.length === 0 && (!creating || workspaceMode === 'use') ? (
          <div style={styles.emptyState}>
            {/* WO-O4O-KPA-STORE-QR-WORKFLOW-UX-ALIGNMENT-V1:
                QR 사용 입구를 3개로 분리 — 운영자 제공 가져오기 / 내 자료 제작 / 외부 URL(준비 중). */}
            <QrCode size={48} style={{ color: colors.neutral300, marginBottom: '12px' }} />
            <p style={{ color: colors.neutral500, fontSize: '14px', margin: 0 }}>
              등록된 QR 코드가 없습니다
            </p>
            <p style={{ color: colors.neutral400, fontSize: '13px', marginTop: '6px', textAlign: 'center', lineHeight: 1.6, maxWidth: 380 }}>
              운영자가 제공한 QR 템플릿을 가져오거나,<br />
              내 자료 또는 외부 URL로 새 QR 코드를 만들 수 있습니다.
            </p>
            <div style={styles.emptyCtaRow}>
              <Link to="/store/library/qr" style={styles.emptyCtaPrimary}>
                <Download size={14} />
                매장 HUB에서 QR 가져오기
              </Link>
              {/* WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (A안):
                  내 자료함(/store/library/resources) 이탈 링크 → 페이지 내 선택 모달 직접 오픈.
                  대상 범위가 콘텐츠·자료·내 매장 제작자료 전체임을 문구로 명시. */}
              <button
                type="button"
                onClick={openSelector}
                style={styles.emptyStateBtn}
              >
                <FolderOpen size={14} />
                콘텐츠·자료·내 매장 제작자료에서 QR 만들기
              </button>
              <button
                type="button"
                disabled
                style={styles.emptyCtaDisabled}
                title="준비 중 — 외부 URL은 내 자료함에 자료로 등록한 뒤 QR로 만들 수 있습니다."
              >
                <ExternalLink size={14} />
                외부 URL QR 만들기 (준비 중)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: 목록 필터 탭 */}
            <div style={styles.filterTabs}>
              {FILTER_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setListFilter(t.key)}
                  style={listFilter === t.key ? styles.filterTabActive : styles.filterTab}
                >
                  {t.label} <span style={styles.filterTabCount}>{t.count}</span>
                </button>
              ))}
            </div>
            {/* WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §2:
                홈 '활성 QR' KPI 와 대조 가능한 숫자를 목록에도 명시(같은 landable 판정). */}
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: colors.neutral500 }}>
              활성 {activeCount}건
              {archivedCount > 0 && <> · 보관 {archivedCount}건</>}
              <span style={{ color: colors.neutral400 }}> — 홈의 ‘활성 QR’ 숫자와 같은 기준입니다.</span>
            </p>
            {/* WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §13:
                매장 전체 분포는 행 단위 통계와 다른 질문이라 목록 위에 따로 둔다. */}
            <div style={{ margin: '0 0 12px' }}>
              <button
                type="button"
                onClick={handleToggleDistribution}
                style={styles.emptyStateBtn}
              >
                <BarChart3 size={14} />
                {distOpen ? '스캔 분포 닫기' : '매장 전체 QR 스캔 분포'}
              </button>
              {distOpen && (
                <div style={{ marginTop: 10 }}>
                  <StoreQrPlacementAnalyticsPanel
                    data={distData}
                    loading={distLoading}
                    error={distError}
                    days={distDays}
                    onChangeDays={handleChangeDistDays}
                  />
                </div>
              )}
            </div>
            {/* WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1 §9:
                목록·대상/원천 배지·행 액션·출력 메뉴·내리기/다시 올리기는 공통 Core 가 그린다.
                KPA 고유 진입점(AI 설명 편집 · 화면 세트 열기)만 renderRowActionsBefore 로 주입한다.
                자체 selectedIds(Set) ↔ Core 의 string[] 변환만 남는다(일괄 출력 보존). */}
            <StoreQrOperationBoard<StoreQrCode>
              items={filteredItems}
              loading={loading}
              publicUrl={(item) => `${getActiveServicePublicOrigin()}/qr/${item.slug}`}
              selectedIds={Array.from(selectedIds)}
              onSelectionChange={(keys) => setSelectedIds(new Set(keys))}
              onExport={(item, format, preset) => handleExport(item.id, format, preset)}
              exportingId={exportingId}
              onOpenSettings={(item) => setSettingsQr(item)}
              onShowAnalytics={(item) => handleShowAnalytics(item.id)}
              analyticsId={analyticsId}
              onShowPlacements={(item) => handleShowPlacements(item.id)}
              placementId={placementId}
              placementPanel={
                placementId ? (
                  <div style={{ marginTop: 12 }}>
                    <StoreQrPlacementPanel
                      qrTitle={items.find((i) => i.id === placementId)?.title ?? 'QR'}
                      placements={placementItems}
                      scanBreakdown={placementScans}
                      loading={placementLoading}
                      busy={placementBusy}
                      error={placementError}
                      onStart={(input) =>
                        runPlacementAction(placementId, () => startQrPlacement(placementId, input))
                      }
                      onEnd={(pid) => runPlacementAction(placementId, () => endQrPlacement(placementId, pid))}
                      onCloneForPlacement={() =>
                        runPlacementAction(placementId, () => cloneQrCode(placementId))
                      }
                    />
                  </div>
                ) : null
              }
              onCopyUrl={(item) => handleCopyUrl(item.slug, item.id)}
              copiedId={copiedId}
              onDeactivate={(item) => handleDeactivate(item.id)}
              onReactivate={(item) => handleReactivate(item.id)}
              emptyText={listFilter === 'all' ? '등록된 QR 코드가 없습니다' : '해당 조건의 QR이 없습니다'}
              palette={{
                primary: colors.primary,
                neutral100: colors.neutral100,
                neutral200: colors.neutral200,
                neutral400: colors.neutral400,
                neutral500: colors.neutral500,
                neutral600: colors.neutral600,
                neutral700: colors.neutral700,
                neutral800: colors.neutral800,
                badgeBg: colors.neutral100,
                border: colors.neutral200,
              }}
              renderTitleBadges={(item) =>
                // WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: AI 설명 QR 표식 (KPA 고유)
                item.aiDescriptionMode ? (
                  <span
                    style={{
                      marginLeft: 6,
                      display: 'inline-flex',
                      padding: '1px 7px',
                      borderRadius: '999px',
                      fontSize: '10px',
                      fontWeight: 600,
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      verticalAlign: 'middle',
                    }}
                  >
                    AI 설명{item.aiDescriptionMode === 'corner' ? '·코너' : ''}
                  </span>
                ) : null
              }
              renderRowActionsBefore={(item) => (
                <>
                  {/* WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: 내용 수정 / AI 다시 만들기 */}
                  {item.aiDescriptionMode && item.landingTargetId && (
                    <>
                      <Link
                        to={`/store/content/direct/${item.landingTargetId}?edit=1`}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.iconBtn}
                        title="내용 수정 (본문 편집)"
                      >
                        <Pencil size={16} />
                      </Link>
                      <Link
                        to={`/store/marketing/qr/ai-description?content=${item.landingTargetId}&qr=${encodeURIComponent(item.slug)}`}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.iconBtn}
                        title="AI 입력·다시 만들기"
                      >
                        <Sparkles size={16} />
                      </Link>
                    </>
                  )}
                  {/* WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §3 · §E-1:
                      코너 QR 의 원본은 화면 세트다. 보관된 세트는 상세 조회가 404 라 편집기 대신
                      태블릿 콘텐츠 목록(보관 해제 지점)으로 보낸다 — dead action 을 만들지 않는다. */}
                  {item.landingType === 'screen_set' && item.landingTargetId && (
                    <Link
                      to="/store/commerce/tablet-displays?workspace=studio"
                      state={
                        isArchivedCornerQr(item)
                          ? { tab: 'contents', highlightScreenSetId: item.landingTargetId }
                          : { tab: 'contents', editScreenSetId: item.landingTargetId, highlightScreenSetId: item.landingTargetId }
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={styles.iconBtn}
                      title={
                        isArchivedCornerQr(item)
                          ? '태블릿 콘텐츠에서 보기 (보관 해제하면 편집·출력이 다시 열립니다)'
                          : '화면 세트 열기 (코너 화면 편집)'
                      }
                    >
                      <LayoutTemplate size={16} />
                    </Link>
                  )}
                </>
              )}
            />

            {/* Analytics Panel — DataTable 행 아래 펼침이 직접 지원 안 되므로 표 하단에 표시 */}
            {analyticsId && (
              <div style={{ ...styles.analyticsPanel, marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: colors.neutral700, margin: 0 }}>
                    스캔 통계: {items.find((i) => i.id === analyticsId)?.title || ''}
                  </p>
                  <button
                    onClick={() => handleShowAnalytics(analyticsId)}
                    style={{ ...styles.iconBtn, color: colors.neutral400 }}
                    title="닫기"
                  >
                    <X size={14} />
                  </button>
                </div>
                {analyticsLoading ? (
                  <p style={styles.analyticsLoading}>불러오는 중...</p>
                ) : analyticsData ? (
                  <div style={styles.analyticsGrid}>
                    <div style={styles.statBox}>
                      <p style={styles.statValue}>{analyticsData.totalScans}</p>
                      <p style={styles.statLabel}>총 스캔</p>
                    </div>
                    <div style={styles.statBox}>
                      <p style={styles.statValue}>{analyticsData.todayScans}</p>
                      <p style={styles.statLabel}>오늘</p>
                    </div>
                    <div style={styles.statBox}>
                      <p style={styles.statValue}>{analyticsData.weeklyScans}</p>
                      <p style={styles.statLabel}>최근 7일</p>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.deviceRow}>
                        <Smartphone size={12} /> <span>{analyticsData.deviceStats.mobile}</span>
                      </div>
                      <div style={styles.deviceRow}>
                        <Tablet size={12} /> <span>{analyticsData.deviceStats.tablet}</span>
                      </div>
                      <div style={styles.deviceRow}>
                        <Monitor size={12} /> <span>{analyticsData.deviceStats.desktop}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={styles.analyticsLoading}>데이터를 불러올 수 없습니다</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* WO-O4O-KPA-QR-AI-STEP-REMOVE-V1: QR 문구 AI 생성 모달 진입점 제거 (AiContentModal 컴포넌트는 유지) */}

      {/* WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: QR 설정 모달 (제목·slug·상담 CTA) */}
      {settingsQr && (
        <QrSettingsModal
          qr={settingsQr}
          onClose={() => setSettingsQr(null)}
          onSaved={() => { setSettingsQr(null); fetchItems(); }}
        />
      )}

      {/* Asset Selector Modal
          WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (A안): usageType="qr" 제거 —
          QR은 file/content/external-link 모두 연결 가능하므로 usage_type='qr' 태깅
          여부와 무관하게 전체 자산을 대상으로 노출한다 (autoLandingType 로 안전 변환). */}
      <StoreAssetSelectorModal
        open={showSelector}
        onSelect={handleLibrarySelect}
        onClose={() => setShowSelector(false)}
        // WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1 §7.4:
        //   QR 대상 범위 확장 — '운영자 콘텐츠'(kpa_contents ready) 소스 탭 활성화.
        enableContentHubSource
        // WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (B안):
        //   '블로그'(store_blog_posts) 소스 탭 활성화 — 내 매장 제작자료 중 블로그를 link 형 QR 로 연결.
        enableBlogSource
        // WO-O4O-KPA-QR-MULTILINGUAL-PRODUCT-LINK-SOURCE-V1:
        //   '다국어 제품 콘텐츠' 소스 탭 활성화 — publicKey 발급 후 공개 landing 으로 link 연결.
        enableMlcSource
        // WO-O4O-KPA-QR-ASSET-PICKER-INCLUDE-DIRECT-CONTENTS-V1:
        //   '내 매장 자료' 탭에 매장 직접 작성 콘텐츠(kpa_store_contents)도 병합 표시 → 콘텐츠 목록과 정합.
        enableDirectContentSource
      />

      {/* Print Template Modal */}
      <QrPrintTemplateModal
        open={showPrintModal}
        selectedQrs={items.filter((i) => selectedIds.has(i.id))}
        onConfirm={handleConfirmPrint}
        onClose={() => setShowPrintModal(false)}
      />

      {/* WO-O4O-KPA-STORE-QR-EXPORT-FILE-GUIDE-V1: 출력 파일 선택 안내 모달
          상황별 추천 파일/이유를 카드형으로 안내(모바일에서도 표 깨짐 없음). */}
      {showExportGuide && (
        <div style={styles.guideOverlay} onClick={() => setShowExportGuide(false)}>
          <div style={styles.guideModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.guideHeader}>
              <h2 style={styles.guideTitle}>QR 출력 파일은 이렇게 선택하세요</h2>
              <button onClick={() => setShowExportGuide(false)} style={styles.iconBtn} aria-label="닫기">
                <X size={20} />
              </button>
            </div>
            <div style={styles.guideBody}>
              {QR_EXPORT_GUIDE.map((g) => (
                <div key={g.situation} style={styles.guideCard}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.guideSituation}>{g.situation}</p>
                    <p style={styles.guideReason}>{g.reason}</p>
                  </div>
                  <span style={styles.guideRecommend}>{g.recommend}</span>
                </div>
              ))}
            </div>
            <div style={styles.guideFooterNote}>
              크기 조절이나 전문 출력소 전달이 필요하면 <strong>SVG (벡터)</strong>를 선택하세요.<br />
              약국에서 바로 종이에 출력할 때는 <strong>A4 PDF</strong>가 가장 간단합니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// WO-O4O-KPA-QR-AI-DESCRIPTION-SINGLE-CORNER-V1: QR 설정 모달 — 제목/slug/상담 CTA 를 기존 PUT API 로 수정.
function QrSettingsModal({ qr, onClose, onSaved }: { qr: StoreQrCode; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(qr.title || '');
  const [slug, setSlug] = useState(qr.slug || '');
  const [ctaEnabled, setCtaEnabled] = useState(!!qr.consultationCtaEnabled);
  const [ctaLabel, setCtaLabel] = useState(qr.consultationCtaLabel || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error('제목을 입력해 주세요'); return; }
    if (!slug.trim()) { toast.error('공개 URL(slug)을 입력해 주세요'); return; }
    setSaving(true);
    try {
      const res = await updateStoreQrCode(qr.id, {
        title: title.trim(),
        slug: slug.trim(),
        consultationCtaEnabled: ctaEnabled,
        consultationCtaLabel: ctaEnabled ? (ctaLabel.trim() || '상담 요청하기') : '',
      });
      if (res?.success) { toast.success('QR 설정이 저장되었습니다'); onSaved(); }
      else toast.error('저장에 실패했습니다');
    } catch (e: any) {
      toast.error(e?.message || 'slug 가 이미 사용 중이거나 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const ov: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 };
  const dlg: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 20, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' };
  const lab: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 500, color: colors.neutral600, margin: '12px 0 4px' };
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 13, border: `1px solid ${colors.neutral300}`, borderRadius: 6 };

  return (
    <div style={ov} onClick={onClose}>
      <div style={dlg} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: colors.neutral800 }}>QR 설정</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.neutral400 }}><X size={18} /></button>
        </div>
        <label style={lab}>제목</label>
        <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label style={lab}>공개 URL (slug)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, color: colors.neutral400 }}>/qr/</span>
          <input style={{ ...inp, margin: 0 }} value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <label style={{ ...lab, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={ctaEnabled} onChange={(e) => setCtaEnabled(e.target.checked)} />
          상담 요청 버튼 표시
        </label>
        {ctaEnabled && (
          <input style={inp} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="상담 요청하기" />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${colors.neutral300}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: colors.neutral700 }}>취소</button>
          <button type="button" onClick={save} disabled={saving} style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 스타일 ──
