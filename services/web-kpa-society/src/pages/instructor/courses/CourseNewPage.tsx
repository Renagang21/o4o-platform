/**
 * CourseNewPage — /instructor/courses/new
 * WO-O4O-LMS-FOUNDATION-V1
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lmsInstructorApi, CourseLevel } from '../../../api/lms-instructor';

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'beginner', label: '입문' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
];

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 680, margin: '0 auto', padding: '32px 20px' },
  backLink: { fontSize: 13, color: '#6b7280', cursor: 'pointer', marginBottom: 20, display: 'inline-block' },
  title: { fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 28px' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, color: '#111827', outline: 'none',
  },
  textarea: {
    padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 100,
  },
  select: {
    padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, color: '#111827', outline: 'none', background: '#fff',
  },
  tagContainer: {
    display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px',
    border: '1px solid #d1d5db', borderRadius: 8, minHeight: 44, alignItems: 'center',
  },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px',
    background: '#ede9fe', color: '#5b21b6', borderRadius: 999, fontSize: 12, fontWeight: 500,
  },
  tagRemove: { cursor: 'pointer', fontSize: 14, color: '#7c3aed', lineHeight: 1 },
  tagInput: { border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 80, color: '#111827' },
  hint: { fontSize: 11, color: '#9ca3af' },
  actions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: {
    padding: '10px 20px', background: '#f3f4f6', color: '#374151',
    border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
  },
  error: { color: '#ef4444', fontSize: 13 },
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '10px 24px', background: disabled ? '#c4b5fd' : '#4f46e5', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

interface CourseNewPageProps {
  /** Override page title (default: "새 강의 만들기") */
  pageTitle?: string;
  /** Override back link text (default: "← 강의 목록") */
  backLinkText?: string;
  /** Override cancel/back navigation target (default: "/instructor/courses") */
  returnTo?: string;
}

export default function CourseNewPage({
  pageTitle,
  backLinkText,
  returnTo,
}: CourseNewPageProps = {}) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', level: 'beginner' as CourseLevel });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t || t.length > 30 || tags.includes(t)) { setTagInput(''); return; }
    setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    if (tags.length === 0) { setError('태그를 1개 이상 입력해주세요'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res: any = await lmsInstructorApi.createCourse({
        title: form.title.trim(),
        description: form.description.trim(),
        level: form.level,
        tags: tags.length > 0 ? tags : undefined,
      });
      // API returns { success, data: { course: Course } }
      const courseId = res.data?.data?.course?.id;
      if (courseId) {
        navigate(`/instructor/courses/${courseId}`);
      } else {
        navigate('/instructor/courses');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || '강의 생성에 실패했습니다.');
      setSubmitting(false);
    }
  };

  const isValid = form.title.trim().length > 0 && form.description.trim().length > 0;

  return (
    <div style={styles.page}>
      <span style={styles.backLink} onClick={() => navigate(returnTo ?? '/instructor/courses')}>{backLinkText ?? '← 강의 목록'}</span>
      <h1 style={styles.title}>{pageTitle ?? '새 강의 만들기'}</h1>

      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>강의 제목 *</label>
          <input
            style={styles.input}
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="강의 제목을 입력하세요"
            maxLength={255}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>강의 설명 *</label>
          <textarea
            style={styles.textarea}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="강의 내용과 목표를 설명해 주세요"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>난이도</label>
          <select
            style={styles.select}
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as CourseLevel }))}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>태그</label>
          <div style={styles.tagContainer}>
            {tags.map((tag) => (
              <span key={tag} style={styles.tag}>
                {tag}
                <span style={styles.tagRemove} onClick={() => removeTag(tag)}>×</span>
              </span>
            ))}
            <input
              style={styles.tagInput}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="태그 입력 후 Enter"
            />
          </div>
          <span style={styles.hint}>Enter 키로 태그를 추가하세요</span>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={() => navigate(returnTo ?? '/instructor/courses')}>
            취소
          </button>
          <button type="submit" style={submitBtnStyle(!isValid || submitting)} disabled={!isValid || submitting}>
            {submitting ? '생성 중...' : '강의 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
