/**
 * ContentListPage — 콘텐츠 허브 목록
 *
 * WO-CONTENT-HUB-STRUCTURE-AND-TABLE-FOUNDATION-V1
 * (기존) WO-KPA-CONTENT-HUB-FOUNDATION-V1
 * (기존) WO-KPA-CONTENT-UX-REFINEMENT-V1
 *
 * O4O 표준 HUB 구조:
 * - BaseTable (selectable) + ActionBar (bulk)
 * - RowActionMenu (row-level)
 * - 검색 전용 toolbar (정렬/탭 필터 제외)
 * - Bulk: [복사(URL)] [삭제]
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Link2, Sparkles } from 'lucide-react';
import { BaseTable, ActionBar, RowActionMenu } from '@o4o/ui';
import type { O4OColumn, ActionBarAction, RowActionItem } from '@o4o/ui';
import { contentApi, type ContentItem } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { buildAiClipboardText, stripHtml } from '../../utils/ai-clipboard';

// ─── Helpers ─────────────────────────────────────────────────

interface TypeBadgeInfo { label: string; color: string; bg: string }

function getTypeBadge(item: ContentItem): TypeBadgeInfo {
  if (item.content_type === 'participation') {
    if (item.sub_type === '설문') return { label: '설문', color: '#7c3aed', bg: '#f5f3ff' };
    if (item.sub_type === '퀴즈') return { label: '퀴즈', color: '#0891b2', bg: '#ecfeff' };
    return { label: '참여', color: '#7c3aed', bg: '#f5f3ff' };
  }
  return { label: '문서', color: '#1d4ed8', bg: '#eff6ff' };
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

// ─── Component ───────────────────────────────────────────────

export function ContentListPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contentApi.list({
        page,
        limit: 20,
        sort: 'latest',
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      if (res.success) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Handlers ──

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
    setSelectedKeys(new Set());
  };

  const handleDelete = useCallback(async (id: string) => {
    try {
      await contentApi.remove(id);
      toast.success('삭제되었습니다');
      setSelectedKeys((prev) => { const next = new Set(prev); next.delete(id); return next; });
      fetchItems();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [fetchItems]);

  const handleBulkCopy = useCallback(() => {
    const urls = Array.from(selectedKeys)
      .map((id) => `${window.location.origin}/content/${id}`)
      .join('\n');
    navigator.clipboard.writeText(urls)
      .then(() => toast.success(`${selectedKeys.size}개 링크가 복사되었습니다`))
      .catch(() => toast.error('복사에 실패했습니다'));
  }, [selectedKeys]);

  const handleBulkAiCopy = useCallback(() => {
    const selected = items.filter((item) => selectedKeys.has(item.id));
    const aiItems = selected.map((item, i) => ({
      index: i + 1,
      title: item.title,
      url: `${window.location.origin}/content/${item.id}`,
      content: stripHtml(item.body || item.summary || ''),
    }));
    const text = buildAiClipboardText(aiItems);
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${selected.length}개 AI용 텍스트가 복사되었습니다`))
      .catch(() => toast.error('복사에 실패했습니다'));
  }, [selectedKeys, items]);

  const handleBulkDelete = useCallback(async () => {
    try {
      await Promise.all(Array.from(selectedKeys).map((id) => contentApi.remove(id)));
      toast.success(`${selectedKeys.size}개가 삭제되었습니다`);
      setSelectedKeys(new Set());
      fetchItems();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [selectedKeys, fetchItems]);

  // ── Columns ──

  const columns: O4OColumn<ContentItem>[] = [
    {
      key: 'content_type',
      header: '타입',
      width: 72,
      render: (_, row) => {
        const b = getTypeBadge(row);
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: '0.6875rem',
            fontWeight: 600,
            borderRadius: 4,
            backgroundColor: b.bg,
            color: b.color,
            whiteSpace: 'nowrap',
          }}>
            {b.label}
          </span>
        );
      },
    },
    {
      key: 'title',
      header: '제목',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/content/${row.id}`)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: '#1e293b',
            padding: 0,
          }}
        >
          {row.title}
        </button>
      ),
    },
    {
      key: 'author_name',
      header: '작성자',
      width: 100,
      render: (val) => (
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          {val || '익명'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: '생성일',
      width: 100,
      render: (val) => (
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          {formatDate(val)}
        </span>
      ),
    },
    {
      key: 'like_count',
      header: '👍',
      width: 56,
      align: 'center',
      render: (val) => (
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{val ?? 0}</span>
      ),
    },
    {
      key: 'view_count',
      header: '👁',
      width: 56,
      align: 'center',
      render: (val) => (
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{val ?? 0}</span>
      ),
    },
    {
      key: '_comment_count',
      header: '💬',
      width: 56,
      align: 'center',
      accessor: (row) => (row as any).comment_count,
      render: (val) => (
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{val ?? '-'}</span>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: 52,
      align: 'center',
      render: (_, row) => {
        const isOwner = user?.id === row.created_by;
        if (!isOwner) return null;
        const actions: RowActionItem[] = [
          {
            key: 'edit',
            label: '수정',
            onClick: () => navigate(`/content/${row.id}/edit`),
          },
          {
            key: 'delete',
            label: '삭제',
            variant: 'danger',
            onClick: () => handleDelete(row.id),
            confirm: {
              title: '삭제 확인',
              message: '이 콘텐츠를 삭제하시겠습니까?',
              variant: 'danger',
            },
          },
        ];
        return <RowActionMenu actions={actions} />;
      },
    },
  ];

  // ── Bulk Actions ──

  const bulkActions: ActionBarAction[] = [
    {
      key: 'copy',
      label: '링크 복사',
      icon: <Link2 size={14} />,
      onClick: handleBulkCopy,
    },
    {
      key: 'ai_copy',
      label: 'AI용 텍스트 복사',
      icon: <Sparkles size={14} />,
      onClick: handleBulkAiCopy,
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      icon: <Trash2 size={14} />,
      onClick: handleBulkDelete,
      confirm: {
        title: '삭제 확인',
        message: `선택한 ${selectedKeys.size}개를 삭제하시겠습니까?`,
        variant: 'danger',
      },
    },
  ];

  // ── Render ──

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>콘텐츠</h1>
          <p style={styles.subtitle}>콘텐츠를 탐색하고 관리하세요</p>
        </div>
        {isAuthenticated && (
          <button onClick={() => navigate('/content/new')} style={styles.newBtn}>
            <Plus size={16} />
            콘텐츠 제작
          </button>
        )}
      </div>

      {/* Toolbar: 검색 */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="제목, 작성자 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchBtn}>검색</button>
        </div>
      </div>

      {/* Bulk ActionBar (선택 시에만 표시) */}
      {selectedKeys.size > 0 && (
        <ActionBar
          selectedCount={selectedKeys.size}
          actions={bulkActions}
          onClearSelection={() => setSelectedKeys(new Set())}
        />
      )}

      {/* Table */}
      <div style={styles.tableWrap}>
        {loading && items.length === 0 ? (
          <div style={styles.loadingState}>
            <p style={styles.loadingText}>불러오는 중...</p>
          </div>
        ) : (
          <BaseTable
            columns={columns}
            data={items}
            rowKey={(row) => row.id}
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            emptyMessage={
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>등록된 콘텐츠가 없습니다.</p>
                {isAuthenticated && (
                  <button onClick={() => navigate('/content/new')} style={styles.emptyLink}>
                    첫 콘텐츠 제작하기
                  </button>
                )}
              </div>
            }
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <span style={styles.pageInfo}>총 {total}개</span>
          <div style={styles.pageButtons}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={styles.pageBtn}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              return start + i;
            }).filter((p) => p <= totalPages).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{ ...styles.pageBtn, ...(page === p ? styles.pageBtnActive : {}) }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              style={styles.pageBtn}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px 60px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '4px 0 0',
  },
  newBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  toolbar: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  searchWrap: {
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '0.8125rem',
    color: '#334155',
  },
  searchBtn: {
    padding: '4px 12px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    backgroundColor: '#334155',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  tableWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  loadingText: {
    fontSize: '0.9375rem',
    color: '#94a3b8',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: '0 0 12px',
  },
  emptyLink: {
    display: 'inline-block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2563eb',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  pageButtons: {
    display: 'flex',
    gap: 4,
  },
  pageBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  pageBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
  },
};

export default ContentListPage;
