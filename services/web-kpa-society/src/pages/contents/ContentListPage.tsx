/**
 * ContentListPage — 콘텐츠 허브 목록
 *
 * WO-KPA-CONTENT-LIST-UX-ALIGNMENT-V1
 * WO-O4O-CONTENT-HUB-TEMPLATE-TYPE-ALIGNMENT-V1
 *
 * ContentHubTemplate 기반 공통 구조.
 * 컬럼: [유형] [제목] [작성자] [작성일] [조회수] [좋아요] [액션]
 * 권한: 작성자만 수정/삭제 노출 (createdBy === currentUserId)
 * rawItemsRef 우회 제거 — ContentHubItem 확장 타입으로 직접 매핑
 */

import { useMemo, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ContentHubTemplate } from '@o4o/shared-space-ui';
import type { ContentHubConfig, ContentHubItem } from '@o4o/shared-space-ui';
import { contentApi, type ContentItem } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

// ─── Type Mapping ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  information: '문서',
  participation: '참여',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  information: { bg: '#eff6ff', text: '#1d4ed8' },
  participation: { bg: '#f5f3ff', text: '#7c3aed' },
};

function mapContentItem(item: ContentItem): ContentHubItem {
  const subLabel = item.sub_type === '설문' ? '설문'
    : TYPE_LABELS[item.content_type] ?? '문서';
  return {
    id: item.id,
    title: item.title,
    type: subLabel,
    typeColor: TYPE_COLORS[item.content_type],
    date: item.created_at,
    // WO-O4O-CONTENT-HUB-TEMPLATE-TYPE-ALIGNMENT-V1: 확장 필드
    authorName: item.author_name ?? null,
    createdBy: item.created_by ?? null,
    viewCount: item.view_count ?? 0,
    likeCount: item.like_count ?? 0,
  };
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────

function RowActionMenu({
  onView,
  onCopyLink,
  onEdit,
  onDelete,
  isOwner,
}: {
  onView: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={styles.menuBtn}
        title="액션"
      >
        ···
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div style={styles.dropdown}>
            <button
              style={styles.dropdownItem}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
            >
              상세보기
            </button>
            <button
              style={styles.dropdownItem}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onCopyLink(); }}
            >
              링크 복사
            </button>
            {isOwner && (
              <button
                style={styles.dropdownItem}
                onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              >
                수정
              </button>
            )}
            {isOwner && (
              <button
                style={{ ...styles.dropdownItem, color: '#ef4444' }}
                onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              >
                삭제
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Content Table ────────────────────────────────────────────────────────────

function ContentTable({
  items,
  currentUserId,
  onNavigate,
  onCopyLink,
  onEdit,
  onDelete,
}: {
  items: ContentHubItem[];
  currentUserId: string | undefined;
  onNavigate: (id: string) => void;
  onCopyLink: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: 64 }}>유형</th>
            <th style={styles.th}>제목</th>
            <th style={{ ...styles.th, width: 96 }}>작성자</th>
            <th style={{ ...styles.th, width: 100 }}>작성일</th>
            <th style={{ ...styles.th, width: 56, textAlign: 'center' }}>조회</th>
            <th style={{ ...styles.th, width: 56, textAlign: 'center' }}>좋아요</th>
            <th style={{ ...styles.th, width: 48 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isOwner = !!(currentUserId && item.createdBy === currentUserId);
            const badgeColor = item.typeColor ?? { bg: '#f1f5f9', text: '#475569' };

            return (
              <tr
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={styles.row}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
              >
                {/* 유형 */}
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  {item.type && (
                    <span style={{
                      display: 'inline-block', padding: '2px 8px',
                      fontSize: '0.6875rem', fontWeight: 600, borderRadius: 4,
                      backgroundColor: badgeColor.bg, color: badgeColor.text,
                    }}>
                      {item.type}
                    </span>
                  )}
                </td>

                {/* 제목 */}
                <td style={styles.td}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                    {item.title}
                  </span>
                </td>

                {/* 작성자 */}
                <td style={{ ...styles.td, color: '#64748b', fontSize: '0.8125rem' }}>
                  {item.authorName || '-'}
                </td>

                {/* 작성일 */}
                <td style={{ ...styles.td, color: '#94a3b8', fontSize: '0.8125rem' }}>
                  {item.date ? formatDate(item.date) : '-'}
                </td>

                {/* 조회수 */}
                <td style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  👁 {item.viewCount ?? 0}
                </td>

                {/* 좋아요 */}
                <td style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  👍 {item.likeCount ?? 0}
                </td>

                {/* 액션 */}
                <td
                  style={{ ...styles.td, textAlign: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActionMenu
                    isOwner={isOwner}
                    onView={() => onNavigate(item.id)}
                    onCopyLink={() => onCopyLink(item.id)}
                    onEdit={() => onEdit(item.id)}
                    onDelete={() => onDelete(item.id)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentListPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // 삭제 후 ContentHubTemplate 재마운트로 목록 갱신
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCopyLink = useCallback((id: string) => {
    const url = `${window.location.origin}/content/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('링크가 복사되었습니다'))
      .catch(() => toast.error('링크 복사에 실패했습니다'));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('이 콘텐츠를 삭제하시겠습니까?')) return;
    try {
      await contentApi.remove(id);
      toast.success('삭제되었습니다');
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    }
  }, []);

  const config: ContentHubConfig = useMemo(() => ({
    serviceKey: 'kpa-society',
    heroTitle: '콘텐츠',
    heroDesc: '콘텐츠를 탐색하고 관리하세요',
    headerAction: isAuthenticated ? (
      <Link
        to="/content/new"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff',
          fontSize: '0.875rem', fontWeight: 600, borderRadius: 8,
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        + 콘텐츠 제작
      </Link>
    ) : undefined,
    searchPlaceholder: '제목으로 검색...',
    filters: [
      { key: 'all', label: '전체' },
      { key: 'information', label: '문서' },
      { key: 'participation', label: '참여' },
    ],
    pageLimit: 20,
    fetchItems: async ({ filter, search, page, limit }) => {
      try {
        const res = await contentApi.list({
          page,
          limit,
          sort: 'latest',
          search: search || undefined,
          content_type: filter !== 'all' ? filter : undefined,
          sub_type: 'content', // WO-KPA-CONTENT-RESOURCE-SUBTYPE-SEPARATION-V1
        });
        return {
          items: (res.data?.items ?? []).map(mapContentItem),
          total: res.data?.total ?? 0,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },
    renderItems: (items) => (
      <ContentTable
        items={items}
        currentUserId={user?.id}
        onNavigate={(id) => navigate(`/content/${id}`)}
        onCopyLink={handleCopyLink}
        onEdit={(id) => navigate(`/content/${id}/edit`)}
        onDelete={handleDelete}
      />
    ),
    emptyMessage: '아직 콘텐츠가 없습니다',
    emptyFilteredMessage: '검색 결과가 없습니다',
    showUsageBlock: false,
    showInfoBlock: false,
  }), [isAuthenticated, user?.id, navigate, handleCopyLink, handleDelete]);

  return <ContentHubTemplate key={refreshKey} config={config} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    padding: '10px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
  },
  td: {
    padding: '12px',
    fontSize: '0.875rem',
    color: '#0f172a',
    borderBottom: '1px solid #f1f5f9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  menuBtn: {
    padding: '2px 8px',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#64748b',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    cursor: 'pointer',
    letterSpacing: 2,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: 4,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    zIndex: 20,
    minWidth: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '8px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#334155',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
  },
};

export default ContentListPage;
