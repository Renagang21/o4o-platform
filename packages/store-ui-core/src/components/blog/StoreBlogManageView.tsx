/**
 * StoreBlogManageView — 매장 블로그 관리 (공통 화면 본체 · 카드 목록형)
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1
 *
 * 원본 계약 유지:
 *   WO-O4O-GLYCO-BLOG-INTRODUCE-V1 (GP) / WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1 (KCos)
 *   WO-O4O-KPA-STORE-BLOG-META-V1 (블로그 설정 identity)
 *
 * 3 ViewMode: list(카드 목록) / editor / settings.
 * K-Cosmetics · GlycoPharm 사본의 실제 차이(diff 실측 75줄)는 다음뿐이었다.
 *   1) slug resolver — KCos `fetchChannelOverviewWithCode().organizationCode`
 *                      GP  `pharmacyApi.getPharmacyStatus().storeSlug`   → resolveSlug 주입
 *   2) service 파라미터 ('cosmetics' / 'glycopharm')                      → api adapter 가 흡수
 *   3) 명사·안내 문구 (매장/약국)                                          → labels 주입
 *   4) 목록 액션 title 속성(GP 만 보유)                                    → labels.publishedActionTitles
 * publish/archive/delete 정책과 공개 URL 규칙(`/store/{slug}/blog/{postSlug}`)은 바꾸지 않는다.
 *
 * ⚠️ KPA `PharmacyBlogPage` 는 목록이 DataTable + 일괄(발행/보관/삭제) 모델이라 이 View 를 쓰지 않는다.
 *    대신 editor/settings 는 동일하므로 StoreBlogEditorPanel · StoreBlogSettingsPanel 을 공유한다.
 *    (강제로 하나의 View 에 흡수하면 어느 한쪽의 기능을 바꿔야 한다 — WO §5 금지.)
 *
 * ⚠️ store-ui-core 에 새 dependency 를 만들지 않는다. RichTextEditor 는 renderEditor slot 주입이다.
 */

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { GuideBackLink } from '../GuideBackLink';
import { StoreBlogEditorPanel } from './StoreBlogEditorPanel';
import { StoreBlogSettingsPanel, type StoreBlogSettingsPanelLabels } from './StoreBlogSettingsPanel';
import {
  STORE_BLOG_STATUS_LABELS,
  formatStoreBlogDate,
  storeBlogBtnStyle,
  storeBlogSmallBtnStyle,
  type StoreBlogPost,
  type StoreBlogSettings,
  type StoreBlogSettingsForm,
  type StoreBlogSettingsInput,
  type StoreBlogStatusFilter,
} from './storeBlogTypes';

export interface StoreBlogPostInput {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
}

/** 서비스 `api/blogStaff` 바인딩 — service 파라미터는 서비스가 고정한다 */
export interface StoreBlogManageApi {
  /** 매장 slug 해석 (KCos: organizationCode / GP: storeSlug) */
  resolveSlug: () => Promise<string | null>;
  fetchPosts: (slug: string, params: { status?: string; limit: number }) => Promise<StoreBlogPost[]>;
  createPost: (slug: string, input: StoreBlogPostInput) => Promise<unknown>;
  updatePost: (slug: string, postId: string, input: StoreBlogPostInput) => Promise<unknown>;
  publishPost: (slug: string, postId: string) => Promise<unknown>;
  archivePost: (slug: string, postId: string) => Promise<unknown>;
  deletePost: (slug: string, postId: string) => Promise<unknown>;
  fetchSettings: (slug: string) => Promise<StoreBlogSettings | null>;
  updateSettings: (slug: string, input: StoreBlogSettingsInput) => Promise<StoreBlogSettings>;
}

export interface StoreBlogManageLabels {
  /** 목록 부제 */
  listSubtitle: string;
  /** 매장 미연결 오류 — '연결된 매장이 없습니다. {매장|약국} 신청을 먼저 진행하세요.' */
  noStoreError: string;
  /** slug 조회 실패 — '{매장|약국} 정보를 불러올 수 없습니다.' */
  resolveErrorFallback: string;
  /** 본문 편집기 placeholder */
  editorPlaceholder: string;
  /** 발행글 액션 버튼 title 속성 (GP 만 보유 — 없으면 미지정) */
  publishedActionTitles?: { copyUrl: string; preview: string };
  settings: StoreBlogSettingsPanelLabels;
}

export interface StoreBlogManageViewProps {
  api: StoreBlogManageApi;
  labels: StoreBlogManageLabels;
  /** 본문 편집기 slot (RichTextEditor 주입) */
  renderEditor: (ctx: {
    value: string;
    onChange: (html: string) => void;
    placeholder: string;
  }) => ReactNode;
  /** 가이드 back-link 목적지 */
  guideLinkTo?: string;
  guideLinkLabel?: string;
}

type ViewMode = 'list' | 'editor' | 'settings';

export function StoreBlogManageView({
  api,
  labels,
  renderEditor,
  guideLinkTo = '/guide/features/blog',
  guideLinkLabel = '블로그 작성 방법',
}: StoreBlogManageViewProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [posts, setPosts] = useState<StoreBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingPost, setEditingPost] = useState<StoreBlogPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<StoreBlogStatusFilter>('all');

  // Editor state
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorExcerpt, setEditorExcerpt] = useState('');
  const [editorSlug, setEditorSlug] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<StoreBlogSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState<StoreBlogSettingsForm>({
    blogName: '',
    description: '',
    heroImage: '',
    defaultTemplate: 'professional',
  });
  const [settingsMessage, setSettingsMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Resolve store slug
  useEffect(() => {
    (async () => {
      try {
        const resolved = await api.resolveSlug();
        if (resolved) {
          setSlug(resolved);
        } else {
          setError(labels.noStoreError);
          setLoading(false);
        }
      } catch (e: any) {
        setError(e?.message || labels.resolveErrorFallback);
        setLoading(false);
      }
    })();
    // api / labels 는 서비스 모듈 상수라 재생성되지 않는다(원본 동작 유지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPosts = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await api.fetchPosts(slug, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      });
      setPosts(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, statusFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const openEditor = (post?: StoreBlogPost) => {
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
        await api.updatePost(slug, editingPost.id, {
          title: editorTitle,
          content: editorContent,
          excerpt: editorExcerpt || undefined,
          slug: editorSlug !== editingPost.slug ? editorSlug : undefined,
        });
      } else {
        await api.createPost(slug, {
          title: editorTitle,
          content: editorContent,
          excerpt: editorExcerpt || undefined,
          slug: editorSlug || undefined,
        });
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
      await api.publishPost(slug, postId);
      await loadPosts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleArchive = async (postId: string) => {
    if (!slug) return;
    try {
      await api.archivePost(slug, postId);
      await loadPosts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!slug || !confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await api.deletePost(slug, postId);
      await loadPosts();
    } catch (e: any) {
      setError(e.message);
    }
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

  const openSettings = useCallback(async () => {
    if (!slug) return;
    setSettingsMessage(null);
    setSettingsLoading(true);
    setMode('settings');
    try {
      const data = await api.fetchSettings(slug);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleSaveSettings = async () => {
    if (!slug) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const saved = await api.updateSettings(slug, {
        blogName: settingsForm.blogName.trim() || null,
        description: settingsForm.description.trim() || null,
        heroImage: settingsForm.heroImage.trim() || null,
        defaultTemplate: settingsForm.defaultTemplate || 'professional',
      });
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

  // Settings view
  if (mode === 'settings') {
    return (
      <StoreBlogSettingsPanel
        form={settingsForm}
        onFormChange={setSettingsForm}
        settings={settings}
        loading={settingsLoading}
        saving={settingsSaving}
        message={settingsMessage}
        labels={labels.settings}
        onSave={handleSaveSettings}
        onBack={() => setMode('list')}
      />
    );
  }

  // Editor view
  if (mode === 'editor') {
    return (
      <StoreBlogEditorPanel
        isEditing={!!editingPost}
        title={editorTitle}
        onTitleChange={setEditorTitle}
        slug={editorSlug}
        onSlugChange={setEditorSlug}
        excerpt={editorExcerpt}
        onExcerptChange={setEditorExcerpt}
        saving={saving}
        canSave={!!editorTitle.trim() && !!editorContent.trim()}
        onSave={handleSave}
        onCancel={() => setMode('list')}
        renderEditor={() =>
          renderEditor({
            value: editorContent,
            onChange: setEditorContent,
            placeholder: labels.editorPlaceholder,
          })
        }
      />
    );
  }

  // List view
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>블로그 관리</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            {labels.listSubtitle}
          </p>
          <div style={{ marginTop: 8 }}><GuideBackLink to={guideLinkTo} label={guideLinkLabel} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={openSettings}
            style={{ ...storeBlogBtnStyle, backgroundColor: '#f1f5f9', color: '#475569', whiteSpace: 'nowrap' }}
          >
            블로그 설정
          </button>
          <button
            onClick={() => openEditor()}
            style={{ ...storeBlogBtnStyle, backgroundColor: '#3b82f6', color: '#fff', whiteSpace: 'nowrap' }}
          >
            새 글 작성
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'draft', 'published', 'archived'] as StoreBlogStatusFilter[]).map((f) => (
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
            {f === 'all' ? '전체' : STORE_BLOG_STATUS_LABELS[f].label}
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
            const status = STORE_BLOG_STATUS_LABELS[post.status] || STORE_BLOG_STATUS_LABELS.draft;
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
                    {formatStoreBlogDate(post.updatedAt)}
                    {post.slug && ` · /${post.slug}`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                  {post.status === 'published' && (
                    <>
                      <button
                        onClick={() => handleCopyUrl(post.slug)}
                        style={{ ...storeBlogSmallBtnStyle, color: '#0f172a' }}
                        title={labels.publishedActionTitles?.copyUrl}
                      >
                        URL 복사
                      </button>
                      <button
                        onClick={() => handlePreview(post.slug)}
                        style={{ ...storeBlogSmallBtnStyle, color: '#0f172a' }}
                        title={labels.publishedActionTitles?.preview}
                      >
                        미리보기
                      </button>
                    </>
                  )}
                  <button onClick={() => openEditor(post)} style={{ ...storeBlogSmallBtnStyle, color: '#3b82f6' }}>수정</button>
                  {post.status === 'draft' && (
                    <button onClick={() => handlePublish(post.id)} style={{ ...storeBlogSmallBtnStyle, color: '#16a34a' }}>발행</button>
                  )}
                  {post.status === 'published' && (
                    <button onClick={() => handleArchive(post.id)} style={{ ...storeBlogSmallBtnStyle, color: '#d97706' }}>보관</button>
                  )}
                  <button onClick={() => handleDelete(post.id)} style={{ ...storeBlogSmallBtnStyle, color: '#ef4444' }}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
