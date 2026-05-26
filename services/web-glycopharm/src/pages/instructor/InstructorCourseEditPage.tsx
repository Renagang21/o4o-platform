/**
 * InstructorCourseEditPage — 강의 생성/편집 + 레슨 관리
 *
 * WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-PARITY-V1
 * 경로: /instructor/courses/new (신규) | /instructor/courses/:courseId (편집)
 *
 * KPA CourseEditPage 기준 정렬. KPA 전용 제외:
 *   - GuideBlock (@o4o/shared-space-ui)
 *   - CourseStructureAiModal
 *   - fetchGuidePageContent
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import { getAccessToken } from '@/contexts/AuthContext';
import {
  lmsApi,
  type InstructorCourseDetail,
  type InstructorLesson,
  type LessonType,
  type CourseVisibility,
  type CourseReusablePolicy,
} from '@/api/lms';

const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  video: '동영상', article: '문서', quiz: '퀴즈', assignment: '과제',
};
const SUPPORTED_LESSON_TYPES: LessonType[] = ['video', 'article', 'quiz', 'assignment'];

const C = { primary: '#16a34a', primaryLight: '#dcfce7' };

/* ── styles ── */
const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860, margin: '0 auto', padding: '32px 20px' },
  backLink: { fontSize: 13, color: '#6b7280', cursor: 'pointer', marginBottom: 20, display: 'inline-block', background: 'none', border: 'none', padding: 0 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none' },
  textarea: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none', resize: 'vertical' as const, minHeight: 80 },
  select: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', background: '#fff', outline: 'none' },
  row: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const },
  archiveBtn: { padding: '8px 16px', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  lessonCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' },
  lessonOrder: { fontSize: 12, fontWeight: 700, color: '#6b7280', minWidth: 24, paddingTop: 3 },
  lessonBody: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 },
  lessonMeta: { fontSize: 12, color: '#9ca3af' },
  lessonActions: { display: 'flex', gap: 6 },
  editSmBtn: { padding: '4px 10px', background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' },
  delSmBtn: { padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' },
  addLessonBtn: { padding: '9px 18px', background: '#f3f4f6', color: '#374151', border: '1px dashed #d1d5db', borderRadius: 7, fontSize: 13, cursor: 'pointer', width: '100%' },
  emptyState: { textAlign: 'center' as const, padding: '48px 20px', color: '#6b7280' },
  modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' as const },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { padding: '8px 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 },
  tagContainer: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, minHeight: 40, alignItems: 'center' },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#dcfce7', color: '#15803d', borderRadius: 999, fontSize: 12, fontWeight: 500 },
  tagRemove: { cursor: 'pointer', fontSize: 13, color: '#16a34a' },
  tagInput: { border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 60, color: '#111827' },
  dragHandle: { cursor: 'grab', color: '#9ca3af', fontSize: 16, userSelect: 'none' as const, paddingRight: 4 },
  dragOver: { borderColor: C.primary, background: '#f0fdf4' },
  createdBanner: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 24, fontSize: 14, color: '#15803d' },
};

const saveBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '8px 18px', background: disabled ? '#86efac' : C.primary, color: '#fff',
  border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
});

const publishBtnStyle = (pub: boolean): React.CSSProperties => ({
  padding: '8px 18px', background: pub ? '#f59e0b' : C.primary, color: '#fff',
  border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

const statusBadgeStyle = (status: string): React.CSSProperties => ({
  display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
  color: '#fff',
  background: status === 'published' ? '#16a34a' : status === 'pending_review' ? '#3b82f6' : status === 'rejected' ? '#ef4444' : status === 'archived' ? '#f59e0b' : '#6b7280',
  marginLeft: 10,
});

const STATUS_LABEL: Record<string, string> = {
  draft: '초안', pending_review: '검토 중', published: '공개 중', rejected: '반려됨', archived: '종료됨',
};

/* ── LessonModal ── */
interface LessonModalProps {
  courseId: string;
  lesson: InstructorLesson | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (keepOpen?: boolean) => void;
}

function LessonModal({ courseId, lesson, nextOrder, onClose, onSaved }: LessonModalProps) {
  const isEdit = lesson !== null;
  const [form, setForm] = useState({
    title: lesson?.title || '',
    type: (lesson?.type || 'article') as LessonType,
    description: lesson?.description || '',
    videoUrl: lesson?.videoUrl || '',
    duration: lesson?.duration ?? 0,
  });
  const [content, setContent] = useState<string>(lesson?.content || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [savedLesson, setSavedLesson] = useState<InstructorLesson | null>(null);
  const activeLesson = lesson ?? savedLesson;
  const showEditor = isEdit || savedLesson !== null;
  const EDITOR_TYPES: LessonType[] = ['quiz', 'assignment'];

  const isYouTubeUrl = (url: string) => /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url);

  const toYouTubeEmbedUrl = (url: string): string | null => {
    const shortMatch = url.match(/youtu\.be\/([^?&#]+)/i);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const longMatch = url.match(/[?&]v=([^&#]+)/);
    if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
    return null;
  };

  const extractTitleFromHtml = (html: string): string => {
    const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    if (!match) return '';
    return match[1].replace(/<[^>]+>/g, '').trim();
  };

  const handleAiInsert = ({ html, title, sourceUrl }: { html: string; title: string; sourceUrl?: string }) => {
    const finalTitle = (title || '').trim() || extractTitleFromHtml(html);
    if (finalTitle && !form.title.trim()) setForm((f) => ({ ...f, title: finalTitle }));
    let finalContent = html;
    if (sourceUrl && isYouTubeUrl(sourceUrl)) {
      if (!form.videoUrl.trim()) setForm((f) => ({ ...f, videoUrl: sourceUrl }));
      if (!/<iframe[\s>]/i.test(html)) {
        const embed = toYouTubeEmbedUrl(sourceUrl);
        if (embed) finalContent = `<iframe src="${embed}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;"></iframe>\n${html}`;
      }
    }
    setContent(finalContent);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('제목을 입력하세요.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const htmlContent = content.trim() || null;
      if (isEdit && lesson) {
        await lmsApi.instructorUpdateLesson(lesson.id, {
          title: form.title.trim(),
          description: form.description || null,
          content: htmlContent,
          videoUrl: form.videoUrl || null,
          duration: form.duration,
        });
        onSaved();
      } else {
        const res = await lmsApi.instructorCreateLesson(courseId, {
          title: form.title.trim(),
          type: form.type,
          description: form.description || null,
          content: htmlContent,
          videoUrl: form.videoUrl || null,
          order: nextOrder,
          duration: form.duration,
        });
        const created: InstructorLesson = (res as any)?.data?.data?.lesson ?? (res as any)?.data?.lesson ?? (res as any)?.data;
        const needsEditor = EDITOR_TYPES.includes(form.type) && !!created?.id;
        if (needsEditor) {
          setSavedLesson(created);
          onSaved(true);
        } else {
          onSaved();
        }
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || '저장에 실패했습니다.');
      setSaving(false);
    }
  };

  return (
    <div style={s.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modalBox}>
        <div style={s.modalTitle}>{isEdit ? '레슨 수정' : savedLesson ? '레슨 생성 완료 — 세부 설정' : '새 레슨 추가'}</div>

        {savedLesson && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#15803d' }}>
            <span>✅</span>
            <span>레슨이 생성되었습니다. 이어서 <strong>{LESSON_TYPE_LABEL[form.type]}</strong> 설정을 입력하세요.</span>
          </div>
        )}

        {!savedLesson && (
          <>
            {/* AI 보조 */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginBottom: 2 }}>✨ AI 보조</div>
                <div style={{ fontSize: 12, color: '#16a34a' }}>유튜브 URL 또는 콘텐츠 URL로 제목/본문/영상 블록을 한 번에 생성합니다.</div>
              </div>
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                style={{ padding: '8px 16px', background: C.primary, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                AI로 초안 만들기
              </button>
            </div>

            <div style={s.field}>
              <label style={s.label}>제목 *</label>
              <input style={s.input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="레슨 제목" />
            </div>

            {!isEdit && (
              <div style={s.field}>
                <label style={s.label}>유형</label>
                <select style={s.select} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LessonType }))}>
                  {SUPPORTED_LESSON_TYPES.map((t) => (
                    <option key={t} value={t}>{LESSON_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={s.field}>
              <label style={s.label}>설명</label>
              <textarea style={s.textarea} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="레슨 설명 (선택)" />
            </div>

            {form.type === 'video' && (
              <div style={s.field}>
                <label style={s.label}>영상 URL</label>
                <input style={s.input} value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} placeholder="https://..." />
              </div>
            )}

            <div style={s.field}>
              <label style={s.label}>본문</label>
              <RichTextEditor
                value={content}
                onChange={(c) => setContent(c.html)}
                placeholder="레슨 본문을 입력하세요"
                minHeight="280px"
                preset="full"
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>예상 학습 시간 (분)</label>
              <input style={{ ...s.input, width: 100 }} type="number" min={0} value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))} />
            </div>

            {err && <p style={s.error}>{err}</p>}
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={onClose}>취소</button>
              <button
                style={saveBtnStyle(saving || !form.title.trim())}
                disabled={saving || !form.title.trim()}
                onClick={handleSave}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </>
        )}

        {/* quiz/assignment 타입 — 레슨 생성 후 안내 메시지 (전용 편집기는 별도 구현 예정) */}
        {showEditor && activeLesson && (form.type === 'quiz' || form.type === 'assignment') && (
          <div style={{ padding: '16px', background: '#fafafa', borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 8 }}>
            <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
              레슨이 생성되었습니다. 퀴즈/과제 세부 설정은 강의 편집 화면에서 계속 진행하세요.
            </p>
          </div>
        )}

        {savedLesson && (
          <div style={{ ...s.modalActions, marginTop: 24 }}>
            <button style={s.cancelBtn} onClick={onClose}>닫기</button>
          </div>
        )}
      </div>

      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        showCommunitySave={false}
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
        headerLabel="AI 레슨 초안 만들기"
        urlPlaceholder="https://www.youtube.com/watch?v=..."
        initialSourceTab="url"
      />
    </div>
  );
}

/* ── InstructorCourseEditPage ── */
export default function InstructorCourseEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams<{ courseId: string }>();
  const isNew = !courseId || courseId === 'new';

  const [course, setCourse] = useState<InstructorCourseDetail | null>(null);
  const [lessons, setLessons] = useState<InstructorLesson[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState<CourseVisibility>('members');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [reusablePolicy, setReusablePolicy] = useState<CourseReusablePolicy>('restricted');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [lessonModal, setLessonModal] = useState<{ open: boolean; lesson: InstructorLesson | null }>({ open: false, lesson: null });
  const [showCreatedBanner, setShowCreatedBanner] = useState(() => !!(location.state as any)?.justCreated);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // New course form
  const [newForm, setNewForm] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (isNew || !courseId) return;
    try {
      const [c, ls] = await Promise.all([
        lmsApi.instructorGetCourse(courseId),
        lmsApi.instructorGetLessons(courseId),
      ]);
      setCourse(c);
      setForm({ title: c.title, description: c.description || '' });
      setTags(c.tags || []);
      setVisibility(c.visibility ?? 'members');
      setRequiresApproval(c.requiresApproval ?? false);
      setReusablePolicy(c.reusablePolicy ?? 'restricted');
      setLessons([...ls].sort((a, b) => a.order - b.order));
    } catch (e: any) {
      setError('강의 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isNew, courseId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* New course creation */
  const handleCreateCourse = async () => {
    if (!newForm.title.trim()) { setCreateErr('제목을 입력하세요.'); return; }
    setCreating(true);
    setCreateErr(null);
    try {
      const created = await lmsApi.instructorCreateCourse({ title: newForm.title.trim(), description: newForm.description.trim() || undefined });
      navigate(`/instructor/courses/${created.id}`, { state: { justCreated: true }, replace: true });
    } catch (e: any) {
      setCreateErr(e?.response?.data?.error || '강의 생성에 실패했습니다.');
      setCreating(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseId || !form.title.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await lmsApi.instructorUpdateCourse(courseId, {
        title: form.title.trim(),
        description: form.description.trim(),
        tags: tags.length > 0 ? tags : [],
        visibility,
        reusablePolicy,
        requiresApproval,
      });
      setSaveMsg('저장되었습니다.');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!courseId || !course) return;
    try {
      await lmsApi.instructorSubmitForReview(courseId);
      await loadData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '승인 요청 실패');
    }
  };

  const handleArchive = async () => {
    if (!courseId || !course) return;
    if (!confirm('이 강의를 종료(보관) 처리하시겠습니까?')) return;
    try {
      await lmsApi.instructorArchiveCourse(courseId);
      await loadData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '처리 실패');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('이 레슨을 삭제하시겠습니까?')) return;
    try {
      await lmsApi.instructorDeleteLesson(lessonId);
      await loadData();
    } catch {
      alert('레슨 삭제에 실패했습니다.');
    }
  };

  const handleDragStart = (index: number) => { dragIndexRef.current = index; };
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDragLeave = () => { setDragOverIndex(null); };
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex || !courseId) return;
    dragIndexRef.current = null;
    const reordered = [...lessons];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setLessons(reordered);
    try {
      await lmsApi.instructorReorderLessons(courseId, reordered.map((l) => l.id));
      await loadData();
    } catch {
      await loadData();
      alert('순서 변경에 실패했습니다.');
    }
  };
  const handleDragEnd = () => { dragIndexRef.current = null; setDragOverIndex(null); };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t || t.length > 30 || tags.includes(t)) { setTagInput(''); return; }
    setTags((p) => [...p, t]);
    setTagInput('');
  };

  const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;

  /* ── NEW COURSE FORM ── */
  if (isNew) {
    return (
      <div style={s.page}>
        <button style={s.backLink} onClick={() => navigate('/instructor/courses')}>← 강의 목록</button>
        <div style={s.section}>
          <div style={s.sectionTitle}>새 강의 만들기</div>
          <div style={s.card}>
            <div style={s.field}>
              <label style={s.label}>제목 *</label>
              <input style={s.input} value={newForm.title} onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))} placeholder="강의 제목을 입력하세요" onKeyDown={(e) => e.key === 'Enter' && handleCreateCourse()} />
            </div>
            <div style={s.field}>
              <label style={s.label}>설명</label>
              <textarea style={s.textarea} value={newForm.description} onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))} placeholder="강의 설명 (선택)" />
            </div>
            {createErr && <p style={s.error}>{createErr}</p>}
            <div style={s.row}>
              <button
                style={saveBtnStyle(creating || !newForm.title.trim())}
                disabled={creating || !newForm.title.trim()}
                onClick={handleCreateCourse}
              >
                {creating ? '생성 중...' : '강의 생성'}
              </button>
              <button style={s.cancelBtn} onClick={() => navigate('/instructor/courses')}>취소</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>불러오는 중...</div>;
  if (error || !course) return <div style={{ padding: 40, color: '#ef4444' }}>{error || '강의를 찾을 수 없습니다.'}</div>;

  return (
    <div style={s.page}>
      <button style={s.backLink} onClick={() => navigate('/instructor/courses')}>← 강의 목록</button>

      {/* Course Info */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          강의 정보
          <span style={statusBadgeStyle(course.status)}>
            {STATUS_LABEL[course.status] ?? course.status}
          </span>
        </div>

        {course.status === 'rejected' && course.rejectionReason && (
          <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            <strong>반려 사유:</strong> {course.rejectionReason}
          </div>
        )}
        {course.status === 'pending_review' && (
          <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            운영자 검토 중입니다. 검토가 완료되면 알림이 표시됩니다.
          </div>
        )}
        {course.status === 'published' && (
          <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
            <strong>공개 중인 강의입니다.</strong> 강의 정보를 수정하면 재검토 대기 상태로 전환됩니다.
          </div>
        )}

        <div style={s.card}>
          <div style={s.field}>
            <label style={s.label}>제목</label>
            <input style={s.input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>설명</label>
            <textarea style={s.textarea} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>공개 범위</label>
            <div style={{ display: 'flex', gap: 16 }}>
              {(['members', 'public'] as CourseVisibility[]).map((v) => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                  <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} />
                  {v === 'members' ? '회원제 강의' : '공개 강의'}
                </label>
              ))}
            </div>
          </div>
          {visibility === 'members' && (
            <div style={s.field}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} style={{ marginTop: 2 }} />
                <span>
                  <span style={{ ...s.label, display: 'block' }}>강사 승인 필요</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>수강 신청 후 강사가 직접 승인해야 수강이 가능합니다.</span>
                </span>
              </label>
            </div>
          )}
          <div style={s.field}>
            <label style={s.label}>매장 자료함 활용 허용</label>
            <div style={{ display: 'flex', gap: 16 }}>
              {(['restricted', 'platform'] as CourseReusablePolicy[]).map((v) => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                  <input type="radio" name="reusablePolicy" value={v} checked={reusablePolicy === v} onChange={() => setReusablePolicy(v)} />
                  {v === 'restricted' ? '차단(기본)' : '모든 매장 허용'}
                </label>
              ))}
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>태그</label>
            <div style={s.tagContainer}>
              {tags.map((tag) => (
                <span key={tag} style={s.tag}>
                  {tag}
                  <span style={s.tagRemove} onClick={() => setTags((p) => p.filter((t) => t !== tag))}>×</span>
                </span>
              ))}
              <input
                style={s.tagInput}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="태그 입력 후 Enter"
              />
            </div>
          </div>
          <div style={s.row}>
            <button style={saveBtnStyle(saving || !form.title.trim())} disabled={saving || !form.title.trim()} onClick={handleSaveCourse}>
              {saving ? '저장 중...' : '저장'}
            </button>
            {(course.status === 'draft' || course.status === 'rejected') && (
              <button style={publishBtnStyle(false)} onClick={handleSubmitForReview}>
                {course.status === 'rejected' ? '수정 후 재요청' : '승인 요청'}
              </button>
            )}
            {course.status === 'pending_review' && (
              <button style={{ ...publishBtnStyle(true), opacity: 0.6, cursor: 'not-allowed' }} disabled>검토 중</button>
            )}
            {course.status !== 'archived' && (
              <button style={s.archiveBtn} onClick={handleArchive}>강의 종료</button>
            )}
            {saveMsg && (
              <span style={{ fontSize: 13, color: saveMsg === '저장되었습니다.' ? '#16a34a' : '#ef4444' }}>{saveMsg}</span>
            )}
          </div>
        </div>
      </div>

      {/* Created Banner */}
      {showCreatedBanner && (
        <div style={s.createdBanner}>
          <span>강의가 생성되었습니다. 이제 레슨을 추가하여 강의를 구성하세요.</span>
          <button
            style={{ marginLeft: 'auto', padding: '6px 14px', background: C.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => { setShowCreatedBanner(false); setLessonModal({ open: true, lesson: null }); }}
          >
            + 레슨 추가
          </button>
        </div>
      )}

      {/* Lessons */}
      <div style={s.section}>
        <div style={{ ...s.sectionTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>레슨 목록 ({lessons.length})</span>
        </div>

        {lessons.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>아직 강의 내용이 없습니다</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>첫 번째 레슨을 추가하여 강의를 구성하세요</p>
            <button style={s.addLessonBtn} onClick={() => setLessonModal({ open: true, lesson: null })}>+ 레슨 추가</button>
          </div>
        ) : (
          <>
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                style={{ ...s.lessonCard, ...(dragOverIndex === index ? s.dragOver : {}) }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span style={s.dragHandle} title="드래그하여 순서 변경">⠿</span>
                <div style={s.lessonOrder}>{index + 1}</div>
                <div style={s.lessonBody}>
                  <div style={s.lessonTitle}>{lesson.title}</div>
                  <div style={s.lessonMeta}>
                    {LESSON_TYPE_LABEL[lesson.type] || lesson.type} · {lesson.duration > 0 ? `${lesson.duration}분` : '시간 미설정'}
                  </div>
                </div>
                <div style={s.lessonActions}>
                  <button style={s.editSmBtn} onClick={() => setLessonModal({ open: true, lesson })}>편집</button>
                  <button style={s.delSmBtn} onClick={() => handleDeleteLesson(lesson.id)}>삭제</button>
                </div>
              </div>
            ))}
            <button style={s.addLessonBtn} onClick={() => setLessonModal({ open: true, lesson: null })}>+ 새 레슨 추가</button>
          </>
        )}
      </div>

      {lessonModal.open && courseId && (
        <LessonModal
          courseId={courseId}
          lesson={lessonModal.lesson}
          nextOrder={nextOrder}
          onClose={() => setLessonModal({ open: false, lesson: null })}
          onSaved={(keepOpen) => { if (!keepOpen) setLessonModal({ open: false, lesson: null }); loadData(); }}
        />
      )}
    </div>
  );
}
