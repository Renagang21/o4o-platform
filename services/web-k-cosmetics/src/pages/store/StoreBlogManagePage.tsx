/**
 * StoreBlogManagePage — Staff Blog Management (K-Cosmetics)
 *
 * WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1
 * Adapted from GlycoPharm PharmacyBlogPage (KPA canonical pattern).
 *
 * 경로: /store/content/blog
 * 인증 필수 (상위 ProtectedRoute + StoreLayoutWrapper).
 *
 * K-Cosmetics override:
 *  - slug resolver: fetchChannelOverviewWithCode().organizationCode
 *  - SERVICE = 'cosmetics'
 */

import { useEffect, useState, useCallback } from 'react';
import {
  fetchStaffBlogPosts,
  createBlogPost,
  updateBlogPost,
  publishBlogPost,
  archiveBlogPost,
  deleteBlogPost,
  fetchBlogSettings,
  updateBlogSettings,
  type StaffBlogPost,
  type StaffBlogSettings,
} from '@/api/blogStaff';
import { fetchChannelOverviewWithCode } from '@/api/storeHub';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';

type ViewMode = 'list' | 'editor' | 'settings';
type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '임시저장', color: '#64748b', bg: '#f1f5f9' },
  published: { label: '발행됨', color: '#16a34a', bg: '#f0fdf4' },
  archived: { label: '보관', color: '#d97706', bg: '#fefce8' },
};

const SERVICE = 'cosmetics';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function extractTitleFromHtml(html: string): string {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function StoreBlogManagePage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [posts, setPosts] = useState<StaffBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingPost, setEditingPost] = useState<StaffBlogPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorExcerpt, setEditorExcerpt] = useState('');
  const [editorSlug, setEditorSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const [settings, setSettings] = useState<StaffBlogSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    blogName: '',
    description: '',
    heroImage: '',
    defaultTemplate: 'professional',
  });
  const [settingsMessage, setSettingsMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const overview = await fetchChannelOverviewWithCode();
        const resolved = overview?.organizationCode ?? null;
        if (resolved) {
          setSlug(resolved);
        } else {
          setError('연결된 매장이 없습니다. 매장 신청을 먼저 진행하세요.');
          setLoading(false);
        }
      } catch (e: any) {
        setError(e?.message || '매장 정보를 불러올 수 없습니다.');
        setLoading(false);
      }
    })();
  }, []);

  const loadPosts = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const res = await fetchStaffBlogPosts(slug, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      }, SERVICE);
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
        }, SERVICE);
      } else {
        await createBlogPost(slug, {
          title: editorTitle,
          content: editorContent,
          excerpt: editorExcerpt || undefined,
          slug: editorSlug || undefined,
        }, SERVICE);
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
      await publishBlogPost(slug, postId, SERVICE);
      await loadPosts();
    } catch (e: any) { setError(e.message); }
  };

  const handleArchive = async (postId: string) => {
    if (!slug) return;
    try {
      await archiveBlogPost(slug, postId, SERVICE);
      await loadPosts();
    } catch (e: any) { setError(e.message); }
  };

  const handleDelete = async (postId: string) => {
    if (!slug || !confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteBlogPost(slug, postId, SERVICE);
      await loadPosts();
    } catch (e: any) { setError(e.message); }
  };

  const buildPublicUrl = (postSlug: string): string | null => {
    if (!slug || typeof window === 'undefined') return null;
    return `${window.location.origin}/store/${slug}/blog/${postSlug}`;
  };

  const handleCopyUrl = async (postSlug: string) => {
    const url = buildPublicUrl(postSlug);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      alert('공개 URL이 클립보드에 복사되었습니다.');
    } catch {
      alert(`복사에 실패했습니다. 직접 복사해 주세요:\n${url}`);
    }
  };

  const handlePreview = (postSlug: string) => {
    const url = buildPublicUrl(postSlug);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAiInsert = ({ html, title: aiTitle }: { html: string; title: string; sourceUrl?: string }) => {
    const finalTitle = (aiTitle || '').trim() || extractTitleFromHtml(html);
    if (finalTitle && !editorTitle.trim()) setEditorTitle(finalTitle);
    if (!editorExcerpt.trim()) {
      const plain = htmlToPlain(html);
      if (plain) setEditorExcerpt(plain.slice(0, 120));
    }
    setEditorContent(html);
  };

  const openSettings = useCallback(async () => {
    if (!slug) return;
    setSettingsMessage(null);
    setSettingsLoading(true);
    setMode('settings');
    try {
      const data = await fetchBlogSettings(slug, SERVICE);
      setSettings(data);
      setSettingsForm({
        blogName: data?.blogName ?? '',
        description: data?.description ?? '',
        heroImage: data?.heroImage ?? '',
        defaultTemplate: data?.defaultTemplate ?? 'professional',
      });
    } catch (e: any) {
      setSettingsMessage({ kind: 'error', text: e?.message || '설정을 불러오지 못했습니다.' });
    } finally {
      setSettingsLoading(false);
    }
  }, [slug]);

  const handleSaveSettings = async () => {
    if (!slug) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const saved = await updateBlogSettings(slug, {
        blogName: settingsForm.blogName.trim() || null,
        description: settingsForm.description.trim() || null,
        heroImage: settingsForm.heroImage.trim() || null,
        defaultTemplate: settingsForm.defaultTemplate || 'professional',
      }, SERVICE);
      setSettings(saved);
      setSettingsForm({
        blogName: saved.blogName ?? '',
        description: saved.description ?? '',
        heroImage: saved.heroImage ?? '',
        defaultTemplate: saved.defaultTemplate ?? 'professional',
      });
      setSettingsMessage({ kind: 'success', text: '설정이 저장되었습니다.' });
    } catch (e: any) {
      setSettingsMessage({ kind: 'error', text: e?.message || '저장에 실패했습니다.' });
    } finally {
      setSettingsSaving(false);
    }
  };

  if (mode === 'settings') {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>블로그 설정</h1>
          <button onClick={() => setMode('list')} style={{ ...btnStyle, backgroundColor: '#f1f5f9', color: '#475569' }}>
            돌아가기
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
          블로그 identity (이름·소개·대표 이미지·기본 템플릿) 를 설정합니다. 미입력 항목은 매장 정보로 대체됩니다.
        </p>
        {settingsLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>불러오는 중...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>블로그 이름</label>
              <input
                type="text"
                value={settingsForm.blogName}
                onChange={(e) => setSettingsForm((f) => ({ ...f, blogName: e.target.value }))}
                placeholder="예: 우리매장 칼럼 (미입력 시 매장명 표시)"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>소개</label>
              <textarea
                value={settingsForm.description}
                onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="블로그 채널의 짧은 소개"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={labelStyle}>대표 이미지</label>
              <input
                type="text"
                value={settingsForm.heroImage}
                onChange={(e) => setSettingsForm((f) => ({ ...f, heroImage: e.target.value }))}
                placeholder="https:// 이미지 URL"
                style={inputStyle}
              />
              {settingsForm.heroImage && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={settingsForm.heroImage}
                    alt="대표 이미지 미리보기"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>기본 템플릿</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['professional', 'modern'] as const).map((t) => (
                  <label
                    key={t}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: `1px solid ${settingsForm.defaultTemplate === t ? '#3b82f6' : '#e2e8f0'}`,
                      backgroundColor: settingsForm.defaultTemplate === t ? '#eff6ff' : '#fff',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <input
                      type="radio"
                      name="defaultTemplate"
                      value={t}
                      checked={settingsForm.defaultTemplate === t}
                      onChange={() => setSettingsForm((f) => ({ ...f, defaultTemplate: t }))}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                      {t === 'professional' ? 'Professional' : 'Modern'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {settingsMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  color: settingsMessage.kind === 'success' ? '#15803d' : '#dc2626',
                  background: settingsMessage.kind === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${settingsMessage.kind === 'success' ? '#86efac' : '#fecaca'}`,
                }}
              >
                {settingsMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff', opacity: settingsSaving ? 0.6 : 1 }}
              >
                {settingsSaving ? '저장 중...' : '저장'}
              </button>
            </div>

            {settings && (
              <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
                마지막 수정: {new Date(settings.updatedAt).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

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

          <div style={aiBanner}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={aiBannerTitle}>✨ AI 콘텐츠 보조</div>
              <div style={aiBannerDesc}>
                URL이나 자료를 정리해 칼럼 초안을 다듬습니다. 최종 글은 직접 작성·검토하세요.
              </div>
            </div>
            <button type="button" onClick={() => setAiOpen(true)} style={aiBannerBtn}>
              AI로 정리하기
            </button>
          </div>

          <div>
            <label style={labelStyle}>본문</label>
            <RichTextEditor
              value={editorContent}
              onChange={(c) => setEditorContent(c.html)}
              placeholder="매장 블로그 글을 작성하세요"
              minHeight="360px"
              preset="full"
              aiRequestHeaders={(() => {
                const token = getAccessToken();
                return token ? { Authorization: `Bearer ${token}` } : undefined;
              })()}
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

        <AiContentModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          editor={null}
          onInsert={handleAiInsert}
          aiRequestHeaders={(() => {
            const token = getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : undefined;
          })()}
          headerLabel="AI 칼럼 보조"
          urlPlaceholder="https://example.com/article 또는 https://www.youtube.com/watch?v=..."
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>블로그 관리</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            매장 블로그 게시글을 관리합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={openSettings}
            style={{ ...btnStyle, backgroundColor: '#f1f5f9', color: '#475569', whiteSpace: 'nowrap' }}
          >
            블로그 설정
          </button>
          <button
            onClick={() => openEditor()}
            style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff', whiteSpace: 'nowrap' }}
          >
            새 글 작성
          </button>
        </div>
      </div>

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
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>게시글이 없습니다.</p>
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
                  {post.status === 'published' && (
                    <>
                      <button onClick={() => handleCopyUrl(post.slug)} style={{ ...smallBtn, color: '#0f172a' }}>URL 복사</button>
                      <button onClick={() => handlePreview(post.slug)} style={{ ...smallBtn, color: '#0f172a' }}>미리보기</button>
                    </>
                  )}
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

const aiBanner: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 14px',
  background: '#eef2ff',
  border: '1px solid #c7d2fe',
  borderRadius: 8,
};

const aiBannerTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#4338ca',
  marginBottom: 2,
};

const aiBannerDesc: React.CSSProperties = {
  fontSize: 12,
  color: '#6366f1',
  lineHeight: 1.5,
};

const aiBannerBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
