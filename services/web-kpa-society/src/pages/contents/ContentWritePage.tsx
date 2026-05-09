/**
 * ContentWritePage — 콘텐츠 생성/수정
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 *
 * - /content/new → 생성 모드
 * - /content/:id/edit → 수정 모드
 * - RichTextEditor 본문 편집
 * - 제작 흐름: 생성 → 수정 → 공개 (LMS 패턴)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import { contentApi } from '../../api/content';
import { useAuth, getAccessToken } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
// WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1
import { GuideBlock } from '@o4o/shared-space-ui';
import { fetchGuidePageContent } from '../../api/guideContent';

// WO-O4O-CONTENT-AI-ENTRY-V1: HTML 첫 heading 추출 (AI title fallback)
function extractTitleFromHtml(html: string): string {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentWritePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  // WO-O4O-CONTENT-AI-ENTRY-V1: AI로 만들기 모달
  const [aiOpen, setAiOpen] = useState(false);

  // WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1: content.document.editor guide
  const [guideTitle, setGuideTitle] = useState('콘텐츠를 작성합니다.');
  const [guideDesc, setGuideDesc] = useState('제목과 본문을 입력한 뒤 초안 저장 또는 공개 저장을 선택하세요.');
  const [guideSteps, setGuideSteps] = useState([
    '콘텐츠 제목을 입력합니다',
    '본문을 작성합니다 (리치 텍스트 편집)',
    '요약(선택)과 태그(필수, 최소 1개)를 입력합니다',
    '초안으로 저장하거나 바로 공개할 수 있습니다',
  ]);
  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent('kpa-society', 'content.document.editor').then((sections) => {
      if (cancelled) return;
      const raw = sections['guideblock-page-help'];
      if (!raw) return;
      try {
        const obj = JSON.parse(raw);
        if (obj?.title) setGuideTitle(obj.title);
        if (obj?.description) setGuideDesc(obj.description);
        if (Array.isArray(obj?.steps)) setGuideSteps(obj.steps);
      } catch { /* keep fallback */ }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load existing content for edit mode
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    contentApi.detail(id)
      .then((res) => {
        if (res.success) {
          const c = res.data;
          // Check ownership
          if (c.created_by !== user?.id) {
            toast.error('수정 권한이 없습니다');
            navigate('/content', { replace: true });
            return;
          }
          setTitle(c.title);
          setBody(c.body || '');
          setSummary(c.summary || '');
          setTags((c.tags || []).join(', '));
        }
      })
      .catch((e) => {
        toast.error(e?.message || '콘텐츠를 불러올 수 없습니다');
        navigate('/content', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, user?.id, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다');
      navigate('/content', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // WO-O4O-CONTENT-AI-ENTRY-V1: AI 결과를 form state 로 주입
  // - LessonModal 의 onInsert 패턴 재사용 (사용자가 비워둔 필드만 자동 채움)
  // - 본문은 항상 덮어씀 — 사용자가 이후 RichTextEditor 에서 편집 가능
  const handleAiInsert = ({ html, title: aiTitle }: { html: string; title: string; sourceUrl?: string }) => {
    const finalTitle = (aiTitle || '').trim() || extractTitleFromHtml(html);
    if (finalTitle && !title.trim()) {
      setTitle(finalTitle);
    }
    setBody(html);
  };

  const handleSave = async (saveStatus: 'draft' | 'published') => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    // WO-O4O-CONTENT-FORM-TAG-LABEL-VALIDATION-ALIGN-V1:
    //   백엔드 O4O Tag Policy V1 (kpa.routes.ts: 최소 1개 필수)을 라벨/검증 양쪽에서 반영.
    //   서버 round-trip 전에 사용자에게 즉시 피드백.
    const tagArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagArr.length === 0) {
      toast.error('태그를 1개 이상 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body: body || undefined,
        summary: summary || undefined,
        content_type: 'information' as const, // WO-KPA-CONTENT-WRITE-SIMPLIFY-V2: 분류 UI 제거, 기본값 고정
        sub_type: 'content', // WO-KPA-CONTENT-RESOURCE-SUBTYPE-SEPARATION-V1: 콘텐츠 허브 항목 고정
        tags: tagArr,
        status: saveStatus,
      };

      if (isEditMode && id) {
        const res = await contentApi.update(id, payload);
        if (res.success) {
          toast.success('수정되었습니다');
          navigate(`/content/${id}`);
        }
      } else {
        const res = await contentApi.create(payload);
        if (res.success) {
          toast.success('등록되었습니다');
          navigate(`/content/${res.data.id}`);
        }
      }
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#64748b' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>
        {isEditMode ? '콘텐츠 수정' : '콘텐츠 작성'}
      </h1>

      {/* WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1: content.document.editor */}
      <GuideBlock
        variant="info"
        title={guideTitle}
        description={guideDesc}
        steps={guideSteps}
      />

      <div style={styles.card}>
        {/* Title */}
        <div style={styles.field}>
          <label style={styles.label}>제목 <span style={styles.required}>*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="콘텐츠 제목을 입력하세요"
            style={styles.input}
          />
        </div>

        {/* WO-O4O-CONTENT-AI-ENTRY-V1: AI 보조 배너 — 페이지 상단 진입 */}
        <div style={styles.aiBanner}>
          <div style={styles.aiBannerText}>
            <div style={styles.aiBannerTitle}>✨ AI 보조</div>
            <div style={styles.aiBannerDesc}>
              유튜브 URL 또는 콘텐츠 URL로 제목과 본문을 한 번에 생성합니다.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            style={styles.aiBannerBtn}
          >
            AI로 만들기
          </button>
        </div>

        {/* Body — RichTextEditor */}
        <div style={styles.field}>
          <label style={styles.label}>본문</label>
          <RichTextEditor
            value={body}
            onChange={(content) => setBody(content.html)}
            placeholder="내용을 입력하세요"
            minHeight="300px"
            aiRequestHeaders={(() => {
              const token = getAccessToken();
              return token ? { Authorization: `Bearer ${token}` } : undefined;
            })()}
            showCommunitySave={true}
            showStoreSave={true}
          />
        </div>

        {/* Summary */}
        <div style={styles.field}>
          <label style={styles.label}>요약 <span style={styles.hint}>(선택)</span></label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="콘텐츠 요약을 입력하세요 (목록에서 미리보기로 표시됩니다)"
            rows={3}
            style={styles.textarea}
          />
        </div>

        {/* Tags */}
        <div style={styles.field}>
          <label style={styles.label}>태그 <span style={styles.required}>*</span> <span style={styles.hint}>(쉼표로 구분, 최소 1개)</span></label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="예: 약국경영, 복약지도, 건강관리"
            style={styles.input}
          />
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            onClick={() => navigate(-1)}
            style={styles.cancelBtn}
            disabled={saving}
          >
            취소
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            style={styles.draftBtn}
          >
            {saving ? '저장 중...' : '임시 저장'}
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            style={styles.publishBtn}
          >
            {saving ? '저장 중...' : '공개'}
          </button>
        </div>
      </div>

      {/* WO-O4O-CONTENT-AI-ENTRY-V1: AI 콘텐츠 생성 모달
          - editor=null + onInsert 패턴 (LessonModal 과 동일)
          - 결과 HTML 은 setBody → RichTextEditor value prop sync
          - showCommunitySave / showStoreSave 는 페이지 진입 시 비활성 (RichTextEditor 툴바에 이미 존재) */}
      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
      />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 780,
    margin: '0 auto',
    padding: '24px 16px 60px',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
  },
  pageTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  hint: {
    fontSize: '0.75rem',
    fontWeight: 400,
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 16,
    borderTop: '1px solid #f1f5f9',
  },
  cancelBtn: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
  },
  draftBtn: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
  },
  publishBtn: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: 8,
    cursor: 'pointer',
  },
  // WO-O4O-CONTENT-AI-ENTRY-V1
  aiBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    marginBottom: 20,
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: 8,
  },
  aiBannerText: {
    flex: 1,
    minWidth: 0,
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4338ca',
    marginBottom: 2,
  },
  aiBannerDesc: {
    fontSize: 12,
    color: '#6366f1',
  },
  aiBannerBtn: {
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};

export default ContentWritePage;
