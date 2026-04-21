/**
 * StoreAssetSelectorModal — 매장 실행 자산 선택 모달
 *
 * WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1
 * (renamed from StoreLibrarySelectorModal)
 *
 * 사용처: 사이니지, QR, POP, 배너 등
 * usageType으로 용도별 필터링 지원
 *
 * Props:
 *   open      — 모달 표시 여부
 *   onSelect  — 자산 선택 완료 콜백
 *   onClose   — 모달 닫기 콜백
 *   usageType — 용도 필터 (pop | qr | signage | banner | notice | undefined=전체)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Image, Film, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { colors } from '../../styles/theme';
import { getStoreExecutionAssets } from '../../api/storeExecutionAssets';
import type { StoreExecutionAsset, UsageType } from '../../api/storeExecutionAssets';

// ── 선택 결과 타입 ──

export interface AssetSelectorResult {
  id: string;
  title: string;
  category: string | null;
  fileUrl: string | null;
  assetType: string;
  url: string | null;
  htmlContent: string | null;
}

/** @deprecated Use AssetSelectorResult */
export type LibrarySelectorResult = AssetSelectorResult;

// ── Props ──

interface StoreAssetSelectorModalProps {
  open: boolean;
  onSelect: (item: AssetSelectorResult) => void;
  onClose: () => void;
  onCreateNew?: () => void;
  /** 용도별 필터 — 지정 시 해당 usage_type 자산만 표시 */
  usageType?: UsageType;
}

// ── 자산 타입 필터 ──

const ASSET_TYPES = [
  { key: 'all', label: '전체' },
  { key: 'file', label: '파일' },
  { key: 'content', label: '콘텐츠' },
  { key: 'external-link', label: '링크' },
] as const;

const PAGE_SIZE = 20;

// ── 컴포넌트 ──

export function StoreAssetSelectorModal({
  open,
  onSelect,
  onClose,
  onCreateNew,
  usageType,
}: StoreAssetSelectorModalProps) {
  const [items, setItems] = useState<StoreExecutionAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setAssetTypeFilter('all');
    setSelectedId(null);
    setPage(1);
    setTotal(0);
  }, [open]);

  // 서버 데이터 로드 (page 변경 시 즉시)
  useEffect(() => {
    if (!open) return;
    loadItems(page, search);
  }, [open, page]);

  // 검색어 디바운스
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadItems(1, search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const loadItems = async (p: number, q: string) => {
    try {
      setLoading(true);
      const res = await getStoreExecutionAssets({
        page: p,
        limit: PAGE_SIZE,
        search: q.trim() || undefined,
        usageType: usageType,
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

  // 클라이언트 자산 타입 필터링
  const displayItems = items.filter((item) => {
    if (assetTypeFilter === 'all') return true;
    return (item.assetType || 'file') === assetTypeFilter;
  });

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  const handleConfirm = useCallback(() => {
    if (!selectedItem) return;
    onSelect({
      id: selectedItem.id,
      title: selectedItem.title,
      category: selectedItem.category,
      fileUrl: selectedItem.fileUrl,
      assetType: selectedItem.assetType || 'file',
      url: selectedItem.url ?? null,
      htmlContent: selectedItem.htmlContent ?? null,
    });
  }, [selectedItem, onSelect]);

  if (!open) return null;

  const usageLabel = usageType
    ? { pop: 'POP', qr: 'QR', signage: '사이니지', banner: '배너', notice: '공지' }[usageType] ?? usageType
    : '전체';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            자산 선택
            {usageType && (
              <span style={styles.usageBadge}>{usageLabel}</span>
            )}
          </h2>
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
              placeholder="자산 검색..."
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterRow}>
            {ASSET_TYPES.map((at) => (
              <button
                key={at.key}
                onClick={() => { setAssetTypeFilter(at.key); setSelectedId(null); }}
                style={{
                  ...styles.filterChip,
                  ...(assetTypeFilter === at.key ? styles.filterChipActive : {}),
                }}
              >
                {at.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card Grid */}
        <div style={styles.body}>
          {loading ? (
            <div style={styles.emptyState}>
              <p style={{ color: colors.neutral500 }}>자산을 불러오는 중...</p>
            </div>
          ) : displayItems.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ color: colors.neutral500 }}>
                {search.trim() || assetTypeFilter !== 'all'
                  ? '검색 결과가 없습니다'
                  : '등록된 자산이 없습니다'}
              </p>
              {onCreateNew && items.length === 0 && !search.trim() && (
                <button onClick={onCreateNew} style={styles.emptyCreateBtn}>
                  <Plus size={14} />
                  새 자산 만들기
                </button>
              )}
            </div>
          ) : (
            <div style={styles.grid}>
              {displayItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    ...styles.card,
                    ...(selectedId === item.id ? styles.cardSelected : {}),
                  }}
                >
                  <div style={styles.cardPreview}>
                    <FilePreview mimeType={item.mimeType} fileUrl={item.fileUrl} assetType={item.assetType} />
                  </div>
                  <div style={styles.cardInfo}>
                    <p style={styles.cardTitle}>{item.title}</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                      {item.assetType && item.assetType !== 'file' && (
                        <span style={styles.assetTypeBadge}>
                          {item.assetType === 'content' ? '콘텐츠' : item.assetType === 'external-link' ? '링크' : item.assetType}
                        </span>
                      )}
                      {item.category && (
                        <span style={styles.cardCategory}>{item.category}</span>
                      )}
                    </div>
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
  assetType,
}: {
  mimeType: string | null;
  fileUrl: string | null;
  assetType?: string;
}) {
  if (assetType === 'content') {
    return <FileText size={28} style={{ color: '#8b5cf6' }} />;
  }

  if (assetType === 'external-link') {
    return <Search size={28} style={{ color: '#2563eb' }} />;
  }

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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  usageBadge: {
    fontSize: '12px',
    fontWeight: 500,
    color: colors.primary,
    backgroundColor: `${colors.primary}18`,
    padding: '2px 8px',
    borderRadius: '10px',
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    gap: '12px',
  },
  emptyCreateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
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
  assetTypeBadge: {
    display: 'inline-block',
    marginTop: '4px',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    fontSize: '11px',
    fontWeight: 500,
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
