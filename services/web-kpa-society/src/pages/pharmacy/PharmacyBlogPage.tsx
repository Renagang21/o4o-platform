/**
 * PharmacyBlogPage — Staff Blog Management
 *
 * WO-STORE-BLOG-CHANNEL-V1
 *
 * 경로: /pharmacy/blog
 * 인증 필수 + PharmacyGuard
 * 게시글 목록/작성/수정/발행/보관/삭제
 */

import { useEffect, useState, useCallback } from 'react';
import {
  fetchStaffBlogPosts,
  createBlogPost,
  updateBlogPost,
  publishBlogPost,
  archiveBlogPost,
  deleteBlogPost,
  type StaffBlogPost,
} from '../../api/blogStaff';

type ViewMode = 'list' | 'editor';
type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '임시저장', color: '#64748b', bg: '#f1f5f9' },
  published: { label: '발행됨', color: '#16a34a', bg: '#f0fdf4' },
  archived: { label: '보관', color: '#d97706', bg: '#fefce8' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function PharmacyBlogPage({ service }: { service?: string }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [posts, setPosts] = useState<StaffBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingPost, setEditingPost] = useState<StaffBlogPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Editor state
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorExcerpt, setEditorExcerpt] = useState('');
  const [editorSlug, setEditorSlug] = useState('');
  const [saving, setSaving] = useState(false);

  // Resolve slug from cockpit
  useEffect(() => {
    const fetchSlug = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL
          ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/glycopharm`
          : '/api/v1/glycopharm';
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE}/cockpit/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && json.data?.storeSlug) {
          setSlug(json.data.storeSlug);
        } else {
          setError('매장 정보를 찾을 수 없습니다.');
        }
      } catch {
        setError('매장 정보를 불러올 수 없습니다.');
      }
    };
    fetchSlug();
  }, []);

  const loadPosts = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const res = await fetchStaffBlogPosts(slug, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      }, service);
      setPosts(res.data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [slug, statusFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const openEditor = (post?: StaffBlogPost) => {
    if (post) {
      setEditingPost(post);
      setEditorTitle(post.title);
      setEditorContent(post.content);
      setEditorExcerpt(post.excerpt || '');
      setEditorSlug(post.slug);
    } else {
      setEditingPost(null);
      setEditorTitle('');
      setEditorContent('');
      setEditorExcerpt('');
      setEditorSlug('');
    }
    setMode('editor');
  };

  const handleSave = async () => {
    if (!slug || !editorTitle.trim() || !editorContent.trim()) return;
    setSaving(true);
    try {
      if (editingPost) {
        await updateBlogPost(slug, editingPost.id, {
          title: editorTitle,
          content: editorContent,
          excerpt: editorExcerpt || undefined,
          slug: editorSlug !== editingPost.slug ? editorSlug : undefined,
        }, service);
      } else {
        await createBlogPost(slug, {
          title: editorTitle,
          content: editorContent,
          excerpt: editorExcerpt || undefined,
          slug: editorSlug || undefined,
        }, service);
      }
      setMode('list');
      await loadPosts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (postId: string) => {
    if (!slug) return;
    try {
      await publishBlogPost(slug, postId, service);
      await loadPosts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleArchive = async (postId: string) => {
    if (!slug) return;
    try {
      await archiveBlogPost(slug, postId, service);
      await loadPosts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!slug || !confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteBlogPost(slug, postId, service);
      await loadPosts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Editor view
  if (mode === 'editor') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
            {editingPost ? '게시글 수정' : '새 게시글'}
          </h1>
          <button onClick={() => setMode('list')} style={{ ...btnStyle, backgroundColor: '#f1f5f9', color: '#475569' }}>
            취소
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>제목</label>
            <input
              type="text"
              value={editorTitle}
              onChange={(e) => setEditorTitle(e.target.value)}
              placeholder="게시글 제목"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>슬러그 (URL)</label>
            <input
              type="text"
              value={editorSlug}
              onChange={(e) => setEditorSlug(e.target.value)}
              placeholder="자동 생성됨 (선택 입력)"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>요약 (excerpt)</label>
            <input
              type="text"
              value={editorExcerpt}
              onChange={(e) => setEditorExcerpt(e.target.value)}
              placeholder="목록에 표시될 요약 (선택)"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>본문</label>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              placeholder="게시글 내용을 작성하세요"
              rows={16}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving || !editorTitle.trim() || !editorContent.trim()}
              style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '저장 중...' : editingPost ? '수정 저장' : '임시 저장'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>블로그 관리</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            매장 블로그 게시글을 작성하고 관리합니다.
          </p>
        </div>
        <button onClick={() => openEditor()} style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff' }}>
          새 글 작성
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'draft', 'published', 'archived'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: statusFilter === f ? '#3b82f6' : '#e2e8f0',
              backgroundColor: statusFilter === f ? '#eff6ff' : '#fff',
              color: statusFilter === f ? '#3b82f6' : '#64748b',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {f === 'all' ? '전체' : STATUS_LABELS[f].label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            게시글이 없습니다. 새 글을 작성해보세요.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {posts.map((post) => {
            const status = STATUS_LABELS[post.status] || STATUS_LABELS.draft;
            return (
              <div
                key={post.id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: status.color, backgroundColor: status.bg, padding: '2px 8px', borderRadius: '4px' }}>
                      {status.label}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {formatDate(post.updatedAt)}
                    {post.slug && ` · /${post.slug}`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                  <button onClick={() => openEditor(post)} style={{ ...smallBtn, color: '#3b82f6' }}>수정</button>
                  {post.status === 'draft' && (
                    <button onClick={() => handlePublish(post.id)} style={{ ...smallBtn, color: '#16a34a' }}>발행</button>
                  )}
                  {post.status === 'published' && (
                    <button onClick={() => handleArchive(post.id)} style={{ ...smallBtn, color: '#d97706' }}>보관</button>
                  )}
                  <button onClick={() => handleDelete(post.id)} style={{ ...smallBtn, color: '#ef4444' }}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const smallBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
};

export default PharmacyBlogPage;
