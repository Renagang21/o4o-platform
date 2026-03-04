/**
 * StoreLibraryPage — 매장 자료실 목록
 *
 * WO-O4O-STORE-LIBRARY-LIST-UI-V1
 *
 * Card UI 기반 목록 + 검색 + 카테고리 필터 + 삭제
 * API: GET /api/v1/kpa/pharmacy/library
 * 백엔드 수정 금지 / Neture API 호출 금지
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ExternalLink, Search, Trash2, Edit2, Eye, FileText, Image, Film, File } from 'lucide-react';
import { colors } from '../../styles/theme';
import { getStoreLibraryItems, deleteStoreLibraryItem } from '../../api/storeLibrary';
import type { StoreLibraryItem } from '../../api/storeLibrary';

const NETURE_URL = import.meta.env.VITE_NETURE_URL || '';

const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'banner', label: 'banner' },
  { value: 'promotion', label: 'promotion' },
  { value: 'signage', label: 'signage' },
  { value: 'qr', label: 'qr' },
  { value: 'manual', label: 'manual' },
  { value: '__other', label: '기타' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

export function StoreLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StoreLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StoreLibraryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getStoreLibraryItems({ limit: 200 });
      setItems(result.data?.items || []);
    } catch (err: any) {
      setError(err.message || '자료를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    let result = items;

    // Category filter
    if (categoryFilter) {
      if (categoryFilter === '__other') {
        const knownCategories = CATEGORIES.filter(c => c.value && c.value !== '__other').map(c => c.value);
        result = result.filter(item => !item.category || !knownCategories.includes(item.category));
      } else {
        result = result.filter(item => item.category === categoryFilter);
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [items, search, categoryFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStoreLibraryItem(deleteTarget.id);
      setDeleteTarget(null);
      loadItems();
    } catch {
      setError('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>자료실</h1>
          <p style={styles.subtitle}>매장에서 사용하는 자료를 관리합니다.</p>
        </div>
        <div style={styles.headerActions}>
          {NETURE_URL && (
            <button
              onClick={() => window.open(`${NETURE_URL}/library`, '_blank')}
              style={styles.secondaryButton}
            >
              <ExternalLink size={16} />
              Neture 자료 보기
            </button>
          )}
          <button onClick={() => navigate('/store/library/new')} style={styles.primaryButton}>
            <Plus size={16} />
            자료 등록
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={16} style={{ color: colors.neutral400 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 설명, 카테고리 검색"
            style={styles.searchInput}
          />
        </div>
        <div style={styles.categoryTabs}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              style={{
                ...styles.categoryTab,
                ...(categoryFilter === cat.value ? styles.categoryTabActive : {}),
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBanner}>
          <p style={{ margin: 0, fontSize: '13px', color: colors.error }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.cardGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={styles.skeletonCard}>
              <div style={styles.skeletonImage} />
              <div style={styles.skeletonLine} />
              <div style={{ ...styles.skeletonLine, width: '60%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filteredItems.length === 0 && (
        <div style={styles.emptyState}>
          <FileText size={48} style={{ color: colors.neutral300, marginBottom: '16px' }} />
          <p style={styles.emptyTitle}>등록된 자료가 없습니다.</p>
          <button onClick={() => navigate('/store/library/new')} style={styles.primaryButton}>
            <Plus size={16} />
            자료 등록
          </button>
        </div>
      )}

      {/* Card Grid */}
      {!loading && filteredItems.length > 0 && (
        <div style={styles.cardGrid}>
          {filteredItems.map((item) => {
            const MimeIcon = getMimeIcon(item.mimeType);
            const isImage = item.mimeType?.startsWith('image/');

            return (
              <div key={item.id} style={styles.card}>
                {/* Preview — clickable */}
                <div
                  style={{ ...styles.cardPreview, cursor: 'pointer' }}
                  onClick={() => navigate(`/store/library/${item.id}`)}
                >
                  {isImage && item.fileUrl ? (
                    <img
                      src={item.fileUrl}
                      alt={item.title}
                      style={styles.previewImg}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <MimeIcon size={36} style={{ color: colors.neutral300 }} />
                  )}
                </div>

                {/* Info — clickable */}
                <div
                  style={{ ...styles.cardBody, cursor: 'pointer' }}
                  onClick={() => navigate(`/store/library/${item.id}`)}
                >
                  <h3 style={styles.cardTitle}>{item.title}</h3>
                  {item.category && (
                    <span style={styles.categoryBadge}>{item.category}</span>
                  )}
                  <div style={styles.cardMeta}>
                    {item.mimeType && <span>{item.mimeType}</span>}
                    {item.fileSize ? <span>{formatFileSize(item.fileSize)}</span> : null}
                  </div>
                  <p style={styles.cardDate}>{formatDate(item.createdAt)}</p>
                </div>

                {/* Actions */}
                <div style={styles.cardActions}>
                  <button
                    onClick={() => navigate(`/store/library/${item.id}`)}
                    style={styles.actionBtn}
                    title="보기"
                  >
                    <Eye size={14} />
                    보기
                  </button>
                  <button
                    onClick={() => navigate(`/store/library/${item.id}/edit`)}
                    style={styles.actionBtn}
                    title="수정"
                  >
                    <Edit2 size={14} />
                    수정
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    style={{ ...styles.actionBtn, color: colors.error }}
                    title="삭제"
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>자료 삭제</h3>
            <p style={styles.modalText}>
              &quot;{deleteTarget.title}&quot;을(를) 삭제하시겠습니까?
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={styles.cancelBtn}
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                style={styles.deleteBtn}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#fff',
    color: colors.neutral600,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  filterBar: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '24px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: colors.neutral800,
    backgroundColor: 'transparent',
  },
  categoryTabs: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  categoryTab: {
    padding: '6px 14px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '20px',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
    fontWeight: 400,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    color: '#fff',
    borderColor: colors.primary,
    fontWeight: 500,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  cardPreview: {
    height: '140px',
    backgroundColor: colors.neutral50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  cardBody: {
    padding: '14px 16px 8px',
    flex: 1,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 6px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  categoryBadge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: `${colors.primary}15`,
    color: colors.primary,
    marginBottom: '6px',
  },
  cardMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: colors.neutral400,
    marginBottom: '4px',
  },
  cardDate: {
    fontSize: '12px',
    color: colors.neutral400,
    margin: 0,
  },
  cardActions: {
    display: 'flex',
    borderTop: `1px solid ${colors.neutral100}`,
    padding: '0',
  },
  actionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '10px 0',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '12px',
    fontWeight: 500,
    color: colors.neutral500,
    cursor: 'pointer',
    borderRight: `1px solid ${colors.neutral100}`,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral500,
    margin: '0 0 16px 0',
  },
  // Skeleton
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden',
    padding: '0 0 16px 0',
  },
  skeletonImage: {
    height: '140px',
    backgroundColor: colors.neutral100,
    marginBottom: '14px',
  },
  skeletonLine: {
    height: '14px',
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
    margin: '0 16px 8px',
    width: '80%',
  },
  // Modal
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center' as const,
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 12px 0',
  },
  modalText: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '10px 20px',
    backgroundColor: colors.error,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
  },
};
