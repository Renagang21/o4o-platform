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

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, Trash2, ExternalLink, Copy, Check, BarChart3, X, Smartphone, Monitor, Tablet, Download, Printer, ArrowRight, FolderOpen, Sparkles, LayoutTemplate, Info } from 'lucide-react';
// WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1: list rendering 표준 테이블 (자체 selection + bulk print 보존)
import { DataTable, type Column } from '@o4o/ui';
import { getStoreExecutionAsset } from '../../api/storeExecutionAssets';
import { Link, useLocation } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { GuideBlock } from '@o4o/shared-space-ui';
import { AiContentModal } from '@o4o/content-editor';
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
  getQrAnalytics,
  // WO-O4O-KPA-STORE-QR-PRINT-EXPORT-UI-WIRING-V1: export foundation 연결
  downloadQrExport,
  QR_EXPORT_PRESETS,
} from '../../api/storeQr';
import type { StoreQrCode, QrAnalyticsData, QrExportFormat, QrExportPreset } from '../../api/storeQr';
import { getListings } from '../../api/pharmacyProducts';
import { fetchLocalProducts } from '../../api/localProducts';
import { getAccessToken } from '../../contexts/AuthContext';
import { GuideBackLink } from '@o4o/store-ui-core';

const LANDING_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'product', label: '제품' },
  { value: 'page', label: '콘텐츠' },
  { value: 'link', label: '외부 링크' },
];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[가-힣]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || `qr-${Date.now()}`;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  file: '파일',
  content: '콘텐츠',
  'external-link': '외부 링크',
  // WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (B안): 블로그 대상 배지
  blog: '블로그',
  // WO-O4O-KPA-QR-MULTILINGUAL-PRODUCT-LINK-SOURCE-V1: 다국어 제품 콘텐츠 배지
  mlc: '다국어 제품',
};

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

// WO-O4O-KPA-STORE-QR-EXPORT-MENU-CLIP-FIX-V1:
//   QR 목록은 @o4o/ui DataTable(BaseTable) 을 쓰는데, 내부 wrapper 가 `overflow-x-auto` 라
//   CSS 규칙상 overflow-y 도 visible 이 아닌 auto 로 계산되어 행 내 position:absolute 출력
//   메뉴가 세로로 잘린다. BaseTable 은 공통 표준(가로 스크롤 필요)이라 수정하지 않고,
//   출력 메뉴를 body 로 portal(position:fixed) 하여 클리핑을 우회한다. 화면 하단 공간이
//   부족하면 위로 펼치고, 바깥 클릭/스크롤/리사이즈 시 닫는다.
function QrExportMenu({ exporting, onExport }: {
  exporting: boolean;
  onExport: (format: QrExportFormat, preset: QrExportPreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [rect, setRect] = useState<{ top: number; bottom: number; right: number } | null>(null);

  const MENU_W = 200;
  const MENU_H = 248; // QR_EXPORT_PRESETS 5항목 근사 높이

  const toggle = () => {
    if (exporting) return;
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.top, bottom: r.bottom, right: r.right });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const openUp = rect ? (window.innerHeight - rect.bottom < MENU_H && rect.top > MENU_H) : false;
  const left = rect ? Math.max(8, rect.right - MENU_W) : 0;

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        style={{ ...styles.downloadBtn, opacity: exporting ? 0.6 : 1, cursor: exporting ? 'wait' : 'pointer' }}
        disabled={exporting}
        title="QR 출력/다운로드"
      >
        <Download size={14} />
        {exporting ? '준비 중…' : '출력'}
      </button>
      {open && rect && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'fixed',
              left,
              ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
              zIndex: 1001,
              width: MENU_W,
              ...styles.downloadMenuPortal,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {QR_EXPORT_PRESETS.map((opt) => (
              <button
                key={`${opt.format}-${opt.preset}`}
                onClick={() => { setOpen(false); onExport(opt.format, opt.preset); }}
                style={styles.downloadMenuItem}
              >
                <span style={{ display: 'block', fontWeight: 600, color: colors.neutral700 }}>{opt.label}</span>
                <span style={{ display: 'block', fontSize: '11px', color: colors.neutral400, marginTop: '1px' }}>{opt.hint}</span>
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

export function StoreQRPage() {
  const location = useLocation();

  const [items, setItems] = useState<StoreQrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  const [aiOpen, setAiOpen] = useState(false);
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

  const fetchItems = useCallback(async () => {
    try {
      const res = await getStoreQrCodes({ limit: 100 });
      if (res.success && res.data) {
        setItems(res.data.items);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Load product options when landingType is 'product'
  useEffect(() => {
    if (formLandingType !== 'product' || !creating) return;
    setLoadingProducts(true);
    Promise.all([
      getListings().catch(() => ({ success: false as const, data: [] as any[] })),
      fetchLocalProducts({ limit: 100 }).catch(() => ({ items: [] as any[], total: 0, page: 1, limit: 100 })),
    ]).then(([listingsRes, localRes]) => {
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
      setLoadingProducts(false);
    });
  }, [formLandingType, creating]);

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
        type: 'video',
        landingType: 'video',
        landingTargetId: videoTarget.id,
        slug: formSlug.trim(),
      });
      if (res.success && res.data) {
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

  // WO-O4O-QR-TEMPLATE-WORKFLOW-V1: AI 문구 생성 결과 주입
  // html에서 title과 description을 추출해 form state에 반영.
  // QR은 짧은 structured output이므로 첫 heading → title, 첫 p → description.
  const handleAiInsert = useCallback(({ html, title: aiTitle }: { html: string; title: string }) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const titleFromHtml = doc.querySelector('h1,h2,h3')?.textContent?.trim() || '';
    const descFromHtml = doc.querySelector('p')?.textContent?.trim() || '';
    const finalTitle = aiTitle?.trim() || titleFromHtml;
    const finalDesc = descFromHtml;

    if (finalTitle) setFormTitle(finalTitle);
    if (finalDesc) setFormDescription(finalDesc.slice(0, 150));
    setAiOpen(false);
    toast.success('AI 문구가 적용되었습니다. 내용을 확인하고 QR을 저장하세요.');
  }, []);

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
        type: isPageRef ? 'page' : formLandingType,
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

  const handleDelete = async (id: string) => {
    if (!confirm('이 QR 코드를 삭제하시겠습니까?')) return;
    try {
      await deleteStoreQrCode(id);
      setItems((prev) => prev.filter((q) => q.id !== id));
    } catch {
      // silent
    }
  };

  const handleCopyUrl = (slug: string, id: string) => {
    const url = `${window.location.origin}/qr/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
    ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
    : '/api/v1/kpa';

  // WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1: 자체 row checkbox 제거 (DataTable rowSelection 통일).
  // handleToggleSelect 는 더 이상 사용처 없음 — 행 selection 은 DataTable 이 처리.
  // handleSelectAll 은 외부 toolbar 의 "전체 선택" 라벨에서 그대로 사용.

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
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

  const qrBaseUrl = `${window.location.origin}/qr/`;

  return (
    <div style={styles.container}>
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
            <Link to="/store" style={{ color: colors.neutral400, fontSize: '13px', textDecoration: 'none' }}>
              매장 실행
            </Link>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>QR 코드</span>
          </div>
          <h1 style={styles.title}>QR 코드</h1>
          <p style={styles.subtitle}>매장에 부착·재사용할 QR 코드를 모아 출력합니다</p>
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
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowSelector(true)}
            style={styles.addBtn}
          >
            <QrCode size={14} />
            QR 만들기
          </button>
          <Link to="/store-hub/qr" style={styles.hubImportBtn}>
            <Download size={14} />
            매장 HUB에서 가져오기
          </Link>
        </div>
      </div>

      {/* Batch Print Toolbar */}
      {items.length > 0 && (
        <div style={styles.printToolbar}>
          <label style={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={selectedIds.size === items.length && items.length > 0}
              onChange={handleSelectAll}
              style={styles.checkbox}
            />
            전체 선택 ({selectedIds.size}/{items.length})
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

      {/* WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 동영상 전용 QR 생성 폼 (library 자료 흐름과 분리) */}
      {creating && videoTarget && (
        <div style={styles.createForm}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={styles.formTitle}>동영상 QR 만들기</h3>
            <p style={{ fontSize: '12px', color: colors.neutral400, margin: '6px 0 0' }}>
              QR 스캔 시 동영상 전용 화면이 열립니다 (일반 메뉴 없이 동영상만 표시).
            </p>
          </div>

          {/* 연결 대상 동영상 (읽기 전용) */}
          <div style={styles.selectedLibraryCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={styles.assetTypeBadge}>동영상</span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.neutral800 }}>
                {videoTarget.title}
              </p>
            </div>
          </div>

          <div style={styles.formRow}>
            <label style={styles.formLabel}>QR 제목</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              style={styles.input}
              placeholder="QR 스캔 후 표시될 제목"
              maxLength={60}
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.formLabel}>짧은 안내문 (선택)</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              style={styles.input}
              placeholder="QR 스캔 후 표시될 짧은 설명 (선택)"
              maxLength={150}
            />
          </div>

          <div style={styles.formRow}>
            <label style={styles.formLabel}>QR 주소 (URL 경로)</label>
            <div style={styles.slugPreview}>
              <span style={styles.slugBase}>{qrBaseUrl}</span>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                style={styles.slugInput}
                placeholder="my-video-qr"
              />
            </div>
          </div>

          {formError && <p style={styles.formError}>{formError}</p>}

          <div style={styles.formActions}>
            <button
              onClick={() => { setCreating(false); setVideoTarget(null); }}
              style={styles.cancelBtn}
            >
              취소
            </button>
            <button
              onClick={handleCreateVideo}
              disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? '저장 중...' : 'QR 만들기'}
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {creating && selectedLibrary && (
        <div style={styles.createForm}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={styles.formTitle}>새 QR 만들기</h3>
            {/* WO-O4O-QR-TEMPLATE-WORKFLOW-V1: template badge */}
            {selectedTemplate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={styles.templateBadge}>
                  <LayoutTemplate size={11} />
                  {selectedTemplate.name}
                  {selectedTemplate.style ? ` · ${selectedTemplate.style}` : ''}
                </span>
                <span style={{ fontSize: '12px', color: colors.neutral400 }}>
                  {selectedTemplate.description}
                </span>
              </div>
            )}
          </div>

          {/* 선택된 자료 정보 */}
          <div style={styles.selectedLibraryCard}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={styles.assetTypeBadge}>
                  {ASSET_TYPE_LABELS[selectedLibrary.assetType] || selectedLibrary.assetType}
                </span>
                {selectedLibrary.category && (
                  <span style={styles.categoryBadge}>{selectedLibrary.category}</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.neutral800 }}>
                {selectedLibrary.title}
              </p>
            </div>
            <button
              onClick={() => { setCreating(false); setSelectedLibrary(null); setShowSelector(true); }}
              style={styles.changeLibraryBtn}
            >
              자료 변경
              <ArrowRight size={14} />
            </button>
          </div>

          {/* WO-O4O-QR-TEMPLATE-WORKFLOW-V1: AI 문구 보조 배너 */}
          <div style={styles.aiBanner}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.aiBannerTitle}>✨ AI 문구 보조</div>
              <div style={styles.aiBannerDesc}>
                {selectedTemplate
                  ? `${selectedTemplate.name} 스타일로 QR 제목과 짧은 안내문을 생성합니다.`
                  : 'QR 스캔 후 보여줄 짧은 제목과 안내문을 AI로 생성합니다.'}
                {' '}선택 사항입니다.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              style={styles.aiBannerBtn}
            >
              <Sparkles size={13} />
              AI 문구 생성
            </button>
          </div>

          {/* WO-O4O-QR-TEMPLATE-WORKFLOW-V1: QR 제목 */}
          <div style={styles.formRow}>
            <label style={styles.formLabel}>QR 제목</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              style={styles.input}
              placeholder="QR 스캔 후 표시될 제목"
              maxLength={60}
            />
          </div>

          {/* WO-O4O-QR-TEMPLATE-WORKFLOW-V1: 짧은 안내문 */}
          <div style={styles.formRow}>
            <label style={styles.formLabel}>짧은 안내문 (선택)</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              style={styles.input}
              placeholder="QR 스캔 후 표시될 짧은 설명 (50자 이내 권장)"
              maxLength={150}
            />
            {formDescription && (
              <p style={{ fontSize: '11px', color: colors.neutral400, margin: '4px 0 0' }}>
                {formDescription.length}/150자
              </p>
            )}
          </div>

          <div style={styles.formRow}>
            <label style={styles.formLabel}>QR 주소 (URL 경로)</label>
            <div style={styles.slugPreview}>
              <span style={styles.slugBase}>{qrBaseUrl}</span>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                style={styles.slugInput}
                placeholder="my-qr-code"
              />
            </div>
          </div>

          {/* WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1 §7.4:
              운영자 콘텐츠(참조형)는 연결 유형/대상이 'page'+content.id 로 고정 — 잠금 안내로 대체. */}
          {selectedLibrary.source === 'content-hub' ? (
            <div style={{ marginBottom: '12px' }}>
              <GuideBlock
                variant="info"
                title="운영자 콘텐츠 연결 QR"
                description="QR을 스캔하면 선택한 운영자 콘텐츠가 표시됩니다. 운영자 원본을 가리키는 연결이며, 매장 사본을 만들지 않습니다(원본이 수정되면 함께 반영됩니다)."
                compact
              />
              {/* WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1: 콘텐츠 하단 상담 요청 버튼 옵션 (page 타입 전용) */}
              <div style={{ marginTop: '12px', padding: '12px', border: `1px solid ${colors.neutral200}`, borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ctaEnabled}
                    onChange={(e) => setCtaEnabled(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: colors.neutral800 }}>콘텐츠 하단에 상담 요청 버튼 표시</span>
                    <span style={{ display: 'block', fontSize: '12px', color: colors.neutral500, marginTop: '2px', lineHeight: 1.5 }}>
                      QR을 본 고객이 콘텐츠 하단에서 바로 상담을 요청할 수 있습니다. 요청은 매장 알림으로 전달됩니다.
                    </span>
                  </span>
                </label>
                {ctaEnabled && (
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    style={{ ...styles.input, marginTop: '10px' }}
                    placeholder="버튼 문구 (기본: 상담 요청하기)"
                    maxLength={100}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              <div style={styles.formRow}>
                <label style={styles.formLabel}>연결 유형</label>
                <select
                  value={formLandingType}
                  onChange={(e) => setFormLandingType(e.target.value)}
                  style={styles.select}
                >
                  {LANDING_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* WO-O4O-STORE-WORKSPACE-QR-PREFILL-V2: link 타입 추가 경고 */}
              {formLandingType === 'link' && (
                <div style={{ marginBottom: '12px' }}>
                  <GuideBlock
                    variant="warning"
                    title="URL 연결형 QR"
                    description="URL 연결형 QR입니다. QR 자체에 콘텐츠가 저장되지 않으며, 입력한 URL로 바로 이동합니다. 대상 URL이 사라지면 QR도 작동하지 않습니다."
                    compact
                  />
                </div>
              )}

              <div style={styles.formRow}>
                <label style={styles.formLabel}>
                  {formLandingType === 'product' ? '연결 상품 (선택)' : formLandingType === 'link' ? '연결 URL' : '연결 대상 (선택)'}
                </label>
                {formLandingType === 'product' ? (
                  <select
                    value={formLandingTargetId}
                    onChange={(e) => setFormLandingTargetId(e.target.value)}
                    style={styles.select}
                    disabled={loadingProducts}
                  >
                    <option value="">{loadingProducts ? '상품 목록 로딩 중...' : '상품 선택 (선택사항)'}</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formLandingTargetId}
                    onChange={(e) => setFormLandingTargetId(e.target.value)}
                    style={styles.input}
                    placeholder={formLandingType === 'link' ? 'https://example.com' : '비워두면 자료 페이지로 이동합니다'}
                  />
                )}
              </div>
            </>
          )}

          {formError && <p style={styles.formError}>{formError}</p>}

          <div style={styles.formActions}>
            <button
              onClick={() => { setCreating(false); setSelectedLibrary(null); setCtaEnabled(false); setCtaLabel(''); }}
              style={styles.cancelBtn}
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? '저장 중...' : 'QR 만들기'}
            </button>
          </div>
        </div>
      )}

      {/* QR Code List — WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1:
          카드형 → @o4o/ui DataTable. 자체 selectedIds (Set<string>) + handleBulkPrint
          (외부 toolbar) 는 그대로 보존 — DataTable rowSelection 은 Set ↔ Array 변환만.
          analytics 토글은 행 아래 펼침이 직접 지원 안 되므로 표 하단에 별도 패널로 표시. */}
      <div style={styles.body}>
        {!loading && items.length === 0 && !creating ? (
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
              <Link to="/store-hub/qr" style={styles.emptyCtaPrimary}>
                <Download size={14} />
                매장 HUB에서 QR 가져오기
              </Link>
              {/* WO-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1 (A안):
                  내 자료함(/store/library/resources) 이탈 링크 → 페이지 내 선택 모달 직접 오픈.
                  대상 범위가 콘텐츠·자료·내 매장 제작자료 전체임을 문구로 명시. */}
              <button
                type="button"
                onClick={() => setShowSelector(true)}
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
            <DataTable<StoreQrCode>
              rowSelection={{
                selectedRowKeys: Array.from(selectedIds),
                onChange: (keys) => setSelectedIds(new Set(keys)),
              }}
              columns={[
                {
                  key: 'title',
                  title: 'QR',
                  render: (_v, item) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: colors.neutral100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <QrCode size={18} style={{ color: colors.primary }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: colors.neutral800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p style={{ fontSize: '12px', color: colors.neutral500, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'landingType',
                  title: '유형',
                  align: 'center',
                  render: (_v, item) => (
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', backgroundColor: colors.neutral100, color: colors.neutral600 }}>
                      {LANDING_TYPE_OPTIONS.find((o) => o.value === item.landingType)?.label || item.landingType}
                    </span>
                  ),
                },
                {
                  key: 'slug',
                  title: 'URL',
                  render: (_v, item) => (
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: colors.neutral500 }}>
                      /qr/{item.slug}
                    </span>
                  ),
                },
                {
                  key: 'scanCount',
                  title: '스캔',
                  align: 'center',
                  render: (_v, item) => (
                    (item.scanCount ?? 0) > 0 ? (
                      <span style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>
                        {item.scanCount}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: colors.neutral400 }}>-</span>
                    )
                  ),
                },
                {
                  key: 'actions',
                  title: '액션',
                  align: 'right',
                  render: (_v, item) => (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      {/* WO-O4O-KPA-STORE-QR-EXPORT-MENU-CLIP-FIX-V1:
                          QR_EXPORT_PRESETS 메뉴(A4 PDF/4분할/PNG/SVG)를 portal 로 띄워 DataTable
                          overflow 클리핑 회피. handleExport 동작은 그대로 유지. */}
                      <QrExportMenu
                        exporting={exportingId === item.id}
                        onExport={(format, preset) => handleExport(item.id, format, preset)}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShowAnalytics(item.id); }}
                        style={{ ...styles.iconBtn, color: analyticsId === item.id ? colors.primary : colors.neutral400 }}
                        title="스캔 통계"
                      >
                        {analyticsId === item.id ? <X size={16} /> : <BarChart3 size={16} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyUrl(item.slug, item.id); }}
                        style={styles.iconBtn}
                        title="QR URL 복사"
                      >
                        {copiedId === item.id ? <Check size={16} style={{ color: colors.primary }} /> : <Copy size={16} />}
                      </button>
                      <a
                        href={`/qr/${item.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={styles.iconBtn}
                        title="QR 페이지 열기"
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        style={styles.iconBtn}
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ),
                },
              ] as Column<StoreQrCode>[]}
              dataSource={items}
              rowKey="id"
              loading={loading}
              emptyText="등록된 QR 코드가 없습니다"
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

      {/* WO-O4O-QR-TEMPLATE-WORKFLOW-V1: AI 문구 생성 모달 (template-aware) */}
      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
        headerLabel="QR 안내문 생성"
        urlPlaceholder="https://example.com/product 또는 QR 연결 대상 URL"
        templateId={selectedTemplate?.id}
        templateSystemPrompt={selectedTemplate?.systemPromptOverride}
        templateForcedOptions={selectedTemplate?.forcedOptions}
      />

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

// ── 스타일 ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  body: {
    minHeight: '300px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    border: `1px dashed ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: colors.neutral50,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    backgroundColor: '#fff',
  },
  cardIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  cardBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: colors.neutral100,
    fontSize: '11px',
    color: colors.neutral500,
  },
  cardSlug: {
    fontSize: '12px',
    color: colors.neutral400,
    fontFamily: 'monospace',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.neutral400,
    cursor: 'pointer',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    border: `1px solid ${colors.primary}`,
    backgroundColor: '#fff',
    color: colors.primary,
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  emptyStateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `1px solid ${colors.primary}`,
    backgroundColor: '#fff',
    color: colors.primary,
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  // WO-O4O-KPA-STORE-QR-WORKFLOW-UX-ALIGNMENT-V1: 빈 상태 3-CTA 행
  emptyCtaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '20px',
  },
  emptyCtaPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: 'none',
    backgroundColor: colors.primary,
    color: '#fff',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  emptyCtaDisabled: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `1px dashed ${colors.neutral200}`,
    backgroundColor: colors.neutral50,
    color: colors.neutral400,
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'not-allowed',
  },
  // 헤더 상시 노출 — 운영자 제공 QR 가져오기 동선
  hubImportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `1px solid ${colors.primary}`,
    backgroundColor: '#fff',
    color: colors.primary,
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Selected library card
  selectedLibraryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    marginBottom: '20px',
    backgroundColor: colors.neutral50,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
  },
  assetTypeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    fontSize: '11px',
    fontWeight: 500,
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: colors.neutral100,
    fontSize: '11px',
    color: colors.neutral500,
  },
  changeLibraryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    fontSize: '12px',
    color: colors.neutral600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  // Create form
  createForm: {
    padding: '20px',
    marginBottom: '24px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 4px',
  },
  formSubtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '0 0 20px',
  },
  formRow: {
    marginBottom: '16px',
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral600,
    marginBottom: '6px',
  },
  slugPreview: {
    display: 'flex',
    alignItems: 'center',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  slugBase: {
    padding: '8px 10px',
    backgroundColor: colors.neutral50,
    fontSize: '13px',
    color: colors.neutral400,
    whiteSpace: 'nowrap',
    borderRight: `1px solid ${colors.neutral200}`,
  },
  slugInput: {
    flex: 1,
    padding: '8px 10px',
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    fontFamily: 'monospace',
    color: colors.neutral800,
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral800,
    backgroundColor: '#fff',
    outline: 'none',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral800,
    outline: 'none',
    boxSizing: 'border-box',
  },
  formError: {
    fontSize: '13px',
    color: '#dc2626',
    margin: '0 0 12px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  },
  cancelBtn: {
    padding: '8px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },

  // Scan analytics
  scanBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: '#dbeafe',
    fontSize: '11px',
    color: '#2563eb',
    fontWeight: 500,
  },
  analyticsPanel: {
    padding: '16px',
    marginTop: '-1px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '0 0 10px 10px',
    backgroundColor: colors.neutral50,
  },
  analyticsLoading: {
    fontSize: '13px',
    color: colors.neutral400,
    textAlign: 'center',
    margin: 0,
    padding: '8px 0',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  statBox: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral100}`,
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  statLabel: {
    fontSize: '11px',
    color: colors.neutral500,
    margin: '2px 0 0',
  },
  deviceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '12px',
    color: colors.neutral600,
    padding: '2px 0',
  },

  // WO-O4O-QR-TEMPLATE-WORKFLOW-V1
  templateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    background: '#eef2ff',
    color: '#4f46e5',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 600,
  },
  aiBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    marginBottom: '16px',
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
  },
  aiBannerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4338ca',
    marginBottom: '2px',
  },
  aiBannerDesc: {
    fontSize: '12px',
    color: '#6366f1',
    lineHeight: 1.5,
  },
  aiBannerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  cardDescription: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '3px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '400px',
  },

  // Print / download
  printToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    marginBottom: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    border: `1px solid ${colors.neutral200}`,
  },
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: colors.primary,
    flexShrink: 0,
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  // WO-O4O-KPA-STORE-QR-EXPORT-MENU-CLIP-FIX-V1: portal 메뉴 박스 (위치는 인라인 fixed 로 지정)
  downloadMenuPortal: {
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    minWidth: '190px',
  },
  downloadMenuItem: {
    display: 'block',
    width: '100%',
    padding: '8px 14px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
    textAlign: 'left',
  },

  // WO-O4O-KPA-STORE-QR-EXPORT-FILE-GUIDE-V1: 파일 선택 안내 버튼 + 모달
  exportGuideBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    border: `1px solid ${colors.neutral200}`,
    backgroundColor: '#fff',
    color: colors.neutral600,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  guideOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  guideModal: {
    width: '560px',
    maxWidth: '95vw',
    maxHeight: '85vh',
    backgroundColor: '#fff',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  guideHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 12px',
  },
  guideTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  guideBody: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  guideCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    backgroundColor: colors.neutral50,
  },
  guideSituation: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  guideReason: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '3px 0 0',
    lineHeight: 1.5,
  },
  guideRecommend: {
    flexShrink: 0,
    maxWidth: '40%',
    padding: '4px 10px',
    backgroundColor: '#eef2ff',
    color: '#4338ca',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  guideFooterNote: {
    margin: '12px 24px 20px',
    padding: '12px 14px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    fontSize: '13px',
    color: colors.neutral700,
    lineHeight: 1.7,
  },
};
