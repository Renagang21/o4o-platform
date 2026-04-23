/**
 * ResourcesPage — GlycoPharm 자료실
 *
 * WO-O4O-GLYCOPHARM-CONTENT-RESOURCES-ROUTE-ALIGNMENT-V1
 *
 * KPA ResourcesHubPage 기준 이식.
 * Route: /resources
 * API: GET /api/v1/glycopharm/contents (backend 추가 예정)
 * 백엔드 미연결 시 빈 목록으로 graceful degradation.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BaseTable, ActionBar, ContentPagination } from '@o4o/ui';
import type { O4OColumn, ActionBarAction } from '@o4o/ui';
import { Search, FileText, Link2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResourceItem {
  id: string;
  title: string;
  summary: string | null;
  source_type: string;
  source_url: string | null;
  source_file_name: string | null;
  view_count: number;
  author_name: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
      };
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/glycopharm/contents', { params });
      const body = res.data;
      const data = body?.data;
      setItems(data?.items ?? []);
      setTotalPages(data?.totalPages ?? 1);
      setTotalItems(data?.total ?? 0);
    } catch {
      setItems([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Search ──────────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        if (value) prev.set('search', value);
        else prev.delete('search');
        prev.set('page', '1');
        return prev;
      });
    }, 500);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearchParams(prev => {
        if (searchInput) prev.set('search', searchInput);
        else prev.delete('search');
        prev.set('page', '1');
        return prev;
      });
    }
  };

  // ─── Pagination ──────────────────────────────────────────────────────────

  const handlePageChange = (page: number) => {
    setSearchParams(prev => { prev.set('page', String(page)); return prev; });
  };

  // ─── Bulk Actions ─────────────────────────────────────────────────────────

  const handleBulkCopy = useCallback(() => {
    const urls = items
      .filter(item => selectedKeys.has(item.id))
      .map(item => item.source_url || `${window.location.origin}/resources`)
      .join('\n');
    navigator.clipboard.writeText(urls)
      .then(() => toast.success(`${selectedKeys.size}개 링크가 복사되었습니다`))
      .catch(() => toast.error('복사에 실패했습니다'));
  }, [items, selectedKeys]);

  // ─── Table Columns ────────────────────────────────────────────────────────

  const columns = useMemo((): O4OColumn<ResourceItem>[] => [
    {
      key: 'title',
      header: '파일명 / 제목',
      width: '45%',
      sortable: true,
      render: (_v, row) => (
        <span style={{ color: '#111827', fontWeight: 500 }}>{row.title}</span>
      ),
    },
    {
      key: 'author_name',
      header: '등록자',
      width: 100,
      sortable: true,
      render: (_v, row) => (
        <span style={{ color: '#374151', fontSize: 13 }}>{row.author_name || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      header: '등록일',
      width: 100,
      align: 'center',
      sortable: true,
      sortAccessor: (row) => new Date(row.created_at).getTime(),
      render: (_v, row) => (
        <span style={{ color: '#6B7280', fontSize: 13 }}>{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: 'view_count',
      header: '👁',
      width: 60,
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.view_count,
      render: (_v, row) => (
        <span style={{ color: '#6B7280', fontSize: 13 }}>{row.view_count ?? 0}</span>
      ),
    },
    {
      key: '_link',
      header: '',
      width: 110,
      align: 'center',
      system: true,
      render: (_v, row) => row.source_url ? (
        <a
          href={row.source_url}
          target={row.source_type === 'external' ? '_blank' : '_self'}
          rel="noopener noreferrer"
          download={row.source_type !== 'external' ? (row.source_file_name || true) : undefined}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px',
            background: '#EFF6FF', color: '#2563EB',
            borderRadius: 6, fontSize: 12, fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {row.source_type === 'external' ? '바로가기' : '다운로드'}
        </a>
      ) : null,
    },
  ], []);

  // ─── Bulk ActionBar ───────────────────────────────────────────────────────

  const bulkActions: ActionBarAction[] = [
    {
      key: 'copy',
      label: '링크 복사',
      icon: <Link2 size={14} />,
      onClick: handleBulkCopy,
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={st.container}>
      {/* Header */}
      <div style={st.header}>
        <div>
          <h1 style={st.title}>자료실</h1>
          <p style={st.subtitle}>자료를 저장하고 AI 작업에 활용하세요.</p>
        </div>
      </div>

      {/* Search */}
      <div style={st.searchWrap}>
        <Search size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder="자료를 검색하세요 (제목, 등록자)"
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          style={st.searchInput}
        />
      </div>

      {/* Bulk ActionBar */}
      {selectedKeys.size > 0 && (
        <ActionBar
          selectedCount={selectedKeys.size}
          actions={bulkActions}
          onClearSelection={() => setSelectedKeys(new Set())}
        />
      )}

      {/* Table */}
      {loading ? (
        <div style={st.center}>
          <p style={{ color: '#6B7280' }}>자료를 불러오는 중...</p>
        </div>
      ) : items.length === 0 ? (
        <div style={st.center}>
          <FileText size={40} color="#D1D5DB" />
          <p style={{ color: '#6B7280', marginTop: 12, fontSize: 15, textAlign: 'center' }}>
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 자료가 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <BaseTable<ResourceItem>
            columns={columns}
            data={items}
            rowKey={(row) => row.id}
            tableId="glyco-resources"
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            emptyMessage="등록된 자료가 없습니다."
          />
          <div style={{ marginTop: 20 }}>
            <ContentPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showItemRange
              totalItems={totalItems}
              pageSize={20}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 20px 48px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    margin: 0,
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    background: '#fff',
    marginBottom: 20,
    maxWidth: 520,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#111827',
    width: '100%',
    background: 'transparent',
  },
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
  },
};

export default ResourcesPage;
