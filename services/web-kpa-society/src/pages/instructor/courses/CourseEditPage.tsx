/**
 * CourseEditPage — /instructor/courses/:id
 * WO-O4O-LMS-FOUNDATION-V1
 *
 * Course detail/edit + Lesson management (create/edit/delete)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import { lmsInstructorApi, Course, Lesson, LessonType, type CourseVisibility } from '../../../api/lms-instructor';
import QuizBuilder from './QuizBuilder';
import AssignmentEditor from './AssignmentEditor';
import LiveEditor from './LiveEditor';
// WO-O4O-LMS-COURSE-STRUCTURE-AI-V2
import CourseStructureAiModal, { type GeneratedLesson } from './CourseStructureAiModal';

// WO-O4O-LMS-UX-REFINEMENT-V1: instructor 라벨 통일 ("동영상")
const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  video: '동영상', article: '문서', quiz: '퀴즈', assignment: '과제', live: '라이브',
};

const SUPPORTED_LESSON_TYPES: LessonType[] = ['video', 'article', 'quiz', 'assignment', 'live'];

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
  emptyState: { textAlign: 'center' as const, padding: '48px 20px', color: '#6b7280' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  createdBanner: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 24, fontSize: 14, color: '#15803d' },
  createdBannerBtn: { marginLeft: 'auto', padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  publishSmBtn: { padding: '4px 10px', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' },
  dragHandle: { cursor: 'grab', color: '#9ca3af', fontSize: 16, userSelect: 'none' as const, paddingRight: 4 },
  dragOver: { borderColor: '#4f46e5', background: '#f5f3ff' },
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
  background:
    status === 'published' ? '#10b981'
    : status === 'pending_review' ? '#3b82f6'
    : status === 'rejected' ? '#ef4444'
    : status === 'archived' ? '#f59e0b'
    : '#6b7280',
  marginLeft: 10,
});

// WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_review: '검토 중',
  published: '공개 중',
  rejected: '반려됨',
  archived: '종료됨',
};

/* ──────────────── LessonModal ──────────────── */
interface LessonModalProps {
  courseId: string;
  lesson: Lesson | null; // null = new
  nextOrder: number;
  onClose: () => void;
  /** keepOpen=true: 리스트 reload만 하고 modal은 닫지 않음 (quiz/assignment/live 신규 생성 후 editor 유지) */
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
  // WO-KPA-LMS-REMOVE-LEGACY-CONTENT-FORMAT-V1: content는 HTML string 단일 포맷
  const [content, setContent] = useState<string>(lesson?.content || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // WO-O4O-LMS-LESSON-AI-ASSIST-V1: AI로 레슨 초안 만들기
  const [aiOpen, setAiOpen] = useState(false);
  // WO-KPA-LMS-LESSON-EDITOR-UX-FLOW-V1:
  // 신규 생성 후 quiz/assignment/live editor를 즉시 표시하기 위해
  // createLesson API가 반환한 lesson을 보관한다.
  const [savedLesson, setSavedLesson] = useState<Lesson | null>(null);

  // 현재 편집 대상 lesson — 기존 편집이면 lesson, 신규 생성 직후면 savedLesson
  const activeLesson = lesson ?? savedLesson;
  // editor를 표시할 조건 — isEdit 또는 신규 생성 완료(savedLesson 존재)
  const showEditor = isEdit || savedLesson !== null;

  // quiz/assignment/live 타입은 전용 editor 마운트가 필요하므로 저장 후 modal을 닫지 않는다
  const EDITOR_TYPES: LessonType[] = ['quiz', 'assignment', 'live'];

  // ── WO-O4O-LMS-LESSON-AI-ASSIST-V1: AI 레슨 초안 핸들러 ──────────────────
  const isYouTubeUrl = (url: string) => /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url);

  const toYouTubeEmbedUrl = (url: string): string | null => {
    // youtu.be/<id>
    const shortMatch = url.match(/youtu\.be\/([^?&#]+)/i);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    // youtube.com/watch?v=<id>
    const longMatch = url.match(/[?&]v=([^&#]+)/);
    if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
    return null;
  };

  /** HTML 첫 번째 heading 텍스트 추출 (h1~h3) */
  const extractTitleFromHtml = (html: string): string => {
    const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    if (!match) return '';
    // 태그 제거 후 텍스트만
    return match[1].replace(/<[^>]+>/g, '').trim();
  };

  const handleAiInsert = ({ html, title, sourceUrl }: { html: string; title: string; sourceUrl?: string }) => {
    // 1. 제목 자동 채움 — AI title 우선, fallback 첫 heading. 사용자가 이미 입력한 제목은 보호.
    const finalTitle = (title || '').trim() || extractTitleFromHtml(html);
    if (finalTitle && !form.title.trim()) {
      setForm((f) => ({ ...f, title: finalTitle }));
    }

    // 2. YouTube source URL 처리 — 영상 블록 자동 추가 + videoUrl 세팅
    let finalContent = html;
    if (sourceUrl && isYouTubeUrl(sourceUrl)) {
      // videoUrl 자동 채움 (사용자가 입력하지 않았을 때만)
      if (!form.videoUrl.trim()) {
        setForm((f) => ({ ...f, videoUrl: sourceUrl }));
      }
      // HTML 에 iframe 이 없으면 본문 상단에 embed 추가
      if (!/<iframe[\s>]/i.test(html)) {
        const embed = toYouTubeEmbedUrl(sourceUrl);
        if (embed) {
          finalContent = `<iframe src="${embed}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;"></iframe>\n${html}`;
        }
      }
    }

    // 3. 본문 — RichTextEditor 가 value prop 변경을 useEffect 로 sync. 사용자가 추가 수정 가능.
    setContent(finalContent);
  };
  // ── END WO-O4O-LMS-LESSON-AI-ASSIST-V1 ────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('제목을 입력하세요.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const htmlContent = content.trim() || null;
      if (isEdit && lesson) {
        await lmsInstructorApi.updateLesson(lesson.id, {
          title: form.title.trim(),
          description: form.description || null,
          content: htmlContent,
          videoUrl: form.videoUrl || null,
          duration: form.duration,
        });
        onSaved();
      } else {
        const res = await lmsInstructorApi.createLesson(courseId, {
          title: form.title.trim(),
          type: form.type,
          description: form.description || null,
          content: htmlContent,
          videoUrl: form.videoUrl || null,
          order: nextOrder,
          duration: form.duration,
        });
        // 백엔드 응답: { success, data: { lesson } }
        const created: Lesson = (res as any).data?.data?.lesson ?? (res as any).data?.lesson ?? (res as any).data;
        const needsEditor = EDITOR_TYPES.includes(form.type) && !!created?.id;
        if (needsEditor) {
          // quiz/assignment/live: modal을 유지하고 전용 editor를 즉시 표시
          setSavedLesson(created);
          onSaved(true); // 리스트 reload만, modal은 닫지 않음
        } else {
          onSaved(); // article/video: modal 닫기 + 리스트 reload (기존 흐름 유지)
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

        {/* WO-KPA-LMS-LESSON-EDITOR-UX-FLOW-V1: 신규 생성 직후 전용 editor 안내 배너 */}
        {savedLesson && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#15803d' }}>
            <span>✅</span>
            <span>
              레슨이 생성되었습니다. 이어서{' '}
              <strong>{LESSON_TYPE_LABEL[form.type]}</strong> 설정을 입력하세요.
            </span>
          </div>
        )}

        {/* 기본 필드: 신규 생성 중(savedLesson 없음)이거나 기존 편집일 때만 표시 */}
        {!savedLesson && (
          <>
            {/* WO-O4O-LMS-LESSON-AI-ASSIST-V1: AI로 레슨 초안 만들기 — 제목/본문/유튜브 자동 채움 */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', marginBottom: 2 }}>✨ AI 보조</div>
                <div style={{ fontSize: 12, color: '#6366f1' }}>
                  유튜브 URL 또는 콘텐츠 URL로 제목 / 본문 / 영상 블록을 한 번에 생성합니다.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                style={{
                  padding: '8px 16px',
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                AI로 레슨 초안 만들기
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
              {/* WO-KPA-LMS-LESSON-EDITOR-UPGRADE-V1: 강사용 풀 에디터 (이미지/링크/리스트/표 등) */}
              <RichTextEditor
                value={content}
                onChange={(c) => setContent(c.html)}
                placeholder="레슨 본문을 입력하세요"
                minHeight="320px"
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

        {/* 퀴즈 빌더 — quiz 유형 레슨 편집 시 또는 신규 생성 직후 표시 */}
        {showEditor && activeLesson && form.type === 'quiz' && (
          <QuizBuilder
            lessonId={activeLesson.id}
            courseId={courseId}
            lessonTitle={form.title || activeLesson.title}
          />
        )}

        {/* WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1: 과제 에디터 */}
        {showEditor && activeLesson && form.type === 'assignment' && (
          <AssignmentEditor lessonId={activeLesson.id} />
        )}

        {/* WO-O4O-LMS-LIVE-MINIMAL-V1: 라이브 에디터 */}
        {showEditor && activeLesson && form.type === 'live' && (
          <LiveEditor lessonId={activeLesson.id} />
        )}

        {/* 신규 생성 후 editor 표시 중일 때 닫기 버튼 */}
        {savedLesson && (
          <div style={{ ...s.modalActions, marginTop: 24 }}>
            <button style={s.cancelBtn} onClick={onClose}>닫기</button>
          </div>
        )}
      </div>

      {/* WO-O4O-LMS-LESSON-AI-ASSIST-V1: AI 레슨 초안 모달 — editor=null + onInsert 로 form state 직접 갱신 */}
      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
      />
    </div>
  );
}

/* ──────────────── CourseEditPage ──────────────── */
export default function CourseEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // course form state
  const [form, setForm] = useState({ title: '', description: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 공개/회원제. 기본값 회원제.
  const [visibility, setVisibility] = useState<CourseVisibility>('members');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // lesson modal
  const [lessonModal, setLessonModal] = useState<{ open: boolean; lesson: Lesson | null }>({ open: false, lesson: null });

  // WO-O4O-LMS-COURSE-STRUCTURE-AI-V2: 강의 구조 AI 모달
  const [structureModalOpen, setStructureModalOpen] = useState(false);

  // WO-KPA-LMS-UX-QUICK-WINS-V1: 생성 안내 배너
  const [showCreatedBanner, setShowCreatedBanner] = useState(() => !!(location.state as any)?.justCreated);

  // WO-KPA-LMS-UX-QUICK-WINS-V1: 드래그 정렬
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
      setForm({ title: c.title, description: c.description });
      setTags(c.tags || []);
      // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 응답에 visibility가 없으면 기본 'members'
      setVisibility(c.visibility ?? 'members');
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
        tags: tags.length > 0 ? tags : [],
        visibility, // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1
      });
      setSaveMsg('저장되었습니다.');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  // WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
  // 강사는 직접 publish 불가. submitForReview로 운영자 승인 요청.
  // PUBLISHED 상태에서 비공개 전환은 운영자 권한이므로 강사 측 버튼에서 제거됨.
  const handleSubmitForReview = async () => {
    if (!id || !course) return;
    try {
      await lmsInstructorApi.submitForReview(id);
      await loadData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '승인 요청 실패');
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

  // WO-O4O-LMS-COURSE-STRUCTURE-AI-V2: 선택된 AI 생성 레슨을 일괄 생성
  // - 자동 생성된 레슨은 article 타입으로 추가 (사용자가 이후 type 변경/본문 보강 가능)
  // - description = AI summary
  // - order 는 기존 마지막 + 1 부터 순차적으로
  const handleAddCourseStructureLessons = async (selected: GeneratedLesson[]) => {
    if (!id) throw new Error('courseId 가 없습니다.');
    let baseOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;
    for (const item of selected) {
      await lmsInstructorApi.createLesson(id, {
        title: item.title,
        type: 'article',
        description: item.summary || null,
        content: null,
        videoUrl: null,
        order: baseOrder,
        duration: 0,
      });
      baseOrder += 1;
    }
    await loadData();
  };

  // WO-KPA-LMS-UX-QUICK-WINS-V1: 레슨 발행 토글
  const handleTogglePublish = async (lesson: Lesson) => {
    try {
      await lmsInstructorApi.updateLesson(lesson.id, { isPublished: !lesson.isPublished });
      await loadData();
    } catch {
      alert('발행 상태 변경에 실패했습니다.');
    }
  };

  // WO-KPA-LMS-UX-QUICK-WINS-V1: 드래그 정렬
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex || !id) return;
    dragIndexRef.current = null;

    // 로컬 재정렬 (즉시 UI 반영)
    const reordered = [...lessons];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setLessons(reordered);

    // API 호출
    try {
      await lmsInstructorApi.reorderLessons(id, reordered.map(l => l.id));
      await loadData();
    } catch {
      // 실패 시 원래 순서로 롤백
      await loadData();
      alert('순서 변경에 실패했습니다.');
    }
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
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
            {STATUS_LABEL[course.status] ?? course.status}
          </span>
        </div>
        {/* WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: 반려 사유 표시 */}
        {course.status === 'rejected' && course.rejectionReason && (
          <div style={{
            padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca',
            color: '#991b1b', borderRadius: 8, fontSize: 13, lineHeight: 1.5, marginBottom: 12,
          }}>
            <strong>반려 사유:</strong> {course.rejectionReason}
            <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 6 }}>
              내용을 수정한 뒤 "수정 후 재요청"을 눌러주세요.
            </div>
          </div>
        )}
        {/* WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: 검토 중 안내 */}
        {course.status === 'pending_review' && (
          <div style={{
            padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe',
            color: '#1e40af', borderRadius: 8, fontSize: 13, marginBottom: 12,
          }}>
            운영자 검토 중입니다. 검토가 완료되면 알림이 표시됩니다.
          </div>
        )}
        {/* WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1: PUBLISHED 상태에서 수정 시 재검토 안내 */}
        {course.status === 'published' && (
          <div style={{
            padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a',
            color: '#92400e', borderRadius: 8, fontSize: 13, marginBottom: 12, lineHeight: 1.5,
          }}>
            <strong>공개 중인 강의입니다.</strong> 강의 정보, 레슨, 퀴즈/과제/라이브 등을 수정하면
            자동으로 <strong>재검토 대기 상태</strong>로 전환되어 사용자 노출이 일시 중단됩니다.
            운영자 재승인 후 다시 공개됩니다.
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
          {/* WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 공개 범위 */}
          <div style={s.field}>
            <label style={s.label}>공개 범위</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="visibility"
                  value="members"
                  checked={visibility === 'members'}
                  onChange={() => setVisibility('members')}
                />
                회원제 강의
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                />
                공개 강의
              </label>
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
            {/* WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: 상태별 액션 버튼 */}
            {(course.status === 'draft' || course.status === 'rejected') && (
              <button style={publishBtnStyle(false)} onClick={handleSubmitForReview}>
                {course.status === 'rejected' ? '수정 후 재요청' : '승인 요청'}
              </button>
            )}
            {course.status === 'pending_review' && (
              <button
                style={{ ...publishBtnStyle(true), opacity: 0.6, cursor: 'not-allowed' }}
                disabled
              >
                검토 중
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

      {/* WO-KPA-LMS-UX-QUICK-WINS-V1: 생성 안내 배너 */}
      {showCreatedBanner && (
        <div style={s.createdBanner}>
          <span>강의가 생성되었습니다. 이제 레슨을 추가하여 강의를 구성하세요.</span>
          <button
            style={s.createdBannerBtn}
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
          {/* WO-O4O-LMS-COURSE-STRUCTURE-AI-V2: 강의 구조 AI 생성 진입 */}
          <button
            type="button"
            onClick={() => setStructureModalOpen(true)}
            style={{
              padding: '6px 14px',
              background: '#eef2ff',
              color: '#4338ca',
              border: '1px solid #c7d2fe',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="유튜브 / 블로그 URL 또는 주제로 강의 레슨 구조를 자동 생성"
          >
            🧱 AI로 강의 구조 만들기
          </button>
        </div>

        {lessons.length === 0 ? (
          /* WO-KPA-LMS-UX-QUICK-WINS-V1: Empty 상태 */
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📝</div>
            <div style={s.emptyTitle}>아직 강의 내용이 없습니다</div>
            <div style={s.emptyDesc}>첫 번째 레슨을 추가하여 강의를 구성하세요</div>
            <button style={s.addLessonBtn} onClick={() => setLessonModal({ open: true, lesson: null })}>
              + 레슨 추가
            </button>
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
                    {!lesson.isPublished && <span style={{ marginLeft: 6, color: '#f59e0b' }}>미발행</span>}
                  </div>
                </div>
                <div style={s.lessonActions}>
                  <button
                    style={{ ...s.publishSmBtn, background: lesson.isPublished ? '#fef3c7' : '#d1fae5', color: lesson.isPublished ? '#92400e' : '#065f46' }}
                    onClick={() => handleTogglePublish(lesson)}
                  >
                    {lesson.isPublished ? '비공개' : '발행'}
                  </button>
                  <button style={s.editSmBtn} onClick={() => setLessonModal({ open: true, lesson })}>편집</button>
                  <button style={s.delSmBtn} onClick={() => handleDeleteLesson(lesson.id)}>삭제</button>
                </div>
              </div>
            ))}

            <button style={s.addLessonBtn} onClick={() => setLessonModal({ open: true, lesson: null })}>
              + 새 레슨 추가
            </button>
          </>
        )}
      </div>

      {lessonModal.open && (
        <LessonModal
          courseId={course.id}
          lesson={lessonModal.lesson}
          nextOrder={nextOrder}
          onClose={() => setLessonModal({ open: false, lesson: null })}
          onSaved={(keepOpen) => { if (!keepOpen) setLessonModal({ open: false, lesson: null }); loadData(); }}
        />
      )}

      {/* WO-O4O-LMS-COURSE-STRUCTURE-AI-V2: 강의 구조 AI 모달 */}
      <CourseStructureAiModal
        open={structureModalOpen}
        onClose={() => setStructureModalOpen(false)}
        onConfirm={handleAddCourseStructureLessons}
      />
    </div>
  );
}
