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
import { useLocation } from 'react-router-dom';
import { getStoreSlug } from '../../api/pharmacyInfo';
// WO-O4O-KPA-STORE-BLOG-CONTENT-RICHTEXT-V1: canonical RichTextEditor 사용
import { RichTextEditor } from '@o4o/content-editor';
import { mediaApi } from '../../api/media';
import { getAccessToken } from '../../contexts/AuthContext';
// WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1: 블로그 템플릿 연결
import { findTemplate } from './productionTemplates';
import type { ProductionTemplate } from './productionTemplates';
// WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1: list view 표준 테이블
import { DataTable, type Column, ActionBar, BulkResultModal } from '@o4o/ui';
import { useBatchAction } from '@o4o/operator-ux-core';
import { Send, Archive as ArchiveIcon, Trash2 } from 'lucide-react';
// WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
//   editor / settings 화면 본체는 3서비스 공통 Core 를 소비한다(목록은 KPA 전용 DataTable + 일괄 실행 모델 유지).
import {
  GuideBackLink,
  StoreBlogEditorPanel,
  StoreBlogSettingsPanel,
  storeBlogBtnStyle,
  storeBlogSmallBtnStyle,
} from '@o4o/store-ui-core';

// WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: HTML 첫 heading 추출 (AI title fallback)
type ViewMode = 'list' | 'editor' | 'settings';
type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

// WO-O4O-KPA-OPERATOR-STORE-CONTENT-MENU-TERMINOLOGY-ALIGNMENT-V1: 상태 라벨 통일(초안/발행/보관)
// WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
//   ⚠️ 공통화 대상이 아니다. KCos/GP 는 '임시저장/발행됨' 을 쓰므로 공통 상수로 치환하면
//   KPA 또는 KCos/GP 중 한쪽 문구가 조용히 바뀐다. 색상만 동일하고 라벨은 서비스 계약이 다르다.
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '초안', color: '#64748b', bg: '#f1f5f9' },
  published: { label: '발행', color: '#16a34a', bg: '#f0fdf4' },
  archived: { label: '보관', color: '#d97706', bg: '#fefce8' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function PharmacyBlogPage({ service }: { service?: string }) {
  const location = useLocation();
  // WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1: 원본 자료(source)를 최초 create 까지 보존
  const [pendingSourceItems, setPendingSourceItems] = useState<{ kind: string; id: string; title?: string }[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [posts, setPosts] = useState<StaffBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingPost, setEditingPost] = useState<StaffBlogPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1: 표준 테이블 selection + bulk
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const batch = useBatchAction();

  // Editor state
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorExcerpt, setEditorExcerpt] = useState('');
  const [editorSlug, setEditorSlug] = useState('');
  const [saving, setSaving] = useState(false);
  // WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1: AI 콘텐츠 보조 모달
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
      // WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1:
      //   origin → derivation source_kind 매핑 후 보존(최초 create 시 1회 전달).
      const ORIGIN_TO_KIND: Record<string, string> = {
        snapshot: 'content_snapshot',
        direct: 'content_direct',
        library: 'store_execution_asset',
      };
      setPendingSourceItems(
        items
          .filter((it) => it.id && it.origin && ORIGIN_TO_KIND[it.origin])
          .map((it) => ({ kind: ORIGIN_TO_KIND[it.origin as string], id: it.id, title: it.title })),
      );
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
          // WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1: 최초 create 시에만 원본 관계 전달
          sourceItems: pendingSourceItems.length > 0 ? pendingSourceItems : undefined,
        }, service);
        setPendingSourceItems([]);
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

  // WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1: Bulk action — fan-out 패턴
  type BulkOp = 'publish' | 'archive' | 'delete';
  const batchBlogOp = async (
    ids: string[],
    options?: Record<string, unknown>,
  ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
    const op = options?.op as BulkOp | undefined;
    if (!op || !slug) {
      return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: !slug ? 'no slug' : 'op missing' })) } };
    }
    const fn =
      op === 'publish' ? (id: string) => publishBlogPost(slug, id, service)
      : op === 'archive' ? (id: string) => archiveBlogPost(slug, id, service)
      : (id: string) => deleteBlogPost(slug, id, service);
    const settled = await Promise.allSettled(ids.map((id) => fn(id)));
    const results = settled.map((r, i) => {
      const id = ids[i];
      if (r.status === 'fulfilled') return { id, status: 'success' as const };
      const err = r.reason as { message?: string } | null;
      return { id, status: 'failed' as const, error: err?.message || 'Network error' };
    });
    return { data: { results } };
  };

  const runBulk = async (ids: string[], op: BulkOp, confirmMsg?: string) => {
    if (ids.length === 0) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const result = await batch.executeBatch(batchBlogOp, ids, { op });
    if (result.successCount > 0) {
      setSelectedKeys([]);
      await loadPosts();
    }
  };

  // status별 가능한 selection 분류 (서버 거절 사전 차단)
  const selectedSet = new Set(selectedKeys);
  const selectedDraftIds = posts.filter((p) => selectedSet.has(p.id) && p.status === 'draft').map((p) => p.id);
  const selectedNotArchivedIds = posts.filter((p) => selectedSet.has(p.id) && p.status !== 'archived').map((p) => p.id);
  const selectedAllIds = posts.filter((p) => selectedSet.has(p.id)).map((p) => p.id);

  const handleBulkPublish = () => runBulk(selectedDraftIds, 'publish');
  const handleBulkArchive = () => runBulk(selectedNotArchivedIds, 'archive', `선택한 ${selectedNotArchivedIds.length}개 블로그를 보관하시겠습니까?`);
  const handleBulkDelete = () => runBulk(selectedAllIds, 'delete', `선택한 ${selectedAllIds.length}개 블로그를 삭제하시겠습니까? 되돌릴 수 없습니다.`);

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

  // WO-O4O-KPA-BLOG-AI-STEP-REMOVE-V1: AI 초안 생성 결과 주입(handleAiInsert) 제거.

  // Editor view
  // WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
  //   editor 화면 본체를 공통 StoreBlogEditorPanel 로 이관(KCos/GP 와 동일 Core).
  //   KPA 고유 요소(템플릿 배지 · 외부 AI 안내 · 이미지 업로드)는 slot 으로 그대로 보존한다.
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
        /* WO-O4O-BLOG-TEMPLATE-WORKFLOW-V1: 제작 흐름 진입 시 선택된 템플릿 배지 */
        headerBadge={selectedTemplate ? (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5', backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>
              {selectedTemplate.style ?? selectedTemplate.name}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{selectedTemplate.name} 템플릿 적용 중</span>
          </div>
        ) : undefined}
        /* WO-O4O-KPA-BLOG-AI-STEP-REMOVE-V1: 블로그 초안 AI 생성 진입점 제거(초안 생성 AI 제거 정책).
           외부 AI 도구에서 작성한 글을 본문에 붙여넣어 편집한다. (본문 편집기 Toolbar "AI 정리"는 유지.) */
        beforeEditor={(
          <p style={blogGuideHint}>
            외부 AI 도구(ChatGPT·Claude·Gemini 등)나 문서에서 작성한 글을 아래 본문에 붙여넣고 편집하세요.
          </p>
        )}
        /* WO-O4O-KPA-STORE-BLOG-CONTENT-RICHTEXT-V1: canonical RichTextEditor (preset=full).
           기존 plain-text 게시글은 RichTextEditor 가 setContent 시 자동으로 paragraph 로 감싸서 호환. */
        renderEditor={() => (
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
        )}
      />
    );
  }

  // Settings view (WO-O4O-KPA-STORE-BLOG-META-V1)
  // WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
  //   settings 화면 본체를 공통 StoreBlogSettingsPanel 로 이관(KCos/GP 와 동일 Core).
  //   KPA 고유 요소(대표 이미지 업로드 버튼)는 slot 으로 그대로 보존한다.
  if (mode === 'settings') {
    return (
      <StoreBlogSettingsPanel
        form={settingsForm}
        onFormChange={setSettingsForm}
        settings={settings}
        loading={settingsLoading}
        saving={settingsSaving}
        message={settingsMessage}
        labels={{
          subtitle: '블로그 자체의 identity (이름·소개·대표 이미지·기본 템플릿) 를 설정합니다. 미입력 항목은 매장 정보로 대체됩니다.',
          blogNamePlaceholder: '예: 우리약국 칼럼 (미입력 시 매장명 표시)',
          descriptionPlaceholder: '블로그 채널의 짧은 소개 (전문 분야, 주요 주제 등)',
          heroImagePlaceholder: 'https:// 이미지 URL 또는 아래 [업로드] 사용',
          heroImageHint: '공개 블로그 목록 페이지 상단에 column masthead 로 표시됩니다.',
        }}
        onSave={handleSaveSettings}
        onBack={() => setMode('list')}
        heroUploadSlot={(
          <label style={{ ...storeBlogBtnStyle, backgroundColor: '#f1f5f9', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
        )}
      />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>블로그 관리</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            매장 블로그 게시글을 관리합니다.
          </p>
          <div style={{ marginTop: 8 }}><GuideBackLink to="/guide/features/blog" label="블로그 작성 방법" /></div>
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
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
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

      {/* WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1: ActionBar bulk action */}
      <div style={{ marginBottom: '12px' }}>
        <ActionBar
          selectedCount={selectedKeys.length}
          onClearSelection={() => setSelectedKeys([])}
          actions={[
            {
              key: 'bulk-publish',
              label: `일괄 발행 (${selectedDraftIds.length})`,
              onClick: handleBulkPublish,
              variant: 'primary' as const,
              icon: <Send className="w-3.5 h-3.5" />,
              loading: batch.loading,
              group: 'actions',
              visible: selectedDraftIds.length > 0,
              tooltip: '선택한 초안 블로그를 일괄 발행합니다',
            },
            {
              key: 'bulk-archive',
              label: `일괄 보관 (${selectedNotArchivedIds.length})`,
              onClick: handleBulkArchive,
              variant: 'default' as const,
              icon: <ArchiveIcon className="w-3.5 h-3.5" />,
              loading: batch.loading,
              group: 'actions',
              visible: selectedNotArchivedIds.length > 0,
            },
            {
              key: 'bulk-delete',
              label: `일괄 삭제 (${selectedKeys.length})`,
              onClick: handleBulkDelete,
              variant: 'danger' as const,
              icon: <Trash2 className="w-3.5 h-3.5" />,
              loading: batch.loading,
              group: 'actions',
              visible: selectedKeys.length > 0,
            },
          ]}
        />
      </div>

      <BulkResultModal
        open={batch.showResult}
        onClose={() => batch.clearResult()}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1: 카드형 → @o4o/ui DataTable */}
      <DataTable<StaffBlogPost>
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: setSelectedKeys,
        }}
        columns={[
          {
            key: 'title',
            title: '제목',
            render: (_v, post) => (
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{post.title}</span>
            ),
          },
          {
            key: 'slug',
            title: '슬러그',
            render: (_v, post) => (
              <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                {post.slug ? `/${post.slug}` : '-'}
              </span>
            ),
          },
          {
            key: 'status',
            title: '상태',
            align: 'center',
            render: (_v, post) => {
              const s = STATUS_LABELS[post.status] || STATUS_LABELS.draft;
              return (
                <span style={{ fontSize: '11px', fontWeight: 600, color: s.color, backgroundColor: s.bg, padding: '2px 8px', borderRadius: '4px' }}>
                  {s.label}
                </span>
              );
            },
          },
          {
            key: 'updatedAt',
            title: '수정일',
            render: (_v, post) => (
              <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(post.updatedAt)}</span>
            ),
          },
          {
            key: 'actions',
            title: '액션',
            align: 'right',
            render: (_v, post) => (
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {post.status === 'published' && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyUrl(post.slug); }}
                      style={{ ...smallBtn, color: '#0f172a' }}
                      title="공개 URL 복사"
                    >
                      URL
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreview(post.slug); }}
                      style={{ ...smallBtn, color: '#0f172a' }}
                      title="공개 페이지 열기"
                    >
                      미리보기
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); openEditor(post); }}
                  style={{ ...smallBtn, color: '#3b82f6' }}
                >
                  수정
                </button>
                {post.status === 'draft' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePublish(post.id); }}
                    style={{ ...smallBtn, color: '#16a34a' }}
                  >
                    발행
                  </button>
                )}
                {post.status === 'published' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleArchive(post.id); }}
                    style={{ ...smallBtn, color: '#d97706' }}
                  >
                    보관
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                  style={{ ...smallBtn, color: '#ef4444' }}
                >
                  삭제
                </button>
              </div>
            ),
          },
        ] as Column<StaffBlogPost>[]}
        dataSource={posts}
        rowKey="id"
        loading={loading}
        emptyText={
          posts.length === 0 ? '게시글이 없습니다.' : '검색 결과가 없습니다.'
        }
      />
    </div>
  );
}

// WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
//   btnStyle / smallBtn 은 KCos·GP 사본과 값이 동일했다 → 공통 style 을 소비한다(로컬 사본 제거).
const btnStyle = storeBlogBtnStyle;
const smallBtn = storeBlogSmallBtnStyle;

// WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1:
//   labelStyle / inputStyle 은 editor·settings 이관으로 사용처가 사라져 제거했다.
//   동일 값은 @o4o/store-ui-core 의 storeBlogLabelStyle / storeBlogInputStyle 이 보유한다.

// WO-O4O-KPA-STORE-BLOG-AI-WIRING-V1
// WO-O4O-KPA-BLOG-AI-STEP-REMOVE-V1: 외부 LLM 붙여넣기 안내(짧은 hint)
const blogGuideHint: React.CSSProperties = {
  margin: '0 0 16px',
  padding: '9px 12px',
  fontSize: 12,
  lineHeight: 1.6,
  color: '#1e40af',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: 8,
};

export default PharmacyBlogPage;
