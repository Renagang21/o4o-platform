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
import { RichTextEditor } from '@o4o/content-editor';
import { contentApi } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { value: 'information', label: '정보 콘텐츠' },
  { value: 'participation', label: '참여 프로그램' },
] as const;

const SUB_TYPES: Record<string, { value: string; label: string }[]> = {
  participation: [
    { value: '설문', label: '설문' },
    { value: '퀴즈', label: '퀴즈' },
    { value: '이벤트', label: '이벤트' },
    { value: '캠페인', label: '캠페인' },
  ],
  information: [
    { value: '건강정보', label: '건강정보' },
    { value: '약물학정보', label: '약물학정보' },
    { value: '복약정보', label: '복약정보' },
    { value: '실무정보', label: '실무정보' },
    { value: '자유 콘텐츠', label: '자유 콘텐츠' },
  ],
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentWritePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [summary, setSummary] = useState('');
  const [contentType, setContentType] = useState<string>('information');
  const [subType, setSubType] = useState<string>('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

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
          setContentType(c.content_type || 'information');
          setSubType(c.sub_type || '');
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

  const handleSave = async (saveStatus: 'draft' | 'published') => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body: body || undefined,
        summary: summary || undefined,
        content_type: contentType as 'participation' | 'information',
        sub_type: 'content', // WO-KPA-CONTENT-RESOURCE-SUBTYPE-SEPARATION-V1: 콘텐츠 허브 항목 고정
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
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

  const availableSubTypes = SUB_TYPES[contentType] || [];

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

        {/* Content Type + Sub Type */}
        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>분류</label>
            <select
              value={contentType}
              onChange={(e) => { setContentType(e.target.value); setSubType(''); }}
              style={styles.select}
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>유형</label>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              style={styles.select}
            >
              <option value="">선택 안 함</option>
              {availableSubTypes.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Body — RichTextEditor */}
        <div style={styles.field}>
          <label style={styles.label}>본문</label>
          <RichTextEditor
            value={body}
            onChange={(content) => setBody(content.html)}
            placeholder="내용을 입력하세요"
            minHeight="300px"
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
          <label style={styles.label}>태그 <span style={styles.hint}>(선택, 쉼표로 구분)</span></label>
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
  select: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },
  row: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
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
};

export default ContentWritePage;
