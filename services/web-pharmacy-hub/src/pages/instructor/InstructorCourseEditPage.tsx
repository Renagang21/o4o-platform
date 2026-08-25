/**
 * InstructorCourseEditPage — 강의 생성/편집 + 레슨 관리
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#42)
 * 경로: /instructor/courses/new (신규) | /instructor/courses/:courseId (편집)
 *
 * 기본정보 form 은 공통 `InstructorCourseFormShell`, 레슨 목록·순서는 공통
 * `InstructorLessonListManager`(@o4o/operator-core-ui) 가 소유한다. 이 파일은 API 주입과
 * 레슨 편집 modal 만 담당한다 — 공통 모듈에 서비스 분기를 넣지 않는다.
 *
 * 강의 serviceKey 는 backend 가 작성자 membership 에서 파생하므로
 * (WO-O4O-LMS-COURSE-SERVICEKEY-V1) 프런트가 주입하지 않는다. 발행(publish)은 강사 권한이
 * 아니며 운영자 검수를 거친다(WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1) —
 * 여기에 직접 발행 CTA 를 만들지 않는다(불가능한 상태 전이 노출 금지).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import { findEditingPreset } from '@o4o/types';
import {
  InstructorCourseFormShell,
  type InstructorCourseFormValues,
  InstructorLessonListManager,
  type InstructorLessonListItem,
  type InstructorLessonListHandle,
} from '@o4o/operator-core-ui';
import { getAccessToken } from '@o4o/auth-client';
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#39·#40)
//   퀴즈·과제 세부 편집기. 공통 `/lms/{quizzes,assignments}` 계약을 그대로 쓴다.
import InstructorQuizBuilder from './InstructorQuizBuilder';
import InstructorAssignmentEditor from './InstructorAssignmentEditor';
import {
  lmsApi,
  type InstructorCourseDetail,
  type InstructorLesson,
  type LessonType,
  type CourseReusablePolicy,
} from '../../api/lms';

/**
 * 공통 shell 의 reusablePolicy 는 'organization' tier 를 포함하지만 PH domain 은
 * restricted | platform 만 지원한다. 알 수 없는 값이 오면 재사용 범위를 넓히지 않도록
 * 가장 좁은 'restricted' 로 보수적으로 대응한다(GlycoPharm 과 같은 처리).
 */
const toPhReusablePolicy = (p: InstructorCourseFormValues['reusablePolicy']): CourseReusablePolicy =>
  p === 'platform' ? 'platform' : 'restricted';

const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  video: '동영상',
  article: '문서',
  quiz: '퀴즈',
  assignment: '과제',
};
const SUPPORTED_LESSON_TYPES: LessonType[] = ['video', 'article', 'quiz', 'assignment'];

const C = { primary: '#0d9488', primaryLight: '#ccfbf1', primaryDark: '#0f766e' };

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 860, margin: '0 auto', padding: '32px 20px' },
  backLink: { fontSize: 13, color: '#6b7280', cursor: 'pointer', marginBottom: 20, display: 'inline-block', background: 'none', border: 'none', padding: 0 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none' },
  textarea: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 80 },
  select: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', background: '#fff', outline: 'none' },
  row: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  archiveBtn: { padding: '8px 16px', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { padding: '8px 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer' },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 },
  createdBanner: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: C.primaryLight, border: '1px solid #99f6e4', borderRadius: 10, marginBottom: 24, fontSize: 14, color: C.primaryDark },
};

const saveBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '8px 18px', background: disabled ? '#5eead4' : C.primary, color: '#fff',
  border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
});

const reviewBtnStyle = (pending: boolean): React.CSSProperties => ({
  padding: '8px 18px', background: pending ? '#f59e0b' : C.primary, color: '#fff',
  border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

const statusBadgeStyle = (status: string): React.CSSProperties => ({
  display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#fff',
  background:
    status === 'published' ? C.primary
      : status === 'pending_review' ? '#3b82f6'
      : status === 'rejected' ? '#ef4444'
      : status === 'archived' ? '#f59e0b'
      : '#6b7280',
  marginLeft: 10,
});

const STATUS_LABEL: Record<string, string> = {
  draft: '초안', pending_review: '검토 중', published: '공개 중', rejected: '반려됨', archived: '종료됨',
};

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
  const [content, setContent] = useState<string>(typeof lesson?.content === 'string' ? lesson.content : '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [savedLesson, setSavedLesson] = useState<InstructorLesson | null>(null);
  const activeLesson = lesson ?? savedLesson;
  const showEditor = isEdit || savedLesson !== null;
  const EDITOR_TYPES: LessonType[] = ['quiz', 'assignment'];

  const isYouTubeUrl = (url: string) => /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url);

  const extractTitleFromHtml = (html: string): string => {
    const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    if (!match) return '';
    return match[1].replace(/<[^>]+>/g, '').trim();
  };

  const handleAiInsert = ({ html, title, sourceUrl }: { html: string; title: string; sourceUrl?: string }) => {
    const finalTitle = (title || '').trim() || extractTitleFromHtml(html);
    if (finalTitle && !form.title.trim()) setForm((f) => ({ ...f, title: finalTitle }));
    // YouTube sourceUrl 은 videoUrl 로만 기록하고 본문에 iframe 을 자동 주입하지 않는다
    // (WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1 과 같은 정책).
    if (sourceUrl && isYouTubeUrl(sourceUrl) && !form.videoUrl.trim()) {
      setForm((f) => ({ ...f, videoUrl: sourceUrl }));
    }
    setContent(html);
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
        const envelope = res as Record<string, any>;
        const created: InstructorLesson =
          envelope?.data?.data?.lesson ?? envelope?.data?.lesson ?? envelope?.data;
        if (EDITOR_TYPES.includes(form.type) && created?.id) {
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
        <div style={s.modalTitle}>
          {isEdit ? '레슨 수정' : savedLesson ? '레슨 생성 완료 — 세부 설정' : '새 레슨 추가'}
        </div>

        {savedLesson && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.primaryLight, border: '1px solid #99f6e4', borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.primaryDark }}>
            <span>✅</span>
            <span>레슨이 생성되었습니다. 이어서 <strong>{LESSON_TYPE_LABEL[form.type]}</strong> 설정을 입력하세요.</span>
          </div>
        )}

        {!savedLesson && (
          <>
            <div style={{ marginBottom: 16, padding: '12px 14px', background: C.primaryLight, border: '1px solid #99f6e4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark, marginBottom: 2 }}>✨ AI 보조</div>
                <div style={{ fontSize: 12, color: C.primary }}>유튜브 URL 또는 콘텐츠 URL로 제목·본문 초안을 만듭니다.</div>
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
              <input
                style={{ ...s.input, width: 100 }}
                type="number"
                min={0}
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
              />
            </div>

            {err && <p style={s.error}>{err}</p>}
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={onClose}>취소</button>
              <button style={saveBtnStyle(saving || !form.title.trim())} disabled={saving || !form.title.trim()} onClick={handleSave}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </>
        )}

        {/* WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#39·#40)
            퀴즈·과제 세부 편집기를 레슨 모달 안에서 mount 한다(KPA canonical 과 같은 배치).
            레슨이 저장된 뒤에만 노출한다 — lessonId 없이 호출할 수 있는 계약이 아니다. */}
        {showEditor && activeLesson && form.type === 'quiz' && (
          <InstructorQuizBuilder
            lessonId={activeLesson.id}
            courseId={courseId}
            lessonTitle={form.title}
          />
        )}
        {showEditor && activeLesson && form.type === 'assignment' && (
          <InstructorAssignmentEditor lessonId={activeLesson.id} courseId={courseId} />
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
        templateSystemPrompt={findEditingPreset('lms-lesson')?.systemPromptOverride}
        templateForcedOptions={findEditingPreset('lms-lesson')?.forcedOptions}
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

export default function InstructorCourseEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams<{ courseId: string }>();
  const isNew = !courseId || courseId === 'new';

  const [course, setCourse] = useState<InstructorCourseDetail | null>(null);
  const [lessons, setLessons] = useState<InstructorLesson[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const lessonListRef = useRef<InstructorLessonListHandle>(null);
  const [showCreatedBanner, setShowCreatedBanner] = useState(
    () => !!(location.state as { justCreated?: boolean } | null)?.justCreated,
  );

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
      setLessons([...ls].sort((a, b) => a.order - b.order));
    } catch {
      setError('강의 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isNew, courseId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateCourse = async () => {
    if (!newForm.title.trim()) { setCreateErr('제목을 입력하세요.'); return; }
    setCreating(true);
    setCreateErr(null);
    try {
      const created = await lmsApi.instructorCreateCourse({
        title: newForm.title.trim(),
        description: newForm.description.trim() || undefined,
      });
      navigate(`/instructor/courses/${created.id}`, { state: { justCreated: true }, replace: true });
    } catch (e: any) {
      setCreateErr(e?.response?.data?.error || '강의 생성에 실패했습니다.');
      setCreating(false);
    }
  };

  const handleSaveCourse = async (values: InstructorCourseFormValues) => {
    if (!courseId) return;
    await lmsApi.instructorUpdateCourse(courseId, {
      title: values.title,
      description: values.description,
      tags: values.tags,
      visibility: values.visibility,
      reusablePolicy: toPhReusablePolicy(values.reusablePolicy),
      requiresApproval: values.requiresApproval,
    });
  };

  const handleSubmitForReview = async () => {
    if (!courseId) return;
    try {
      await lmsApi.instructorSubmitForReview(courseId);
      await loadData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '승인 요청에 실패했습니다.');
    }
  };

  const handleArchive = async () => {
    if (!courseId) return;
    if (!confirm('이 강의를 종료(보관) 처리하시겠습니까?')) return;
    try {
      await lmsApi.instructorArchiveCourse(courseId);
      await loadData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '처리에 실패했습니다.');
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

  const handleReorderLessons = async (reordered: InstructorLessonListItem[]) => {
    if (!courseId) return;
    const byId = new Map(lessons.map((l) => [l.id, l]));
    setLessons(reordered.map((r) => byId.get(r.id)).filter((l): l is InstructorLesson => !!l));
    try {
      await lmsApi.instructorReorderLessons(courseId, reordered.map((l) => l.id));
      await loadData();
    } catch {
      await loadData();
      alert('순서 변경에 실패했습니다.');
    }
  };

  const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;

  if (isNew) {
    return (
      <div style={s.page}>
        <button style={s.backLink} onClick={() => navigate('/instructor/courses')}>← 강의 목록</button>
        <div style={s.section}>
          <div style={s.sectionTitle}>새 강의 만들기</div>
          <div style={s.card}>
            <div style={s.field}>
              <label style={s.label}>제목 *</label>
              <input
                style={s.input}
                value={newForm.title}
                onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="강의 제목을 입력하세요"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCourse()}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>설명</label>
              <textarea
                style={s.textarea}
                value={newForm.description}
                onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="강의 설명 (선택)"
              />
            </div>
            {createErr && <p style={s.error}>{createErr}</p>}
            <div style={s.row}>
              <button style={saveBtnStyle(creating || !newForm.title.trim())} disabled={creating || !newForm.title.trim()} onClick={handleCreateCourse}>
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

  // backend 는 status 를 항상 내려주지만 공통 타입에서는 optional 이라 기본값을 둔다.
  const courseStatus = course.status ?? 'draft';

  return (
    <div style={s.page}>
      <button style={s.backLink} onClick={() => navigate('/instructor/courses')}>← 강의 목록</button>

      <div style={s.section}>
        <div style={s.sectionTitle}>
          강의 정보
          <span style={statusBadgeStyle(courseStatus)}>{STATUS_LABEL[courseStatus] ?? courseStatus}</span>
        </div>

        {course.status === 'rejected' && course.rejectionReason && (
          <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            <strong>반려 사유:</strong> {course.rejectionReason}
          </div>
        )}
        {course.status === 'pending_review' && (
          <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            운영자 검토 중입니다. 검토가 완료되면 상태가 갱신됩니다.
          </div>
        )}
        {course.status === 'published' && (
          <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
            <strong>공개 중인 강의입니다.</strong> 강의 정보를 수정하면 재검토 대기 상태로 전환됩니다.
          </div>
        )}

        <div style={s.card}>
          <InstructorCourseFormShell
            config={{
              accent: C.primary,
              submitLabel: '저장',
              submittingLabel: '저장 중...',
              successMessage: '저장되었습니다.',
            }}
            initialValues={{
              title: course.title,
              description: course.description || '',
              visibility: course.visibility ?? 'members',
              requiresApproval: course.requiresApproval ?? false,
              reusablePolicy: course.reusablePolicy ?? 'restricted',
              tags: course.tags || [],
            }}
            onSubmit={handleSaveCourse}
            extraActions={
              <>
                {(course.status === 'draft' || course.status === 'rejected') && (
                  <button type="button" style={reviewBtnStyle(false)} onClick={handleSubmitForReview}>
                    {course.status === 'rejected' ? '수정 후 재요청' : '승인 요청'}
                  </button>
                )}
                {course.status === 'pending_review' && (
                  <button type="button" style={{ ...reviewBtnStyle(true), opacity: 0.6, cursor: 'not-allowed' }} disabled>
                    검토 중
                  </button>
                )}
                {course.status !== 'archived' && (
                  <button type="button" style={s.archiveBtn} onClick={handleArchive}>강의 종료</button>
                )}
              </>
            }
          />
        </div>
      </div>

      {showCreatedBanner && (
        <div style={s.createdBanner}>
          <span>강의가 생성되었습니다. 이제 레슨을 추가하여 강의를 구성하세요.</span>
          <button
            style={{ marginLeft: 'auto', padding: '6px 14px', background: C.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => { setShowCreatedBanner(false); lessonListRef.current?.openAdd(); }}
          >
            + 레슨 추가
          </button>
        </div>
      )}

      <InstructorLessonListManager
        ref={lessonListRef}
        lessons={lessons}
        accent={C.primary}
        lessonTypeLabel={LESSON_TYPE_LABEL}
        onReorder={handleReorderLessons}
        onDelete={(l) => handleDeleteLesson(l.id)}
        renderEditor={({ lesson, close }) =>
          courseId ? (
            <LessonModal
              courseId={courseId}
              lesson={lesson ? (lessons.find((x) => x.id === lesson.id) ?? null) : null}
              nextOrder={nextOrder}
              onClose={close}
              onSaved={(keepOpen) => { if (!keepOpen) close(); loadData(); }}
            />
          ) : null
        }
      />
    </div>
  );
}
