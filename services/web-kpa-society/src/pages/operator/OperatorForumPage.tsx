/**
 * OperatorForumPage — KPA-a Operator 게시판 현황 + 관리 허브
 *
 * WO-KPA-A-PLACEHOLDER-PAGES-IMPLEMENTATION:
 *   admin-branch 공유 더미 ForumPage를 대체하는 KPA-a operator 전용 페이지.
 *   실제 forum API 연결, 더미 데이터 제거.
 *
 * 구조:
 *   - 포럼 현황 KPI (총 게시판, 게시글, 대기 요청)
 *   - 최근 게시글 목록 (실시간 API)
 *   - 관리 바로가기 (포럼 관리, 삭제 요청, 분석 등)
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
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>커뮤니티 게시판 현황 및 관리</p>
          </div>
        </div>
        <button onClick={fetchData} style={refreshBtnStyle}>
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KpiCard label="총 게시판" value={stats.totalForums} />
          <KpiCard label="활성 게시판" value={stats.activeForums} />
          <KpiCard label="총 게시글" value={stats.totalPosts} />
          <KpiCard
            label="카테고리 요청 대기"
            value={stats.pendingRequests}
            highlight={stats.pendingRequests > 0}
          />
          <KpiCard
            label="삭제 요청 대기"
            value={stats.deleteRequestsPending}
            highlight={stats.deleteRequestsPending > 0}
          />
        </div>
      )}

      {/* Management Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        <ShortcutCard
          icon={<LayoutGrid size={16} />}
          label="포럼 관리"
          desc="카테고리 요청 검토"
          onClick={() => navigate('/operator/forum-management')}
        />
        <ShortcutCard
          icon={<Trash2 size={16} />}
          label="삭제 요청"
          desc="삭제 요청 처리"
          count={stats?.deleteRequestsPending}
          onClick={() => navigate('/operator/forum-delete-requests')}
        />
        <ShortcutCard
          icon={<BarChart3 size={16} />}
          label="포럼 분석"
          desc="활동 통계 확인"
          onClick={() => navigate('/operator/forum-analytics')}
        />
        <ShortcutCard
          icon={<MessageSquare size={16} />}
          label="커뮤니티 관리"
          desc="광고/스폰서 관리"
          onClick={() => navigate('/operator/community')}
        />
      </div>

      {/* Recent Posts Table */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: '0 0 12px' }}>최근 게시글</h2>
      </div>

      {posts.length === 0 ? (
        <div style={emptyStyle}>
          <FileText size={32} color="#cbd5e1" />
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '12px 0 0' }}>등록된 게시글이 없습니다.</p>
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
                <th style={thStyle}>작성일</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <span style={badgeStyle}>{post.categoryName}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 500, color: '#1e293b' }}>
                    {post.title}
                  </td>
                  <td style={tdStyle}>{post.authorName}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#64748b' }}>
                      <Eye size={12} /> {post.viewCount}
                    </span>
                  </td>
                  <td style={tdStyle}>{formatDate(post.createdAt)}</td>
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

function KpiCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      backgroundColor: highlight ? '#fef3c7' : '#f8fafc',
      border: `1px solid ${highlight ? '#fbbf24' : '#e2e8f0'}`,
      borderRadius: 10,
      padding: '16px 18px',
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: highlight ? '#d97706' : '#1e293b', margin: 0 }}>{value}</p>
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
