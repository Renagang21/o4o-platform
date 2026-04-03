/**
 * OperatorForumPage — KPA-a Operator 게시판 운영 허브
 *
 * WO-KPA-A-PLACEHOLDER-PAGES-IMPLEMENTATION: 실사용 페이지 전환
 * WO-KPA-A-OPERATOR-FORUM-OPS-ENHANCEMENT-V1: 운영 처리 중심 허브 보강
 *
 * 구조:
 *   - 긴급 알림 배너 (삭제 요청/카테고리 요청 대기)
 *   - 포럼 현황 KPI (클릭 → 관련 페이지 이동)
 *   - 관리 바로가기 (대기 건수 표시)
 *   - 최근 게시글 목록 (상태 표시 + 게시글 이동)
 */

import { useState, useEffect, useCallback } from 'react';
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
  ExternalLink,
  Heart,
} from 'lucide-react';
import { forumApi, forumAnalyticsApi } from '../../api/forum';

// ─── Types ───

interface ForumStats {
  totalForums: number;
  activeForums: number;
  totalPosts: number;
  pendingRequests: number;
  deleteRequestsPending: number;
}

interface PostItem {
  id: string;
  title: string;
  authorName?: string;
  categoryName?: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  status: string;
}

// ─── Component ───

export default function OperatorForumPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, postsRes] = await Promise.allSettled([
        forumAnalyticsApi.getSummary(),
        forumApi.getPosts({ limit: 15 }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }

      if (postsRes.status === 'fulfilled') {
        const raw = postsRes.value;
        const items = raw?.data ?? [];
        setPosts(
          items.map((p: any) => ({
            id: p.id,
            title: p.title || '(제목 없음)',
            authorName: p.author?.name || p.authorName || '-',
            categoryName: p.category?.name || p.categoryName || '-',
            viewCount: p.viewCount ?? 0,
            likeCount: p.likeCount ?? 0,
            createdAt: p.createdAt || p.created_at || '',
            status: p.status || 'PUBLISHED',
          })),
        );
      }
    } catch {
      setError('포럼 데이터를 불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={iconBoxStyle}>
            <MessageSquare size={20} color="#2563eb" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: 0 }}>게시판</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>커뮤니티 게시판 현황 및 운영 관리</p>
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
              <button onClick={() => navigate('/operator/forum-management')} style={urgentLinkStyle}>
                카테고리 요청 {stats!.pendingRequests}건 <ArrowRight size={12} />
              </button>
            )}
            {stats!.deleteRequestsPending > 0 && (
              <button onClick={() => navigate('/operator/forum-delete-requests')} style={urgentLinkStyle}>
                삭제 요청 {stats!.deleteRequestsPending}건 <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards — clickable */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KpiCard label="총 게시판" value={stats.totalForums} onClick={() => navigate('/operator/forum-analytics')} />
          <KpiCard label="활성 게시판" value={stats.activeForums} onClick={() => navigate('/operator/forum-analytics')} />
          <KpiCard label="총 게시글" value={stats.totalPosts} />
          <KpiCard
            label="카테고리 요청"
            value={stats.pendingRequests}
            highlight={stats.pendingRequests > 0}
            onClick={() => navigate('/operator/forum-management')}
          />
          <KpiCard
            label="삭제 요청"
            value={stats.deleteRequestsPending}
            highlight={stats.deleteRequestsPending > 0}
            onClick={() => navigate('/operator/forum-delete-requests')}
          />
        </div>
      )}

      {/* Management Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        <ShortcutCard
          icon={<LayoutGrid size={16} />}
          label="포럼 관리"
          desc="카테고리 요청 검토 및 관리"
          count={stats?.pendingRequests}
          onClick={() => navigate('/operator/forum-management')}
        />
        <ShortcutCard
          icon={<Trash2 size={16} />}
          label="삭제 요청"
          desc="게시판 삭제 요청 처리"
          count={stats?.deleteRequestsPending}
          onClick={() => navigate('/operator/forum-delete-requests')}
        />
        <ShortcutCard
          icon={<BarChart3 size={16} />}
          label="포럼 분석"
          desc="활동 통계 및 트렌드 확인"
          onClick={() => navigate('/operator/forum-analytics')}
        />
        <ShortcutCard
          icon={<MessageSquare size={16} />}
          label="커뮤니티 관리"
          desc="광고 · 스폰서 관리"
          onClick={() => navigate('/operator/community')}
        />
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
            <button onClick={() => navigate('/operator/forum-management')} style={ctaBtnStyle}>
              <LayoutGrid size={14} /> 포럼 관리
            </button>
            <button onClick={() => navigate('/operator/community')} style={ctaBtnOutlineStyle}>
              <MessageSquare size={14} /> 커뮤니티 관리
            </button>
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={thStyle}>게시판</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>제목</th>
                <th style={thStyle}>작성자</th>
                <th style={thStyle}>조회</th>
                <th style={thStyle}>좋아요</th>
                <th style={thStyle}>상태</th>
                <th style={thStyle}>작성일</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <span style={badgeStyle}>{post.categoryName}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 500, color: '#1e293b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.title}
                  </td>
                  <td style={tdStyle}>{post.authorName}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#64748b' }}>
                      <Eye size={12} /> {post.viewCount}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {post.likeCount > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#ef4444' }}>
                        <Heart size={12} /> {post.likeCount}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      ...badgeStyle,
                      backgroundColor: post.status === 'PUBLISHED' ? '#ecfdf5' : post.status === 'DRAFT' ? '#fffbeb' : '#fef2f2',
                      color: post.status === 'PUBLISHED' ? '#059669' : post.status === 'DRAFT' ? '#d97706' : '#dc2626',
                    }}>
                      {post.status === 'PUBLISHED' ? '게시' : post.status === 'DRAFT' ? '임시' : post.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{formatDate(post.createdAt)}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => window.open(`/forum/posts/${post.id}`, '_blank')}
                      style={actionBtnStyle}
                      title="게시글 보기"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function ShortcutCard({ icon, label, desc, count, onClick }: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={shortcutStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <span style={{ color: '#2563eb' }}>{icon}</span>
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

const iconBoxStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10,
  backgroundColor: '#dbeafe',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const refreshBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', fontSize: 13, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const retryBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const shortcutStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 16px', backgroundColor: 'white',
  border: '1px solid #e2e8f0', borderRadius: 10,
  cursor: 'pointer', textAlign: 'left',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: '48px 24px',
  backgroundColor: '#f8fafc', borderRadius: 12,
  border: '1px dashed #e2e8f0',
};

const thStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: 12, fontWeight: 600,
  color: '#64748b', textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px', verticalAlign: 'middle',
  textAlign: 'center', color: '#475569',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block', padding: '2px 8px',
  backgroundColor: '#f1f5f9', color: '#475569',
  borderRadius: 4, fontSize: 11, fontWeight: 500,
};

const urgentBannerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 16px', marginBottom: 20,
  backgroundColor: '#fffbeb', border: '1px solid #fbbf24',
  borderRadius: 10, flexWrap: 'wrap', gap: 8,
};

const urgentLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', fontSize: 12, fontWeight: 600,
  color: '#d97706', backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24', borderRadius: 6, cursor: 'pointer',
};

const ctaBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#fff', backgroundColor: '#2563eb',
  border: 'none', borderRadius: 8, cursor: 'pointer',
};

const ctaBtnOutlineStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  color: '#475569', backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
};

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, border: 'none', borderRadius: 6,
  backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer',
};
