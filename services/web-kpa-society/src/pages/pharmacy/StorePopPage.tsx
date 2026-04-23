/**
 * StorePopPage — 매장 POP 자료 관리
 *
 * WO-O4O-POP-LIBRARY-INTEGRATION-V1
 * WO-O4O-QR-POP-AUTO-GENERATOR-V1
 * WO-STORE-POP-ASSET-INTEGRATION-V1
 *
 * 2-choice 진입: "기존 자료 선택" | "새 자산 만들기"
 * Library에서 자료를 선택 → QR 코드 연결(선택) → A4/A5 레이아웃 → POP PDF 자동 생성.
 * 새 자산 생성 시 StoreLibraryNewPage에서 저장 후 자동 복귀.
 */

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Trash2, ExternalLink, FileDown, QrCode } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { colors } from '../../styles/theme';
import { StoreAssetSelectorModal } from '../../components/store/StoreAssetSelectorModal';
import type { AssetSelectorResult as LibrarySelectorResult } from '../../components/store/StoreAssetSelectorModal';
import { StoreQRCreateEntryModal } from '../../components/store/StoreQRCreateEntryModal';
import { getStoreQrCodes } from '../../api/storeQr';
import type { StoreQrCode } from '../../api/storeQr';

interface PopItem {
  id: string;
  title: string;
  category: string | null;
  fileUrl: string | null;
  assetType: string;
  url: string | null;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  file: '파일',
  content: '콘텐츠',
  'external-link': '외부 링크',
};

export function StorePopPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [popItems, setPopItems] = useState<PopItem[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);

  // QR selection
  const [qrCodes, setQrCodes] = useState<StoreQrCode[]>([]);
  const [selectedQrId, setSelectedQrId] = useState<string>('');

  // Layout + generate
  const [layout, setLayout] = useState<'A4' | 'A5'>('A4');
  const [generating, setGenerating] = useState(false);

  const fetchQrCodes = useCallback(async () => {
    try {
      const res = await getStoreQrCodes({ limit: 100 });
      if (res.success && res.data) {
        setQrCodes(res.data.items);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchQrCodes();
  }, [fetchQrCodes]);

  // 새 자산 생성 후 자동 복귀 (location.state에서 자료 수신)
  useEffect(() => {
    const state = location.state as { selectedLibraryItem?: Record<string, unknown> } | null;
    const item = state?.selectedLibraryItem;
    if (item && typeof item.id === 'string') {
      const newItem: PopItem = {
        id: item.id as string,
        title: (item.title as string) || '',
        category: (item.category as string) || null,
        fileUrl: (item.fileUrl as string) || null,
        assetType: (item.assetType as string) || 'file',
        url: (item.url as string) || null,
      };
      setPopItems((prev) => prev.some((p) => p.id === newItem.id) ? prev : [...prev, newItem]);
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (item: LibrarySelectorResult) => {
    if (popItems.some((p) => p.id === item.id)) {
      setShowSelector(false);
      return;
    }
    setPopItems((prev) => [...prev, {
      id: item.id,
      title: item.title,
      category: item.category,
      fileUrl: item.fileUrl,
      assetType: (item as any).assetType || 'file',
      url: (item as any).url || null,
    }]);
    setShowSelector(false);
  };

  const handleRemove = (id: string) => {
    setPopItems((prev) => prev.filter((p) => p.id !== id));
  };

  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
    : '/api/v1/kpa';

  const handleGenerate = async () => {
    if (popItems.length === 0) return;
    setGenerating(true);
    try {
      const resp = await fetch(`${apiBase}/pharmacy/pop/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          libraryItemIds: popItems.map((p) => p.id),
          qrId: selectedQrId || undefined,
          layout,
        }),
      });
      if (!resp.ok) throw new Error('Generate failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('POP PDF 생성에 실패했습니다');
    } finally {
      setGenerating(false);
    }
  };

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
            <span style={{ color: colors.neutral600, fontSize: '13px' }}>POP 자료</span>
          </div>
          <h1 style={styles.title}>POP 자료 관리</h1>
          <p style={styles.subtitle}>Library 자료를 선택하고 QR 코드를 연결하여 POP 광고를 PDF로 출력합니다</p>
        </div>
        <button onClick={() => setShowEntryModal(true)} style={styles.addBtn}>
          <Plus size={16} />
          자료 추가
        </button>
      </div>

      {/* POP Item List */}
      <div style={styles.body}>
        {popItems.length === 0 ? (
          <div style={styles.emptyState}>
            <Megaphone size={48} style={{ color: colors.neutral300, marginBottom: '12px' }} />
            <p style={{ color: colors.neutral500, fontSize: '14px', margin: 0 }}>
              POP 디스플레이에 사용할 자료가 없습니다
            </p>
            <p style={{ color: colors.neutral400, fontSize: '13px', marginTop: '4px' }}>
              "자료 추가" 버튼을 눌러 Library에서 자료를 추가하세요
            </p>
          </div>
        ) : (
          <>
            <div style={styles.list}>
              {popItems.map((item) => (
                <div key={item.id} style={styles.card}>
                  <div style={styles.cardIcon}>
                    <Megaphone size={24} style={{ color: '#f59e0b' }} />
                  </div>
                  <div style={styles.cardInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={styles.cardTitle}>{item.title}</p>
                      <span style={styles.assetTypeBadge}>
                        {ASSET_TYPE_LABELS[item.assetType] || item.assetType}
                      </span>
                    </div>
                    {item.category && (
                      <span style={styles.cardCategory}>{item.category}</span>
                    )}
                    {item.assetType === 'external-link' && item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.cardLink}
                      >
                        <ExternalLink size={12} /> {item.url}
                      </a>
                    ) : item.fileUrl ? (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.cardLink}
                      >
                        <ExternalLink size={12} /> URL 열기
                      </a>
                    ) : null}
                  </div>
                  <button onClick={() => handleRemove(item.id)} style={styles.removeBtn}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Generate Settings */}
            <div style={styles.settingsPanel}>
              <h3 style={styles.settingsTitle}>POP 생성 설정</h3>

              {/* QR Selection */}
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>
                  <QrCode size={14} style={{ marginRight: '6px' }} />
                  QR 코드 연결 (선택사항)
                </label>
                <select
                  value={selectedQrId}
                  onChange={(e) => setSelectedQrId(e.target.value)}
                  style={styles.select}
                >
                  <option value="">QR 코드 없음</option>
                  {qrCodes.map((qr) => (
                    <option key={qr.id} value={qr.id}>
                      {qr.title} (/qr/{qr.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Layout Selection */}
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>레이아웃</label>
                <div style={styles.layoutToggle}>
                  <button
                    onClick={() => setLayout('A4')}
                    style={{
                      ...styles.layoutBtn,
                      ...(layout === 'A4' ? styles.layoutBtnActive : {}),
                    }}
                  >
                    A4 (1장 1개)
                  </button>
                  <button
                    onClick={() => setLayout('A5')}
                    style={{
                      ...styles.layoutBtn,
                      ...(layout === 'A5' ? styles.layoutBtnActive : {}),
                    }}
                  >
                    A5 (1장 2개)
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || popItems.length === 0}
                style={{
                  ...styles.generateBtn,
                  opacity: generating ? 0.7 : 1,
                }}
              >
                <FileDown size={16} />
                {generating ? 'PDF 생성 중...' : `POP PDF 생성 (${popItems.length}개)`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Entry Modal — 2-choice 진입 */}
      <StoreQRCreateEntryModal
        open={showEntryModal}
        title="POP 자료 추가 방식"
        onSelectExisting={() => { setShowEntryModal(false); setShowSelector(true); }}
        onCreateNew={() => { setShowEntryModal(false); navigate('/store/content'); }}
        onClose={() => setShowEntryModal(false)}
      />

      {/* Asset Selector Modal */}
      <StoreAssetSelectorModal
        open={showSelector}
        onSelect={handleSelect}
        onClose={() => setShowSelector(false)}
        usageType="pop"
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
    marginBottom: '20px',
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
  assetTypeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
    fontSize: '11px',
    fontWeight: 500,
    color: '#15803d',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  cardCategory: {
    display: 'inline-block',
    marginTop: '4px',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: colors.neutral100,
    fontSize: '11px',
    color: colors.neutral500,
  },
  cardLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '6px',
    fontSize: '12px',
    color: colors.primary,
    textDecoration: 'none',
  },
  removeBtn: {
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
    flexShrink: 0,
  },

  // Settings panel
  settingsPanel: {
    padding: '20px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    backgroundColor: '#fff',
  },
  settingsTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 16px',
  },
  settingRow: {
    marginBottom: '16px',
  },
  settingLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral600,
    marginBottom: '6px',
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
  layoutToggle: {
    display: 'flex',
    gap: '8px',
  },
  layoutBtn: {
    padding: '8px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  layoutBtnActive: {
    backgroundColor: colors.primary,
    color: '#fff',
    borderColor: colors.primary,
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    marginTop: '20px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
