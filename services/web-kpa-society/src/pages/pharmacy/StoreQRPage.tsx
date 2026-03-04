/**
 * StoreQRPage — 매장 QR 코드 관리
 *
 * WO-O4O-QR-LANDING-PAGE-V1
 *
 * Library에서 자료를 선택 → slug/landingType/landingTargetId 설정 → 백엔드 저장.
 * QR URL: /qr/{slug} (공개)
 */

import { useState, useEffect, useCallback } from 'react';
import { QrCode, Plus, Trash2, ExternalLink, Copy, Check, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';
import { StoreLibrarySelectorModal } from '../../components/store/StoreLibrarySelectorModal';
import type { LibrarySelectorResult } from '../../components/store/StoreLibrarySelectorModal';
import {
  getStoreQrCodes,
  createStoreQrCode,
  deleteStoreQrCode,
} from '../../api/storeQr';
import type { StoreQrCode } from '../../api/storeQr';

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

export function StoreQRPage() {
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
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleLibrarySelect = (item: LibrarySelectorResult) => {
    setSelectedLibrary(item);
    setFormSlug(toSlug(item.title));
    setFormLandingType('product');
    setFormLandingTargetId('');
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
        <button onClick={() => setShowSelector(true)} style={styles.addBtn}>
          <Plus size={16} />
          QR 코드 생성
        </button>
      </div>

      {/* Create Form */}
      {creating && selectedLibrary && (
        <div style={styles.createForm}>
          <h3 style={styles.formTitle}>새 QR 코드 설정</h3>
          <p style={styles.formSubtitle}>자료: {selectedLibrary.title}</p>

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
              랜딩 대상 ID {formLandingType === 'link' ? '(URL)' : '(선택)'}
            </label>
            <input
              type="text"
              value={formLandingTargetId}
              onChange={(e) => setFormLandingTargetId(e.target.value)}
              style={styles.input}
              placeholder={formLandingType === 'link' ? 'https://example.com' : '대상 ID (비워두면 자료 페이지로 이동)'}
            />
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
              <div key={item.id} style={styles.card}>
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
                  </div>
                </div>
                <div style={styles.cardActions}>
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
            ))}
          </div>
        )}
      </div>

      {/* Library Selector Modal */}
      <StoreLibrarySelectorModal
        open={showSelector}
        onSelect={handleLibrarySelect}
        onClose={() => setShowSelector(false)}
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
};
