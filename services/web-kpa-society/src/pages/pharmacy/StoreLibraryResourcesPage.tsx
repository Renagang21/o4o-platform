/**
 * StoreLibraryResourcesPage — 내 자료함 / 자료
 *
 * WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1: checkbox + 제작 시작 진입
 *
 * 매장이 보유한 자료실 아이템 (file / external-link / content) 목록.
 * Backend: GET /pharmacy/library — store_library_items 기존 active API 재사용.
 *
 * 본 페이지는 제작 시작 단일 진입점:
 *   자료 선택 → "제작 시작" → modal → 편집기 route 이동
 */

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { Library, ExternalLink, Trash2, RefreshCw, FileDown, Link as LinkIcon, FileText, Sparkles } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  getStoreLibraryItems,
  deleteStoreLibraryItem,
  type StoreLibraryItem,
  type AssetType,
} from '../../api/storeLibrary';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource } from './StartProductionModal';

const PAGE_LIMIT = 50;

const ASSET_TYPE_LABEL: Record<AssetType, { label: string; bg: string; color: string; Icon: typeof FileText }> = {
  file:            { label: '파일',     bg: '#EFF6FF', color: '#2563EB', Icon: FileDown },
  content:         { label: '콘텐츠',   bg: '#DCFCE7', color: '#16A34A', Icon: FileText },
  'external-link': { label: '외부 링크', bg: '#FEF3C7', color: '#D97706', Icon: LinkIcon },
};

export default function StoreLibraryResourcesPage() {
  const [items, setItems] = useState<StoreLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<ProductionSource | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStoreLibraryItems({ page: 1, limit: PAGE_LIMIT });
      setItems(res.data?.items || []);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message || '불러오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 자료를 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await deleteStoreLibraryItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('삭제되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = items.length > 0 && items.every((it) => selected.has(it.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((it) => it.id)));
  };

  const handleStartProduction = () => {
    if (selected.size === 0) return;
    const sourceItems: ProductionSource['items'] = items
      .filter((it) => selected.has(it.id))
      .map((it) => ({
        id: it.id,
        title: it.title,
        description: it.description,
        origin: 'library',
      }));
    setModalSource({ fromLibrary: 'resources', items: sourceItems });
    setModalOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 자료를 삭제하시겠습니까?`)) return;
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map((id) => deleteStoreLibraryItem(id)));
      setItems((prev) => prev.filter((it) => !selected.has(it.id)));
      setSelected(new Set());
      toast.success(`${ids.length}개 삭제되었습니다`);
    } catch (e: any) {
      toast.error(e?.message || '일괄 삭제에 실패했습니다');
    }
  };

  const openHref = (item: StoreLibraryItem): string | null => {
    if (item.assetType === 'file' && item.fileUrl) return item.fileUrl;
    if (item.assetType === 'external-link' && item.url) return item.url;
    return null;
  };

  const visibleItems = useMemo(() => items, [items]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 자료함</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>자료</span>
          </div>
          <h1 style={styles.title}>
            <Library size={20} style={{ color: colors.primary }} />
            자료
          </h1>
          <p style={styles.subtitle}>
            보유한 자료를 선택하여 POP / QR / 블로그 / 상품 상세설명 제작을 시작합니다.
          </p>
        </div>
        <button onClick={fetchItems} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* Batch toolbar */}
      {visibleItems.length > 0 && (
        <div style={styles.toolbar}>
          <label style={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={styles.checkbox}
            />
            전체 선택 ({selected.size}/{visibleItems.length})
          </label>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={handleStartProduction}
            disabled={selected.size === 0}
            style={{ ...styles.startBtn, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            <Sparkles size={14} />
            제작 시작
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selected.size === 0}
            style={{ ...styles.bulkDeleteBtn, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            <Trash2 size={14} />
            선택 삭제
          </button>
        </div>
      )}

      {loading ? (
        <div style={styles.empty}>불러오는 중...</div>
      ) : visibleItems.length === 0 ? (
        <div style={styles.empty}>
          <Library size={32} style={{ color: colors.neutral300, marginBottom: 12 }} />
          <p style={{ margin: 0, color: colors.neutral500, fontSize: 14 }}>
            보관된 자료가 없습니다.
          </p>
          <p style={{ margin: '6px 0 0', color: colors.neutral400, fontSize: 12 }}>
            커뮤니티 자료실 또는 공급자 라이브러리에서 자료를 가져와 매장에 보관할 수 있습니다.
          </p>
        </div>
      ) : (
        <ul style={styles.list}>
          {visibleItems.map((item) => {
            const meta = ASSET_TYPE_LABEL[item.assetType] ?? ASSET_TYPE_LABEL.file;
            const href = openHref(item);
            return (
              <li key={item.id} style={styles.listItem}>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleOne(item.id)}
                  style={styles.checkbox}
                  aria-label={`${item.title} 선택`}
                />
                <div style={styles.itemMain}>
                  <meta.Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={styles.itemTitle}>{item.title}</span>
                    {item.description && (
                      <span style={styles.itemDesc}>{item.description}</span>
                    )}
                  </div>
                  <span style={{ ...styles.badge, background: meta.bg, color: meta.color }}>{meta.label}</span>
                  {item.category && (
                    <span style={{ ...styles.badge, background: colors.neutral100, color: colors.neutral600 }}>
                      {item.category}
                    </span>
                  )}
                </div>
                <div style={styles.itemMeta}>
                  <span style={styles.metaText}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : ''}
                  </span>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.openLink}
                      title="원본 열기"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    style={styles.deleteBtn}
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <StartProductionModal
        open={modalOpen}
        source={modalSource}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.neutral400,
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '6px 0 0',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    marginBottom: '12px',
  },
  selectAllLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
  bulkDeleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '12px 14px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
  },
  itemMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemDesc: {
    fontSize: '12px',
    color: colors.neutral500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '4px',
    flexShrink: 0,
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  metaText: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  openLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    color: colors.neutral500,
    borderRadius: '4px',
    textDecoration: 'none',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    color: colors.neutral400,
    cursor: 'pointer',
    borderRadius: '4px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    textAlign: 'center',
  },
};
