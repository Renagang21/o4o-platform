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

import { useState, useEffect, useCallback } from 'react';
import { QrCode, Plus, Trash2, ExternalLink, Copy, Check, RefreshCw, BarChart3, X, Smartphone, Monitor, Tablet, Download, Printer, ArrowRight } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { colors } from '../../styles/theme';
import { StoreQRCreateEntryModal } from '../../components/store/StoreQRCreateEntryModal';
import { StoreLibrarySelectorModal } from '../../components/store/StoreLibrarySelectorModal';
import type { LibrarySelectorResult } from '../../components/store/StoreLibrarySelectorModal';
import { QrPrintTemplateModal } from './QrPrintTemplateModal';
import type { PrintTemplate } from './QrPrintTemplateModal';
import {
  getStoreQrCodes,
  createStoreQrCode,
  deleteStoreQrCode,
  getQrAnalytics,
} from '../../api/storeQr';
import type { StoreQrCode, QrAnalyticsData } from '../../api/storeQr';
import { getListings } from '../../api/pharmacyProducts';
import { fetchLocalProducts } from '../../api/localProducts';
import { getAccessToken } from '../../contexts/AuthContext';

const LANDING_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'product', label: '제품' },
  { value: 'promotion', label: '행사' },
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
};

function autoLandingType(assetType: string): string {
  if (assetType === 'external-link') return 'link';
  return 'page'; // file, content → page
}

export function StoreQRPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<StoreQrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<LibrarySelectorResult | null>(null);
  const [formSlug, setFormSlug] = useState('');
  const [formLandingType, setFormLandingType] = useState('product');
  const [formLandingTargetId, setFormLandingTargetId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Analytics state
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<QrAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Print / download state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

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

  // Router state 기반 자동 선택 (StoreLibraryNewPage에서 복귀 시)
  useEffect(() => {
    const state = location.state as { selectedLibraryItem?: Record<string, unknown> } | null;
    const item = state?.selectedLibraryItem;
    if (item && typeof item.id === 'string') {
      handleLibrarySelect({
        id: item.id as string,
        title: (item.title as string) || '',
        category: (item.category as string) || null,
        fileUrl: (item.fileUrl as string) || null,
        assetType: (item.assetType as string) || 'file',
        url: (item.url as string) || null,
        htmlContent: (item.htmlContent as string) || null,
      });
      // 뒤로가기 시 재트리거 방지
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLibrarySelect = (item: LibrarySelectorResult) => {
    setSelectedLibrary(item);
    setFormSlug(toSlug(item.title));
    setFormLandingType(autoLandingType(item.assetType || 'file'));
    setFormLandingTargetId(item.assetType === 'external-link' && item.url ? item.url : '');
    setFormError(null);
    setShowSelector(false);
    setShowEntryModal(false);
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
      const res = await createStoreQrCode({
        title: selectedLibrary.title,
        type: formLandingType,
        libraryItemId: selectedLibrary.id,
        landingType: formLandingType,
        landingTargetId: formLandingTargetId || undefined,
        slug: formSlug.trim(),
      });

      if (res.success && res.data) {
        setItems((prev) => [res.data, ...prev]);
        setCreating(false);
        setSelectedLibrary(null);
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleDownload = (id: string, format: 'png' | 'svg') => {
    const url = `${apiBase}/pharmacy/qr/${id}/image?format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadMenuId(null);
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
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/store" style={{ color: colors.neutral400, fontSize: '13px', textDecoration: 'none' }}>
              매장 관리
            </Link>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>QR 코드</span>
          </div>
          <h1 style={styles.title}>QR 코드 관리</h1>
          <p style={styles.subtitle}>Library 자료를 QR 코드로 연결하여 오프라인에서 온라인으로 유도합니다</p>
        </div>
        <button onClick={() => setShowEntryModal(true)} style={styles.addBtn}>
          <Plus size={16} />
          QR 코드 생성
        </button>
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

      {/* Create Form */}
      {creating && selectedLibrary && (
        <div style={styles.createForm}>
          <h3 style={styles.formTitle}>새 QR 코드 설정</h3>

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
              onClick={() => { setCreating(false); setSelectedLibrary(null); setShowEntryModal(true); }}
              style={styles.changeLibraryBtn}
            >
              자료 변경
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={styles.formRow}>
            <label style={styles.formLabel}>슬러그 (URL 경로)</label>
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

          <div style={styles.formRow}>
            <label style={styles.formLabel}>랜딩 유형</label>
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

          <div style={styles.formRow}>
            <label style={styles.formLabel}>
              {formLandingType === 'product' ? '연결 상품 (선택)' : formLandingType === 'link' ? '랜딩 대상 (URL)' : '랜딩 대상 ID (선택)'}
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
                placeholder={formLandingType === 'link' ? 'https://example.com' : '대상 ID (비워두면 자료 페이지로 이동)'}
              />
            )}
          </div>

          {formError && <p style={styles.formError}>{formError}</p>}

          <div style={styles.formActions}>
            <button
              onClick={() => { setCreating(false); setSelectedLibrary(null); }}
              style={styles.cancelBtn}
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? '저장 중...' : 'QR 코드 생성'}
            </button>
          </div>
        </div>
      )}

      {/* QR Code List */}
      <div style={styles.body}>
        {loading ? (
          <div style={styles.emptyState}>
            <RefreshCw size={24} style={{ color: colors.neutral300, marginBottom: '12px' }} />
            <p style={{ color: colors.neutral500, fontSize: '14px', margin: 0 }}>불러오는 중...</p>
          </div>
        ) : items.length === 0 && !creating ? (
          <div style={styles.emptyState}>
            <QrCode size={48} style={{ color: colors.neutral300, marginBottom: '12px' }} />
            <p style={{ color: colors.neutral500, fontSize: '14px', margin: 0 }}>
              등록된 QR 코드가 없습니다
            </p>
            <p style={{ color: colors.neutral400, fontSize: '13px', marginTop: '4px' }}>
              "QR 코드 생성" 버튼을 눌러 Library에서 자료를 선택하세요
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {items.map((item) => (
              <div key={item.id}>
                <div style={styles.card}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => handleToggleSelect(item.id)}
                    style={styles.checkbox}
                  />
                  <div style={styles.cardIcon}>
                    <QrCode size={24} style={{ color: colors.primary }} />
                  </div>
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{item.title}</p>
                    <div style={styles.cardMeta}>
                      <span style={styles.cardBadge}>
                        {LANDING_TYPE_OPTIONS.find((o) => o.value === item.landingType)?.label || item.landingType}
                      </span>
                      <span style={styles.cardSlug}>/qr/{item.slug}</span>
                      {(item.scanCount ?? 0) > 0 && (
                        <span style={styles.scanBadge}>{item.scanCount}회 스캔</span>
                      )}
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setDownloadMenuId(downloadMenuId === item.id ? null : item.id)}
                        style={styles.iconBtn}
                        title="QR 다운로드"
                      >
                        <Download size={16} />
                      </button>
                      {downloadMenuId === item.id && (
                        <div style={styles.downloadMenu}>
                          <button
                            onClick={() => handleDownload(item.id, 'png')}
                            style={styles.downloadMenuItem}
                          >
                            PNG 다운로드
                          </button>
                          <button
                            onClick={() => handleDownload(item.id, 'svg')}
                            style={styles.downloadMenuItem}
                          >
                            SVG 다운로드
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleShowAnalytics(item.id)}
                      style={{
                        ...styles.iconBtn,
                        color: analyticsId === item.id ? colors.primary : colors.neutral400,
                      }}
                      title="스캔 통계"
                    >
                      {analyticsId === item.id ? <X size={16} /> : <BarChart3 size={16} />}
                    </button>
                    <button
                      onClick={() => handleCopyUrl(item.slug, item.id)}
                      style={styles.iconBtn}
                      title="QR URL 복사"
                    >
                      {copiedId === item.id ? <Check size={16} style={{ color: colors.primary }} /> : <Copy size={16} />}
                    </button>
                    <a
                      href={`/qr/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.iconBtn}
                      title="QR 페이지 열기"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={styles.iconBtn}
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {/* Analytics Panel */}
                {analyticsId === item.id && (
                  <div style={styles.analyticsPanel}>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry Modal — 2-choice (기존 자료 선택 / 새 자산 만들기) */}
      <StoreQRCreateEntryModal
        open={showEntryModal}
        onSelectExisting={() => {
          setShowEntryModal(false);
          setShowSelector(true);
        }}
        onCreateNew={() => {
          setShowEntryModal(false);
          navigate('/store/operation/library/new?from=qr-create');
        }}
        onClose={() => setShowEntryModal(false)}
      />

      {/* Library Selector Modal */}
      <StoreLibrarySelectorModal
        open={showSelector}
        onSelect={handleLibrarySelect}
        onClose={() => setShowSelector(false)}
        onCreateNew={() => {
          setShowSelector(false);
          navigate('/store/operation/library/new?from=qr-create');
        }}
      />

      {/* Print Template Modal */}
      <QrPrintTemplateModal
        open={showPrintModal}
        selectedQrs={items.filter((i) => selectedIds.has(i.id))}
        onConfirm={handleConfirmPrint}
        onClose={() => setShowPrintModal(false)}
      />
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
  downloadMenu: {
    position: 'absolute',
    top: '34px',
    right: 0,
    zIndex: 10,
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    minWidth: '130px',
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
};
