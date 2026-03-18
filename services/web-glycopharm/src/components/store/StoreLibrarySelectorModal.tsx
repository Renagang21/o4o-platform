/**
 * StoreLibrarySelectorModal — 매장 자료 선택 모달
 *
 * WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1
 * Adapted from KPA StoreLibrarySelectorModal for GlycoPharm.
 *
 * Props:
 *   open      — 모달 표시 여부
 *   onSelect  — 자료 선택 완료 콜백
 *   onClose   — 모달 닫기 콜백
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Image, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStoreLibraryItems } from '@/api/storeLibrary';
import type { StoreLibraryItem } from '@/api/storeLibrary';

// ── 인라인 색상 (Tailwind Slate) ──

const colors = {
  primary: '#2563EB',
  neutral800: '#1E293B',
  neutral600: '#475569',
  neutral500: '#64748B',
  neutral400: '#94A3B8',
  neutral200: '#E2E8F0',
  neutral100: '#F1F5F9',
  neutral50: '#F8FAFC',
};

// ── 선택 결과 타입 ──

export interface LibrarySelectorResult {
  id: string;
  title: string;
  category: string | null;
  fileUrl: string | null;
}

// ── Props ──

interface StoreLibrarySelectorModalProps {
  open: boolean;
  onSelect: (item: LibrarySelectorResult) => void;
  onClose: () => void;
}

// ── 카테고리 필터 ──

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'banner', label: '배너' },
  { key: 'promotion', label: '프로모션' },
  { key: 'signage', label: '사이니지' },
  { key: 'qr', label: 'QR' },
  { key: 'manual', label: '매뉴얼' },
  { key: 'other', label: '기타' },
] as const;

const PAGE_SIZE = 20;

// ── 컴포넌트 ──

export function StoreLibrarySelectorModal({
  open,
  onSelect,
  onClose,
}: StoreLibrarySelectorModalProps) {
  const [items, setItems] = useState<StoreLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setCategoryFilter('all');
    setSelectedId(null);
    setPage(1);
    setTotal(0);
  }, [open]);

  // 서버 데이터 로드 (page, category 변경 시 즉시)
  useEffect(() => {
    if (!open) return;
    loadItems(page, search, categoryFilter);
  }, [open, page, categoryFilter]);

  // 검색어 디바운스
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadItems(1, search, categoryFilter);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const loadItems = async (p: number, q: string, cat: string) => {
    try {
      setLoading(true);
      const res = await getStoreLibraryItems({
        page: p,
        limit: PAGE_SIZE,
        search: q.trim() || undefined,
        category: cat !== 'all' ? cat : undefined,
      });
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
      }
    } catch {
      // silent — 빈 목록 표시
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = useCallback((key: string) => {
    setCategoryFilter(key);
    setPage(1);
    setSelectedId(null);
  }, []);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  const handleConfirm = () => {
    if (!selectedItem) return;
    onSelect({
      id: selectedItem.id,
      title: selectedItem.title,
      category: selectedItem.category,
      fileUrl: selectedItem.fileUrl,
    });
  };

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>자료 선택</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {/* Search + Filter */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={16} style={{ color: colors.neutral400, flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="자료 검색..."
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterRow}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                style={{
                  ...styles.filterChip,
                  ...(categoryFilter === cat.key ? styles.filterChipActive : {}),
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card Grid */}
        <div style={styles.body}>
          {loading ? (
            <div style={styles.emptyState}>
              <p style={{ color: colors.neutral500 }}>자료를 불러오는 중...</p>
            </div>
          ) : items.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ color: colors.neutral500 }}>
                {search.trim() || categoryFilter !== 'all'
                  ? '검색 결과가 없습니다'
                  : '등록된 자료가 없습니다'}
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    ...styles.card,
                    ...(selectedId === item.id ? styles.cardSelected : {}),
                  }}
                >
                  <div style={styles.cardPreview}>
                    <FilePreview mimeType={item.mimeType} fileUrl={item.fileUrl} />
                  </div>
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{item.title}</p>
                    {item.category && (
                      <span style={styles.cardCategory}>{item.category}</span>
                    )}
                  </div>
                  {selectedId === item.id && (
                    <div style={styles.selectedBadge}>선택됨</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                ...styles.pageBtn,
                opacity: page <= 1 ? 0.4 : 1,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={styles.pageInfo}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                ...styles.pageBtn,
                opacity: page >= totalPages ? 0.4 : 1,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
            <span style={styles.totalInfo}>(총 {total}건)</span>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>취소</button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            style={{
              ...styles.confirmBtn,
              opacity: selectedId ? 1 : 0.5,
              cursor: selectedId ? 'pointer' : 'not-allowed',
            }}
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 파일 미리보기 ──

function FilePreview({
  mimeType,
  fileUrl,
}: {
  mimeType: string | null;
  fileUrl: string | null;
}) {
  if (mimeType?.startsWith('image/') && fileUrl) {
    return (
      <img
        src={fileUrl}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
        }}
      />
    );
  }

  if (mimeType?.startsWith('video/')) {
    return <Film size={28} style={{ color: colors.neutral400 }} />;
  }

  if (mimeType === 'application/pdf') {
    return <FileText size={28} style={{ color: '#ef4444' }} />;
  }

  if (mimeType?.startsWith('image/')) {
    return <Image size={28} style={{ color: colors.neutral400 }} />;
  }

  return <FileText size={28} style={{ color: colors.neutral400 }} />;
}

// ── 스타일 ──

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '720px',
    maxWidth: '95vw',
    maxHeight: '85vh',
    backgroundColor: '#fff',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: 0,
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.neutral500,
    cursor: 'pointer',
    borderRadius: '6px',
  },
  toolbar: {
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    backgroundColor: colors.neutral50,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: colors.neutral800,
  },
  filterRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  filterChip: {
    padding: '4px 12px',
    borderRadius: '16px',
    border: `1px solid ${colors.neutral200}`,
    backgroundColor: '#fff',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: '#fff',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '0 24px',
    minHeight: '300px',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    paddingBottom: '16px',
  },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'pointer',
    backgroundColor: '#fff',
    textAlign: 'left',
    padding: 0,
    transition: 'border-color 0.15s',
  },
  cardSelected: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.primary}33`,
  },
  cardPreview: {
    width: '100%',
    height: '120px',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardInfo: {
    padding: '10px 12px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
  selectedBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: '11px',
    fontWeight: 600,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '8px 24px',
  },
  pageBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: colors.neutral600,
  },
  pageInfo: {
    fontSize: '13px',
    color: colors.neutral600,
    fontWeight: 500,
  },
  totalInfo: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelBtn: {
    padding: '8px 20px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  confirmBtn: {
    padding: '8px 20px',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
  },
};
