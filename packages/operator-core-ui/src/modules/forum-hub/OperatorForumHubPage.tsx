/**
 * OperatorForumHubPage — 포럼 운영 허브 (공통 콘솔)
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-READONLY-INTRODUCE-V1
 *
 * KPA reference(OperatorForumPage)를 공통 모듈로 추출. 서비스 차이는 client/accent/nav + enablePostActions 로 주입.
 * - 긴급 알림 배너 + 포럼 KPI(클릭 이동) + 관리 바로가기 + 최근 게시글
 * - enablePostActions=true(KPA): 게시글 수정/단건·일괄 삭제 (DataTable selection + ActionBar)
 * - enablePostActions=false(GP/KCos): read-only — 액션/선택/일괄삭제 미노출, row 클릭으로 상세 이동만
 *
 * 스타일은 KPA 원본과 동일하게 inline 중심 (Tailwind purge 무관). DataTable column className 은
 * 기존 forum-requests 등 operator-core-ui 모듈과 동일하게 사용.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  LayoutGrid,
  Trash2,
  BarChart3,
  Eye,
  AlertTriangle,
  Heart,
  Pencil,
} from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type { ForumHubPost, ForumHubSummary, OperatorForumHubPageProps } from './types';

// ─── Action Policy (module-level) ───

const postStatusConfig: Record<string, { text: string; cls: string }> = {
  publish: { text: '게시', cls: 'bg-green-50 text-green-700' },
  draft: { text: '임시', cls: 'bg-amber-50 text-amber-600' },
};

const postActionPolicy = defineActionPolicy<ForumHubPost>('forum:hub:posts', {
  rules: [
    { key: 'edit', label: '수정' },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      divider: true,
      confirm: (row) => ({
        title: '게시글 삭제',
        message: `"${row.title}" 게시글을 삭제하시겠습니까?`,
        variant: 'danger' as const,
        confirmText: '삭제',
      }),
    },
  ],
});

const POST_ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Pencil className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

// ─── Component ───

export function OperatorForumHubPage({
  client,
  accent,
  nav,
  enablePostActions = false,
  tableId = 'operator-forum-posts',
  title = '포럼 운영',
  description = '커뮤니티 포럼 현황 및 운영 관리',
}: OperatorForumHubPageProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ForumHubSummary | null>(null);
  const [posts, setPosts] = useState<ForumHubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // 삭제 액션은 client.deletePost 가 있고 enablePostActions 일 때만
  const canDelete = enablePostActions && typeof client.deletePost === 'function';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, postsRes] = await Promise.allSettled([
        client.getSummary(),
        client.getPosts({ limit: 15 }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data as ForumHubSummary);
      }

      if (postsRes.status === 'fulfilled') {
        const raw = postsRes.value as { data?: unknown } | null;
        const items = (Array.isArray(raw?.data) ? raw?.data : []) as any[];
        setPosts(
          items.map((p: any) => ({
            id: p.id,
            title: p.title || '(제목 없음)',
            authorName: p.author?.name || p.authorName || '-',
            categoryName: p.category?.name || p.categoryName || '-',
            viewCount: p.viewCount ?? 0,
            likeCount: p.likeCount ?? 0,
            createdAt: p.createdAt || p.created_at || '',
            status: p.status || 'publish',
          })),
        );
      }
    } catch {
      setError('포럼 데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, [client]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBulkDelete = async () => {
    if (!canDelete || !client.deletePost) return;
    const targetIds = [...selectedIds];
    await batch.executeBatch(
      async (ids) => {
        const results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> = [];
        for (const id of ids) {
          try {
            await client.deletePost!(id);
            results.push({ id, status: 'success' });
          } catch (err: any) {
            results.push({ id, status: 'failed', error: err?.message || '삭제 실패' });
          }
        }
        return { data: { results } };
      },
      targetIds,
    );
    setSelectedIds(new Set());
    fetchData();
  };

  // ─── Column Definitions ───
  const baseColumns: ListColumnDef<ForumHubPost>[] = [
    {
      key: 'categoryName',
      header: '포럼',
      width: '90px',
      render: (v) => (
        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium">
          {v}
        </span>
      ),
    },
    {
      key: 'title',
      header: '제목',
      render: (v) => (
        <span className="font-medium text-slate-800 text-sm block truncate max-w-xs">{v}</span>
      ),
    },
    {
      key: 'authorName',
      header: '작성자',
      width: '100px',
      render: (v) => <span className="text-sm text-slate-600">{v}</span>,
    },
    {
      key: 'viewCount',
      header: '조회',
      width: '70px',
      align: 'right',
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-sm text-slate-500">
          <Eye size={12} /> {v}
        </span>
      ),
    },
    {
      key: 'likeCount',
      header: '좋아요',
      width: '70px',
      align: 'right',
      render: (v) =>
        v > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm text-red-400">
            <Heart size={12} /> {v}
          </span>
        ) : (
          <span className="text-sm text-slate-300">-</span>
        ),
    },
    {
      key: 'status',
      header: '상태',
      width: '70px',
      align: 'center',
      render: (v) => {
        const sc = postStatusConfig[v] || { text: v, cls: 'bg-slate-100 text-slate-600' };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
            {sc.text}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: '작성일',
      width: '100px',
      render: (v) => <span className="text-sm text-slate-500">{formatDate(v)}</span>,
    },
  ];

  const actionColumn: ListColumnDef<ForumHubPost> = {
    key: '_actions',
    header: '',
    align: 'center',
    width: '60px',
    system: true,
    onCellClick: () => {},
    render: (_v, row) => (
      <RowActionMenu
        actions={buildRowActions(postActionPolicy, row, {
          edit: () => { if (nav.postEdit) navigate(nav.postEdit(row.id)); },
          delete: async () => {
            if (!client.deletePost) return;
            await client.deletePost(row.id);
            setPosts((prev) => prev.filter((p) => p.id !== row.id));
          },
        }, { icons: POST_ACTION_ICONS })}
      />
    ),
  };

  const columns = canDelete ? [...baseColumns, actionColumn] : baseColumns;

  const bulkActions = [
    {
      key: 'delete',
      label: `삭제 (${selectedIds.size})`,
      onClick: handleBulkDelete,
      variant: 'danger' as const,
      icon: <Trash2 size={14} />,
      loading: batch.loading,
      group: 'danger',
      tooltip: '선택된 게시글을 일괄 삭제합니다',
      visible: selectedIds.size > 0,
      confirm: {
        title: '일괄 삭제 확인',
        message: `${selectedIds.size}개의 게시글을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '삭제',
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14 }}>포럼 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <AlertCircle size={28} style={{ margin: '0 auto 12px', color: '#dc2626' }} />
        <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</p>
        <button onClick={fetchData} style={retryBtnStyle}>
          <RefreshCw size={14} /> 다시 시도
        </button>
      </div>
    );
  }

  const hasPendingActions = stats && (stats.pendingRequests > 0 || stats.deleteRequestsPending > 0);
  const rowClickable = !!nav.postDetail;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...iconBoxStyle, backgroundColor: accent.iconBgColor }}>
            <MessageSquare size={20} color={accent.iconColor} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{description}</p>
          </div>
        </div>
        <button onClick={fetchData} style={refreshBtnStyle}>
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>

      {/* Urgent Action Banner */}
      {hasPendingActions && (
        <div style={urgentBannerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#d97706" />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>
              처리 대기 중인 요청이 있습니다
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {stats!.pendingRequests > 0 && (
              <button onClick={() => navigate(nav.requests)} style={urgentLinkStyle}>
                포럼 개설 요청 {stats!.pendingRequests}건 <ArrowRight size={12} />
              </button>
            )}
            {stats!.deleteRequestsPending > 0 && (
              <button onClick={() => navigate(nav.deleteRequests)} style={urgentLinkStyle}>
                삭제 요청 {stats!.deleteRequestsPending}건 <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards — clickable */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KpiCard label="총 포럼" value={stats.totalForums} onClick={() => navigate(nav.analytics)} />
          <KpiCard label="활성 포럼" value={stats.activeForums} onClick={() => navigate(nav.analytics)} />
          <KpiCard label="총 게시글" value={stats.totalPosts} />
          <KpiCard
            label="개설 요청"
            value={stats.pendingRequests}
            highlight={stats.pendingRequests > 0}
            onClick={() => navigate(nav.requests)}
          />
          <KpiCard
            label="삭제 요청"
            value={stats.deleteRequestsPending}
            highlight={stats.deleteRequestsPending > 0}
            onClick={() => navigate(nav.deleteRequests)}
          />
        </div>
      )}

      {/* Management Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        <ShortcutCard
          icon={<LayoutGrid size={16} />}
          accentColor={accent.iconColor}
          label="포럼 관리"
          desc="포럼 개설 요청 검토 및 관리"
          count={stats?.pendingRequests}
          onClick={() => navigate(nav.requests)}
        />
        <ShortcutCard
          icon={<Trash2 size={16} />}
          accentColor={accent.iconColor}
          label="삭제 요청"
          desc="포럼 삭제 요청 처리"
          count={stats?.deleteRequestsPending}
          onClick={() => navigate(nav.deleteRequests)}
        />
        <ShortcutCard
          icon={<BarChart3 size={16} />}
          accentColor={accent.iconColor}
          label="포럼 분석"
          desc="활동 통계 및 트렌드 확인"
          onClick={() => navigate(nav.analytics)}
        />
        {nav.community && (
          <ShortcutCard
            icon={<MessageSquare size={16} />}
            accentColor={accent.iconColor}
            label="커뮤니티 관리"
            desc="광고 · 스폰서 관리"
            onClick={() => navigate(nav.community!)}
          />
        )}
      </div>

      {/* Recent Posts Table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: 0 }}>최근 게시글</h2>
        {posts.length > 0 && (
          <span style={{ fontSize: 12, color: '#94a3b8' }}>최근 {posts.length}건</span>
        )}
      </div>

      {posts.length === 0 ? (
        <div style={emptyStyle}>
          <FileText size={32} color="#cbd5e1" />
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '12px 0 16px' }}>등록된 게시글이 없습니다.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => navigate(nav.requests)} style={ctaBtnStyle}>
              <LayoutGrid size={14} /> 포럼 관리
            </button>
            {nav.community && (
              <button onClick={() => navigate(nav.community!)} style={ctaBtnOutlineStyle}>
                <MessageSquare size={14} /> 커뮤니티 관리
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {canDelete && (
            <>
              <ActionBar
                selectedCount={selectedIds.size}
                onClearSelection={() => setSelectedIds(new Set())}
                actions={bulkActions}
              />
              <BulkResultModal
                open={batch.showResult}
                onClose={() => { batch.clearResult(); fetchData(); }}
                result={batch.result}
                onRetry={() => { batch.retryFailed(); }}
              />
            </>
          )}
          <DataTable<ForumHubPost>
            columns={columns}
            data={posts}
            rowKey="id"
            emptyMessage="등록된 게시글이 없습니다"
            tableId={tableId}
            {...(canDelete
              ? { selectable: true, selectedKeys: selectedIds, onSelectionChange: setSelectedIds }
              : {})}
            {...(rowClickable
              ? { onRowClick: (record: ForumHubPost) => navigate(nav.postDetail!(record.id)) }
              : {})}
          />
        </>
      )}
    </div>
  );
}

// ─── Sub Components ───

function KpiCard({ label, value, highlight, onClick }: { label: string; value: number; highlight?: boolean; onClick?: () => void }) {
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: highlight ? '#fef3c7' : '#f8fafc',
        border: `1px solid ${highlight ? '#fbbf24' : '#e2e8f0'}`,
        borderRadius: 10,
        padding: '16px 18px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { if (isClickable) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
      onMouseLeave={(e) => { if (isClickable) (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      <p style={{ fontSize: 11, fontWeight: 500, color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: highlight ? '#d97706' : '#1e293b', margin: 0 }}>{value}</p>
        {isClickable && <ArrowRight size={14} color="#94a3b8" />}
      </div>
    </div>
  );
}

function ShortcutCard({ icon, accentColor, label, desc, count, onClick }: {
  icon: ReactNode;
  accentColor: string;
  label: string;
  desc: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={shortcutStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <span style={{ color: accentColor }}>{icon}</span>
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
            {label}
            {count != null && count > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>
                {count}
              </span>
            )}
          </span>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{desc}</p>
        </div>
      </div>
      <ArrowRight size={14} color="#94a3b8" />
    </button>
  );
}

// ─── Helpers ───

function formatDate(iso: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

// ─── Styles ───

const iconBoxStyle: CSSProperties = {
  width: 40, height: 40, borderRadius: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const refreshBtnStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', fontSize: 13, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const retryBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const shortcutStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 16px', backgroundColor: 'white',
  border: '1px solid #e2e8f0', borderRadius: 10,
  cursor: 'pointer', textAlign: 'left',
};

const emptyStyle: CSSProperties = {
  textAlign: 'center', padding: '48px 24px',
  backgroundColor: '#f8fafc', borderRadius: 12,
  border: '1px dashed #e2e8f0',
};

const urgentBannerStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 16px', marginBottom: 20,
  backgroundColor: '#fffbeb', border: '1px solid #fbbf24',
  borderRadius: 10, flexWrap: 'wrap', gap: 8,
};

const urgentLinkStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', fontSize: 12, fontWeight: 600,
  color: '#d97706', backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24', borderRadius: 6, cursor: 'pointer',
};

const ctaBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#fff', backgroundColor: '#2563eb',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const ctaBtnOutlineStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
};
