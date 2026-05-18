/**
 * PharmacyBlogPage — Staff Blog Management
 *
 * WO-STORE-BLOG-CHANNEL-V1
 *
 * 경로: /store/content/blog
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
  // WO-O4O-KPA-STORE-BLOG-META-V1
  fetchBlogSettings,
  updateBlogSettings,
  type StaffBlogPost,
  type StaffBlogSettings,
} from '../../api/blogStaff';
import { useNavigate, useLocation } from 'react-router-dom';
import { getStoreSlug } from '../../api/pharmacyInfo';
// WO-O4O-KPA-STORE-BLOG-CONTENT-RICHTEXT-V1: canonical RichTextEditor 사용
// WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: AI 콘텐츠 보조 (canonical AiContentModal 재사용)
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import { mediaApi } from '../../api/media';
import { getAccessToken } from '../../contexts/AuthContext';
// WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1: 블로그 템플릿 연결
import { findTemplate } from './productionTemplates';
import type { ProductionTemplate } from './productionTemplates';

// WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: HTML 첫 heading 추출 (AI title fallback)
function extractTitleFromHtml(html: string): string {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

// WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: HTML → plain (excerpt fallback 용)
function htmlToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type ViewMode = 'list' | 'editor' | 'settings';
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
  const navigate = useNavigate();
  const location = useLocation();
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
  // WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: AI 콘텐츠 보조 모달
  const [aiOpen, setAiOpen] = useState(false);
  // WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1: 제작 흐름 진입 시 선택된 템플릿
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);

  // WO-O4O-KPA-STORE-BLOG-META-V1: Blog identity 설정
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

  // Resolve slug from KPA pharmacy info
  useEffect(() => {
    const fetchSlug = async () => {
      try {
        const resolved = await getStoreSlug();
        if (resolved) {
          setSlug(resolved);
        } else {
          // WO-KPA-PHARMACY-OWNER-WITHOUT-STORE-HANDLING-V1: 매장 미연결 시 slug=null 유지 → inline 안내
          // (navigate('/pharmacy') 사용 금지 — PharmacyPage의 hasStoreRole→/store redirect와 무한루프 발생)
          setLoading(false);
          return;
        }
      } catch {
        // 오류 시 slug=null 유지 → inline 안내
        setLoading(false);
        return;
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

  // WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1:
  //   "내 자료함 → 제작 시작 → 블로그" 진입 시 source 항목 기반 신규 에디터 자동 오픈.
  // WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1:
  //   selectedTemplateId → template 조회 → starterHtml 초기 콘텐츠 주입.
  //   source.description 있으면 description 우선, 없으면 starterHtml 사용.
  useEffect(() => {
    const state = location.state as
      | {
          production?: {
            source?: { items?: Array<{ id: string; title: string; description?: string | null; origin?: string }> };
            selectedTemplateId?: string;
          };
        }
      | null;
    const items = state?.production?.source?.items;
    const templateId = state?.production?.selectedTemplateId;
    const template = templateId ? (findTemplate(templateId) ?? null) : null;
    if (template) setSelectedTemplate(template);

    if (items && items.length > 0) {
      const first = items[0];
      setEditingPost(null);
      setEditorTitle(first.title || '');
      setEditorContent(first.description || template?.starterHtml || '');
      setEditorExcerpt(first.description?.slice(0, 120) || '');
      setEditorSlug('');
      setMode('editor');
      window.history.replaceState({}, document.title);
    } else if (template) {
      // 소스 없이 템플릿만 선택하고 진입한 경우 (빈 에디터 + starterHtml)
      setEditingPost(null);
      setEditorTitle('');
      setEditorContent(template.starterHtml || '');
      setEditorExcerpt('');
      setEditorSlug('');
      setMode('editor');
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditor = (post?: StaffBlogPost) => {
    // WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1: 직접 진입(목록→글쓰기)은 템플릿 없이 시작
    setSelectedTemplate(null);
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

  // WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1: 공개 URL 복사 / 미리보기
  const buildPublicUrl = (postSlug: string): string | null => {
    if (!slug || typeof window === 'undefined') return null;
    return `${window.location.origin}/store/${slug}/blog/${postSlug}`;
  };

  const handleCopyUrl = async (postSlug: string) => {
    const url = buildPublicUrl(postSlug);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setError(null);
      // 가벼운 피드백 — 기존 toast 인프라 없음. error state 재활용 회피 위해 alert 대신 짧은 confirm.
      // 정책상 alert 도 회피하려면 추후 toast 추가. 현재는 setError 채널 미오염을 위해 console + 시각 피드백 생략.
      // 사용자에게 직접 안내가 필요 — alert 사용.
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

  // WO-O4O-KPA-STORE-BLOG-CONTENT-RICHTEXT-V1: editor 이미지 업로드 핸들러
  const handleImageUpload = async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, 'kpa-society', 'blog');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드에 실패했습니다.');
  };

  // WO-O4O-KPA-STORE-BLOG-META-V1: settings 화면 진입 핸들러
  const openSettings = useCallback(async () => {
    if (!slug) return;
    setSettingsMessage(null);
    setSettingsLoading(true);
    setMode('settings');
    try {
      const data = await fetchBlogSettings(slug, service);
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
  }, [slug, service]);

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
      }, service);
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

  // WO-O4O-KPA-STORE-BLOG-META-V1: hero image 업로드 (재사용 — handleImageUpload 동일)
  const handleHeroUpload = async (file: File) => {
    setSettingsMessage(null);
    try {
      const url = await handleImageUpload(file);
      setSettingsForm((f) => ({ ...f, heroImage: url }));
    } catch (e: any) {
      setSettingsMessage({ kind: 'error', text: e?.message || '대표 이미지 업로드에 실패했습니다.' });
    }
  };

  // WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: AI 결과를 form state 로 주입 (보조 패턴)
  // - 사용자가 비워둔 title/excerpt 만 자동 채움 (이미 입력된 값 보호)
  // - body 는 항상 덮어씀 — 사용자가 RichTextEditor 에서 추가 편집/검토 후 저장 책임
  // - 자동 게시 / 자동 발행 안 함
  const handleAiInsert = ({ html, title: aiTitle }: { html: string; title: string; sourceUrl?: string }) => {
    const finalTitle = (aiTitle || '').trim() || extractTitleFromHtml(html);
    if (finalTitle && !editorTitle.trim()) {
      setEditorTitle(finalTitle);
    }
    if (!editorExcerpt.trim()) {
      const plain = htmlToPlain(html);
      if (plain) setEditorExcerpt(plain.slice(0, 120));
    }
    setEditorContent(html);
  };

  // Editor view
  if (mode === 'editor') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
              {editingPost ? '게시글 수정' : '새 게시글'}
            </h1>
            {/* WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1: 제작 흐름 진입 시 선택된 템플릿 배지 */}
            {selectedTemplate && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5', backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>
                  {selectedTemplate.style ?? selectedTemplate.name}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{selectedTemplate.name} 템플릿 적용 중</span>
              </div>
            )}
          </div>
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
          {/* WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: AI 콘텐츠 보조 배너
              - 자동 생성기 아님. 전문인 칼럼 작성을 보조하는 도구.
              - 진입 wording 은 "정리 / 다듬기 / 요약" 톤. "자동 블로그 생성" 표현 회피. */}
          <div style={aiBanner}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={aiBannerTitle}>✨ AI 콘텐츠 보조</div>
              <div style={aiBannerDesc}>
                URL이나 자료를 정리해 칼럼 초안을 다듬습니다. 최종 글은 직접 작성·검토하세요.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              style={aiBannerBtn}
            >
              AI로 정리하기
            </button>
          </div>

          <div>
            <label style={labelStyle}>본문</label>
            {/* WO-O4O-KPA-STORE-BLOG-CONTENT-RICHTEXT-V1: textarea → canonical RichTextEditor (preset=full).
                기존 plain-text 게시글은 RichTextEditor 가 setContent 시 자동으로 paragraph 로 감싸서 호환. */}
            <RichTextEditor
              value={editorContent}
              onChange={(c) => setEditorContent(c.html)}
              onImageUpload={handleImageUpload}
              placeholder="전문 칼럼을 작성하세요"
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

        {/* WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: AI 콘텐츠 보조 모달
            - editor=null + onInsert 패턴 (ContentWritePage / ResourceWritePage / LessonModal 동일)
            - mode 4종 모두 활용 가능: customer_rewrite (소비자용 정리) / summary (요약) /
              pop (POP·SNS용 짧은 문구) / title_suggest (제목 추천)
            - URL 탭: /api/ai/url-to-blocks → blocksToHtml → RichTextEditor 주입
            - 자동 발행 / 자동 게시 안 함 — 사용자가 검토 후 임시저장 / 발행 */}
        {/* WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1: templateId/systemPrompt/forcedOptions 주입 */}
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
          templateId={selectedTemplate?.id}
          templateSystemPrompt={selectedTemplate?.systemPromptOverride}
          templateForcedOptions={selectedTemplate?.forcedOptions}
        />
      </div>
    );
  }

  // Settings view (WO-O4O-KPA-STORE-BLOG-META-V1)
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
          블로그 자체의 identity (이름·소개·대표 이미지·기본 템플릿) 를 설정합니다. 미입력 항목은 매장 정보로 대체됩니다.
        </p>

        {settingsLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            불러오는 중...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>블로그 이름</label>
              <input
                type="text"
                value={settingsForm.blogName}
                onChange={(e) => setSettingsForm((f) => ({ ...f, blogName: e.target.value }))}
                placeholder="예: 우리약국 칼럼 (미입력 시 매장명 표시)"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>소개</label>
              <textarea
                value={settingsForm.description}
                onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="블로그 채널의 짧은 소개 (전문 분야, 주요 주제 등)"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={labelStyle}>대표 이미지</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={settingsForm.heroImage}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, heroImage: e.target.value }))}
                  placeholder="https:// 이미지 URL 또는 아래 [업로드] 사용"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <label style={{ ...btnStyle, backgroundColor: '#f1f5f9', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  업로드
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleHeroUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {settingsForm.heroImage && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={settingsForm.heroImage}
                    alt="대표 이미지 미리보기"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </div>
              )}
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                공개 블로그 목록 페이지 상단에 column masthead 로 표시됩니다.
              </p>
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
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                URL ?template=modern 으로 임시 미리보기 가능. 향후 유료 템플릿 추가 예정.
              </p>
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

  // No store linked
  if (!slug) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '80px 0' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>약국 매장이 아직 연결되지 않았습니다</p>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>약국 경영지원 서비스 신청 후 매장이 활성화됩니다.</p>
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
            매장 블로그 게시글을 관리합니다.
          </p>
        </div>
        {/* WO-O4O-KPA-STORE-BLOG-META-V1: 블로그 설정 진입 */}
        {/* WO-O4O-STORE-CREATION-CTA-EMPTY-STATE-FIX-V1: "블로그 글 만들기" CTA 복원 */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => openEditor()}
            style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff', whiteSpace: 'nowrap' }}
          >
            블로그 글 만들기
          </button>
          <button
            onClick={openSettings}
            style={{ ...btnStyle, backgroundColor: '#f1f5f9', color: '#475569', whiteSpace: 'nowrap' }}
          >
            블로그 설정
          </button>
        </div>
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
            게시글이 없습니다.
          </p>
          <button
            onClick={() => openEditor()}
            style={{ ...btnStyle, marginTop: '12px', backgroundColor: '#3b82f6', color: '#fff' }}
          >
            블로그 글 만들기
          </button>
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
                  {/* WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1: 공개 URL 복사 / 미리보기 (발행 글만) */}
                  {post.status === 'published' && (
                    <>
                      <button
                        onClick={() => handleCopyUrl(post.slug)}
                        style={{ ...smallBtn, color: '#0f172a' }}
                        title="공개 URL을 클립보드에 복사"
                      >
                        URL 복사
                      </button>
                      <button
                        onClick={() => handlePreview(post.slug)}
                        style={{ ...smallBtn, color: '#0f172a' }}
                        title="공개 페이지를 새 탭에서 열기"
                      >
                        미리보기
                      </button>
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

// WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1
const aiBanner: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 14px',
  marginBottom: 16,
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

export default PharmacyBlogPage;
