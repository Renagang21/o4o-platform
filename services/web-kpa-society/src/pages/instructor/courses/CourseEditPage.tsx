/**
 * CourseEditPage — /instructor/courses/:id
 * WO-O4O-LMS-FOUNDATION-V1
 *
 * Course detail/edit + Lesson management (create/edit/delete)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lmsInstructorApi, Course, Lesson, LessonType } from '../../../api/lms-instructor';

const LEVEL_LABEL: Record<string, string> = { beginner: '입문', intermediate: '중급', advanced: '고급' };
const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  VIDEO: '영상', ARTICLE: '문서', QUIZ: '퀴즈', ASSIGNMENT: '과제', LIVE: '라이브',
};

/* ──────────────── styles ──────────────── */
// 함수형 style은 별도 함수로 분리. (Record<string, CSSProperties>에 함수 값을 넣으면
// 객체 키가 함수로 잘못 좁혀져 TS2560/TS2349 발생)
const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860, margin: '0 auto', padding: '32px 20px' },
  backLink: { fontSize: 13, color: '#6b7280', cursor: 'pointer', marginBottom: 20, display: 'inline-block' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none' },
  textarea: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 80 },
  select: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', background: '#fff', outline: 'none' },
  row: { display: 'flex', gap: 12, alignItems: 'center' },
  deleteBtn: { padding: '8px 16px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' },
  archiveBtn: { padding: '8px 16px', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  lessonCard: {
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '12px 16px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start',
  },
  lessonOrder: { fontSize: 12, fontWeight: 700, color: '#6b7280', minWidth: 24, paddingTop: 3 },
  lessonBody: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 },
  lessonMeta: { fontSize: 12, color: '#9ca3af' },
  lessonActions: { display: 'flex', gap: 6 },
  editSmBtn: { padding: '4px 10px', background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' },
  delSmBtn: { padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' },
  addLessonBtn: { padding: '9px 18px', background: '#f3f4f6', color: '#374151', border: '1px dashed #d1d5db', borderRadius: 7, fontSize: 13, cursor: 'pointer', width: '100%' },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalBox: { background: '#fff', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { padding: '8px 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 },
  tagContainer: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, minHeight: 40, alignItems: 'center' },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#ede9fe', color: '#5b21b6', borderRadius: 999, fontSize: 12, fontWeight: 500 },
  tagRemove: { cursor: 'pointer', fontSize: 13, color: '#7c3aed' },
  tagInput: { border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 60, color: '#111827' },
};

const saveBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '8px 18px', background: disabled ? '#c4b5fd' : '#4f46e5', color: '#fff',
  border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
});

const publishBtnStyle = (pub: boolean): React.CSSProperties => ({
  padding: '8px 18px', background: pub ? '#f59e0b' : '#10b981', color: '#fff',
  border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

const statusBadgeStyle = (status: string): React.CSSProperties => ({
  display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
  color: '#fff',
  background: status === 'published' ? '#10b981' : status === 'archived' ? '#f59e0b' : '#6b7280',
  marginLeft: 10,
});

/* ──────────────── LessonModal ──────────────── */
interface LessonModalProps {
  courseId: string;
  lesson: Lesson | null; // null = new
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

function LessonModal({ courseId, lesson, nextOrder, onClose, onSaved }: LessonModalProps) {
  const isEdit = lesson !== null;
  const [form, setForm] = useState({
    title: lesson?.title || '',
    type: (lesson?.type || 'ARTICLE') as LessonType,
    description: lesson?.description || '',
    videoUrl: lesson?.videoUrl || '',
    duration: lesson?.duration ?? 0,
  });
  const [content, setContent] = useState<string>(
    lesson?.content ? JSON.stringify(lesson.content) : '',
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('제목을 입력하세요.'); return; }
    setSaving(true);
    setErr(null);
    try {
      let parsedContent: Record<string, any> | null = null;
      if (content.trim()) {
        try { parsedContent = JSON.parse(content); } catch { parsedContent = { text: content }; }
      }
      if (isEdit && lesson) {
        await lmsInstructorApi.updateLesson(lesson.id, {
          title: form.title.trim(),
          description: form.description || null,
          content: parsedContent,
          videoUrl: form.videoUrl || null,
          duration: form.duration,
        });
      } else {
        await lmsInstructorApi.createLesson(courseId, {
          title: form.title.trim(),
          type: form.type,
          description: form.description || null,
          content: parsedContent,
          videoUrl: form.videoUrl || null,
          order: nextOrder,
          duration: form.duration,
        });
      }
      onSaved();
    } catch (e: any) {
      setErr(e?.response?.data?.error || '저장에 실패했습니다.');
      setSaving(false);
    }
  };

  return (
    <div style={s.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modalBox}>
        <div style={s.modalTitle}>{isEdit ? '레슨 수정' : '새 레슨 추가'}</div>

        <div style={s.field}>
          <label style={s.label}>제목 *</label>
          <input style={s.input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="레슨 제목" />
        </div>

        {!isEdit && (
          <div style={s.field}>
            <label style={s.label}>유형</label>
            <select style={s.select} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LessonType }))}>
              {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((t) => (
                <option key={t} value={t}>{LESSON_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
        )}

        <div style={s.field}>
          <label style={s.label}>설명</label>
          <textarea style={s.textarea} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="레슨 설명 (선택)" />
        </div>

        {(form.type === 'VIDEO' || (isEdit && lesson?.videoUrl !== undefined)) && (
          <div style={s.field}>
            <label style={s.label}>영상 URL</label>
            <input style={s.input} value={form.videoUrl} onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))} placeholder="https://..." />
          </div>
        )}

        <div style={s.field}>
          <label style={s.label}>본문 (JSON 또는 텍스트)</label>
          <textarea
            style={{ ...s.textarea, minHeight: 120, fontFamily: 'monospace', fontSize: 12 }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'{ "blocks": [...] }  또는 일반 텍스트'}
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
          <button style={saveBtnStyle(saving || !form.title.trim())} disabled={saving || !form.title.trim()} onClick={handleSave}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── CourseEditPage ──────────────── */
export default function CourseEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // course form state
  const [form, setForm] = useState({ title: '', description: '', level: 'beginner' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // lesson modal
  const [lessonModal, setLessonModal] = useState<{ open: boolean; lesson: Lesson | null }>({ open: false, lesson: null });

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [cRes, lRes] = await Promise.all([
        lmsInstructorApi.getCourse(id),
        lmsInstructorApi.getLessons(id),
      ]);
      // GET /lms/courses/:id → { success, data: { course: Course } }
      const c: Course = (cRes as any).data?.data?.course;
      // GET /lms/courses/:id/lessons → { success, data: Lesson[], pagination }
      const ls: Lesson[] = Array.isArray((lRes as any).data?.data) ? (lRes as any).data?.data : [];
      setCourse(c);
      setForm({ title: c.title, description: c.description, level: c.level });
      setTags(c.tags || []);
      setLessons(ls.sort((a, b) => a.order - b.order));
    } catch (err: any) {
      if (err?.response?.data?.code === 'INSTRUCTOR_REQUIRED') {
        navigate('/instructor');
      } else {
        setError('강의 정보를 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveCourse = async () => {
    if (!id || !form.title.trim()) return;
    if (tags.length === 0) { setSaveMsg('태그를 1개 이상 입력해주세요'); return; }
    setSaving(true);
    setSaveMsg(null);
    try {
      await lmsInstructorApi.updateCourse(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        level: form.level as any,
        tags: tags.length > 0 ? tags : [],
      });
      setSaveMsg('저장되었습니다.');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id || !course) return;
    try {
      if (course.status === 'published') {
        await lmsInstructorApi.unpublishCourse(id);
      } else {
        await lmsInstructorApi.publishCourse(id);
      }
      await loadData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '처리 실패');
    }
  };

  const handleArchive = async () => {
    if (!id || !course) return;
    if (!confirm('이 강의를 종료(보관) 처리하시겠습니까?\n종료된 강의는 사용자 목록에서 보이지 않습니다.')) return;
    try {
      await lmsInstructorApi.archiveCourse(id);
      await loadData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '처리 실패');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('이 레슨을 삭제하시겠습니까?')) return;
    try {
      await lmsInstructorApi.deleteLesson(lessonId);
      await loadData();
    } catch {
      alert('레슨 삭제에 실패했습니다.');
    }
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (!t || t.length > 30 || tags.includes(t)) { setTagInput(''); return; }
    setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>불러오는 중...</div>;
  if (error || !course) return <div style={{ padding: 40, color: '#ef4444' }}>{error || '강의를 찾을 수 없습니다.'}</div>;

  const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;

  return (
    <div style={s.page}>
      <span style={s.backLink} onClick={() => navigate('/instructor/courses')}>← 강의 목록</span>

      {/* Course Info Edit */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          강의 정보
          <span style={statusBadgeStyle(course.status)}>
            {course.status === 'published' ? '공개 중' : course.status === 'archived' ? '종료됨' : '초안'}
          </span>
        </div>
        <div style={s.card}>
          <div style={s.field}>
            <label style={s.label}>제목</label>
            <input style={s.input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>설명</label>
            <textarea style={s.textarea} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ ...s.field, flex: 1 }}>
              <label style={s.label}>난이도</label>
              <select style={s.select} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
                {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>태그</label>
            <div style={s.tagContainer}>
              {tags.map((tag) => (
                <span key={tag} style={s.tag}>
                  {tag}
                  <span style={s.tagRemove} onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>×</span>
                </span>
              ))}
              <input
                style={s.tagInput} type="text" value={tagInput}
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
            {course.status !== 'archived' && (
              <button style={publishBtnStyle(course.status === 'published')} onClick={handlePublish}>
                {course.status === 'published' ? '비공개 전환' : '발행하기'}
              </button>
            )}
            {course.status !== 'archived' && (
              <button style={s.archiveBtn} onClick={handleArchive}>
                강의 종료
              </button>
            )}
            {saveMsg && <span style={{ fontSize: 13, color: saveMsg === '저장되었습니다.' ? '#10b981' : '#ef4444' }}>{saveMsg}</span>}
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div style={s.section}>
        <div style={s.sectionTitle}>레슨 목록 ({lessons.length})</div>

        {lessons.map((lesson) => (
          <div key={lesson.id} style={s.lessonCard}>
            <div style={s.lessonOrder}>{lesson.order}</div>
            <div style={s.lessonBody}>
              <div style={s.lessonTitle}>{lesson.title}</div>
              <div style={s.lessonMeta}>
                {LESSON_TYPE_LABEL[lesson.type]} · {lesson.duration > 0 ? `${lesson.duration}분` : '시간 미설정'}
                {!lesson.isPublished && <span style={{ marginLeft: 6, color: '#f59e0b' }}>미발행</span>}
              </div>
            </div>
            <div style={s.lessonActions}>
              <button style={s.editSmBtn} onClick={() => setLessonModal({ open: true, lesson })}>편집</button>
              <button style={s.delSmBtn} onClick={() => handleDeleteLesson(lesson.id)}>삭제</button>
            </div>
          </div>
        ))}

        <button style={s.addLessonBtn} onClick={() => setLessonModal({ open: true, lesson: null })}>
          + 새 레슨 추가
        </button>
      </div>

      {lessonModal.open && (
        <LessonModal
          courseId={course.id}
          lesson={lessonModal.lesson}
          nextOrder={nextOrder}
          onClose={() => setLessonModal({ open: false, lesson: null })}
          onSaved={() => { setLessonModal({ open: false, lesson: null }); loadData(); }}
        />
      )}
    </div>
  );
}
