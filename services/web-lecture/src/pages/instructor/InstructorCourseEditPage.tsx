/**
 * 강사 — 강의 생성 / 편집 · Lesson · Quiz · Assignment (WO Phase 2 §11 Instructor)
 * serviceKey 는 보내지 않는다 — 서버가 `lecture` 로 고정한다 (§8). AI 강의 생성은 Phase 2 범위 밖 (§16).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CourseStatusBadge, LmsLoading } from '@o4o/lms-ui';
import { RichTextEditor } from '@o4o/content-editor';
import {
  instructorApi, errorMessage, errorStatus,
  type CourseInput, type LectureCourse, type LectureLesson, type LessonInput, type LessonType,
  type LectureQuiz, type QuizQuestionDraft, type LectureAssignment,
} from '../../api/lecture';
import { useToast } from '../../components/Toast';

const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'article', label: '읽기' }, { value: 'video', label: '영상' }, { value: 'quiz', label: '퀴즈' }, { value: 'assignment', label: '과제' },
];
const EMPTY_COURSE: CourseInput = { title: '', description: '', visibility: 'public', requiresApproval: false };
const parseTags = (text: string): string[] => Array.from(new Set(text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean)));
const EMPTY_LESSON: LessonInput = { title: '', type: 'article', description: '', content: '', videoUrl: '', duration: 10, isPublished: true };

export default function InstructorCourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const isNew = !courseId;
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse] = useState<LectureCourse | null>(null);
  const [form, setForm] = useState<CourseInput>(EMPTY_COURSE);
  const [tagsText, setTagsText] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [lessons, setLessons] = useState<LectureLesson[]>([]);
  const [editing, setEditing] = useState<{ id?: string; data: LessonInput } | null>(null);

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [c, l] = await Promise.all([instructorApi.getCourse(courseId), instructorApi.lessons(courseId)]);
      const data = c.data.course;
      setCourse(data);
      setForm({ title: data.title, description: data.description ?? '', thumbnail: data.thumbnail, tags: data.tags ?? [], visibility: data.visibility, requiresApproval: data.requiresApproval });
      setTagsText((data.tags ?? []).join(', '));
      setLessons([...(l.data ?? [])].sort((a, b) => a.order - b.order));
    } catch (err) { toast.error(errorMessage(err, '강의를 불러오지 못했습니다.')); }
    finally { setLoading(false); }
  }, [courseId, toast]);
  useEffect(() => { void loadCourse(); }, [loadCourse]);

  async function saveCourse() {
    if (!form.title.trim()) { toast.error('제목을 입력하세요.'); return; }
    // 서버(CourseService)가 태그 1개 이상을 요구한다 — 화면에서 먼저 막는다.
    const tags = parseTags(tagsText);
    if (tags.length === 0) { toast.error('태그를 1개 이상 입력하세요.'); return; }
    const payload: CourseInput = { ...form, tags };
    setSaving(true);
    try {
      if (isNew) {
        const res = await instructorApi.createCourse(payload);
        toast.success('강의를 만들었습니다.');
        navigate(`/instructor/courses/${res.data.course.id}/edit`, { replace: true });
      } else {
        await instructorApi.updateCourse(courseId, payload);
        toast.success('저장했습니다.');
        await loadCourse();
      }
    } catch (err) { toast.error(errorMessage(err, '저장에 실패했습니다.')); }
    finally { setSaving(false); }
  }

  async function saveLesson() {
    if (!courseId || !editing) return;
    if (!editing.data.title.trim()) { toast.error('레슨 제목을 입력하세요.'); return; }
    setSaving(true);
    try {
      if (editing.id) await instructorApi.updateLesson(editing.id, editing.data);
      else await instructorApi.createLesson(courseId, { ...editing.data, order: lessons.length + 1 });
      toast.success('레슨을 저장했습니다.');
      setEditing(null);
      await loadCourse();
    } catch (err) { toast.error(errorMessage(err, '레슨 저장에 실패했습니다.')); }
    finally { setSaving(false); }
  }

  async function removeLesson(id: string) {
    if (!window.confirm('레슨을 삭제할까요?')) return;
    try { await instructorApi.deleteLesson(id); toast.success('삭제했습니다.'); await loadCourse(); }
    catch (err) { toast.error(errorMessage(err, '삭제에 실패했습니다.')); }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!courseId) return;
    const next = [...lessons];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    try { await instructorApi.reorderLessons(courseId, next.map((l) => l.id)); setLessons(next); }
    catch (err) { toast.error(errorMessage(err, '순서 변경에 실패했습니다.')); }
  }

  if (loading) return <main className="page"><LmsLoading message="불러오는 중..." /></main>;

  return <main className="page page-wide">
    <div className="page-head row">
      <div>
        <p className="muted"><Link to="/instructor">내 강의</Link> / {isNew ? '새 강의' : '편집'}</p>
        <h1>{isNew ? '새 강의' : course?.title}</h1>
        {course && <CourseStatusBadge status={course.status} />}
      </div>
    </div>

    <section className="panel">
      <h2>기본 정보</h2>
      <label className="field"><span>제목</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label className="field"><span>소개</span><textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="field"><span>썸네일 URL</span><input value={form.thumbnail ?? ''} onChange={(e) => setForm({ ...form, thumbnail: e.target.value || null })} /></label>
      <label className="field"><span>태그 (쉼표 구분 · 1개 이상 필수)</span><input value={tagsText} placeholder="예: 복약지도, 기초" onChange={(e) => setTagsText(e.target.value)} /></label>
      <div className="field-row">
        <label className="field"><span>공개 범위</span>
          <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as CourseInput['visibility'] })}>
            <option value="public">공개 (누구나 열람)</option><option value="members">회원 전용</option>
          </select></label>
        <label className="field check"><input type="checkbox" checked={!!form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} /><span>수강 승인 필요</span></label>
      </div>
      <div className="row-actions"><button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveCourse()}>{isNew ? '강의 만들기' : '저장'}</button></div>
    </section>

    {!isNew && <section className="panel">
      <div className="row"><h2>레슨</h2><button type="button" className="btn" onClick={() => setEditing({ data: { ...EMPTY_LESSON } })}>레슨 추가</button></div>
      {lessons.length === 0 && <p className="muted">레슨이 없습니다. 레슨을 추가해 커리큘럼을 구성하세요.</p>}
      <ol className="list">
        {lessons.map((l, i) => <li key={l.id} className="list-item">
          <div className="list-main"><span className="list-title">{i + 1}. {l.title}</span><span className="badge">{LESSON_TYPES.find((t) => t.value === l.type)?.label ?? l.type}</span>{l.isPublished === false && <span className="badge">비공개</span>}</div>
          <div className="list-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void move(i, -1)} disabled={i === 0}>↑</button>
            <button type="button" className="btn btn-ghost" onClick={() => void move(i, 1)} disabled={i === lessons.length - 1}>↓</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing({ id: l.id, data: { title: l.title, type: l.type, description: l.description ?? '', content: l.content ?? '', videoUrl: l.videoUrl ?? '', duration: l.duration, isPublished: l.isPublished ?? true } })}>편집</button>
            {(l.type === 'quiz' || l.type === 'assignment') && <Link className="btn btn-ghost" to={`/instructor/lessons/${l.id}/${l.type}?courseId=${courseId}`}>{l.type === 'quiz' ? '퀴즈 구성' : '과제 구성'}</Link>}
            {l.type === 'assignment' && <Link className="btn btn-ghost" to={`/instructor/lessons/${l.id}/submissions`}>제출물</Link>}
            <button type="button" className="btn btn-ghost danger" onClick={() => void removeLesson(l.id)}>삭제</button>
          </div>
        </li>)}
      </ol>
    </section>}

    {editing && <section className="panel">
      <h2>{editing.id ? '레슨 편집' : '새 레슨'}</h2>
      <label className="field"><span>제목</span><input value={editing.data.title} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, title: e.target.value } })} /></label>
      <div className="field-row">
        <label className="field"><span>유형</span>
          <select value={editing.data.type} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, type: e.target.value as LessonType } })}>
            {LESSON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select></label>
        <label className="field"><span>학습 시간(분)</span><input type="number" min={0} value={editing.data.duration ?? 0} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, duration: Number(e.target.value) } })} /></label>
        <label className="field check"><input type="checkbox" checked={editing.data.isPublished !== false} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, isPublished: e.target.checked } })} /><span>공개</span></label>
      </div>
      {editing.data.type === 'video' && <label className="field"><span>영상 URL</span><input value={editing.data.videoUrl ?? ''} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, videoUrl: e.target.value } })} /></label>}
      <div className="field"><span>본문</span>
        <RichTextEditor value={editing.data.content ?? ''} onChange={(c) => setEditing((prev) => prev ? { ...prev, data: { ...prev.data, content: c.html } } : prev)} placeholder="레슨 본문을 입력하세요" minHeight="260px" preset="full" />
      </div>
      <div className="row-actions">
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveLesson()}>저장</button>
        <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>취소</button>
      </div>
    </section>}
  </main>;
}

// ─── 퀴즈 구성 ─────────────────────────────────────────────────────────────

const EMPTY_Q: QuizQuestionDraft = { question: '', type: 'single', options: ['', ''], answer: '', points: 10, order: 1 };

export function InstructorQuizPage() {
  const { lessonId = '' } = useParams<{ lessonId: string }>();
  const [search] = useSearchParams();
  const courseId = search.get('courseId') ?? '';
  const toast = useToast();
  const [quiz, setQuiz] = useState<LectureQuiz | null>(null);
  const [title, setTitle] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([{ ...EMPTY_Q }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // 6차 P2: 로드 실패(미존재 아님)는 화면에 드러내고 저장을 막는다 — 중복 퀴즈 생성 방지
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await instructorApi.getQuizForLesson(lessonId);
        const q = res.data?.quiz ?? null;
        if (!alive) return;
        if (q) {
          setQuiz(q); setTitle(q.title); setPassingScore(q.passingScore);
          // 4차 P1-14: 문항 id 를 유지한다 — 저장 왕복에서 id 가 사라지면 기존 attempt 의 questionId 가
          // 매칭되지 않아 제출 답안이 전부 오답이 된다(채점은 quiz.questions[].id 기준).
          setQuestions(q.questions.map((qq) => ({ ...qq })));
        }
      } catch (err) {
        if (!alive) return;
        // 6차 P2: 404(퀴즈 없음)만 "새로 만들기" 로 본다. 5xx · 네트워크 · 권한 실패를 미존재로 오인하면
        // 저장이 createQuiz 로 흘러 같은 lesson 에 퀴즈가 하나 더 생기고(lessonId 는 unique 아님)
        // 이후 learner/강사 조회가 서로 다른 행을 읽는다.
        if (errorStatus(err) !== 404) {
          setLoadError(errorMessage(err, '퀴즈를 불러오지 못했습니다.'));
        }
      }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [lessonId]);

  function patchQ(i: number, patch: Partial<QuizQuestionDraft>) {
    setQuestions((qs) => qs.map((q, idx) => {
      if (idx !== i) return q;
      const next = { ...q, ...patch };
      // 5차 P2: 보기 텍스트를 고치거나 지우면 선택해 둔 정답이 보기 목록에 없는 값으로 남는다.
      // 저장되면 채점에서 어떤 응답도 맞지 않으므로, 보기 변경 시 정답을 목록과 동기화한다.
      if (patch.options && next.type !== 'text') {
        const prevOptions = q.options ?? [];
        const nextOptions = next.options ?? [];
        const remap = (a: string): string | null => {
          if (nextOptions.includes(a)) return a;
          // 같은 자리의 보기가 이름만 바뀐 경우 → 새 이름으로 승계, 삭제된 경우 → 해제
          const at = prevOptions.indexOf(a);
          return at >= 0 && at < nextOptions.length && prevOptions.length === nextOptions.length
            ? nextOptions[at]
            : null;
        };
        next.answer = Array.isArray(next.answer)
          ? next.answer.map(remap).filter((a): a is string => Boolean(a))
          : (remap(typeof next.answer === 'string' ? next.answer : '') ?? '');
      }
      return next;
    }));
  }

  async function save() {
    if (loadError) { toast.error('퀴즈를 불러오지 못한 상태에서는 저장할 수 없습니다. 새로고침 후 다시 시도하세요.'); return; }
    if (!title.trim()) { toast.error('퀴즈 제목을 입력하세요.'); return; }
    const cleaned = questions.map((q, i) => ({ ...q, order: i + 1, options: q.type === 'text' ? [] : q.options.filter((o) => o.trim()) }));
    if (cleaned.some((q) => !q.question.trim())) { toast.error('문항 내용을 입력하세요.'); return; }
    // 6차 P1-16: 정답 없는 문항은 채점에서 항상 오답이 되어 합격 자체가 불가능해진다.
    // 선택형은 남아 있는 보기 중 하나여야 한다.
    const invalid = cleaned.findIndex((q) => {
      const answers = Array.isArray(q.answer) ? q.answer.filter((a) => a.trim()) : (typeof q.answer === 'string' && q.answer.trim() ? [q.answer] : []);
      if (answers.length === 0) return true;
      return q.type !== 'text' && answers.some((a) => !q.options.includes(a));
    });
    if (invalid >= 0) { toast.error(`${invalid + 1}번 문항의 정답을 선택(입력)하세요.`); return; }
    setSaving(true);
    try {
      const dto = { lessonId, courseId, title, passingScore, questions: cleaned };
      if (quiz) await instructorApi.updateQuiz(quiz.id, dto);
      else { const res = await instructorApi.createQuiz(dto); setQuiz(res.data.quiz); }
      toast.success('퀴즈를 저장했습니다.');
    } catch (err) { toast.error(errorMessage(err, '퀴즈 저장에 실패했습니다.')); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="page"><LmsLoading message="불러오는 중..." /></main>;
  return <main className="page page-wide">
    <div className="page-head"><p className="muted"><Link to={courseId ? `/instructor/courses/${courseId}/edit` : '/instructor'}>강의 편집</Link> / 퀴즈</p><h1>퀴즈 구성</h1></div>
    {loadError && <section className="panel"><p className="error">{loadError} 새로고침 후 다시 시도하세요. (저장은 막혀 있습니다)</p></section>}
    <section className="panel">
      <div className="field-row">
        <label className="field"><span>제목</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field"><span>합격 점수(%)</span><input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} /></label>
      </div>
      {questions.map((q, i) => <div key={i} className="panel sub">
        <div className="row"><strong>문항 {i + 1}</strong><button type="button" className="btn btn-ghost danger" onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} disabled={questions.length === 1}>삭제</button></div>
        <label className="field"><span>질문</span><input value={q.question} onChange={(e) => patchQ(i, { question: e.target.value })} /></label>
        <div className="field-row">
          <label className="field"><span>유형</span>
            <select value={q.type} onChange={(e) => patchQ(i, { type: e.target.value as QuizQuestionDraft['type'], answer: e.target.value === 'multi' ? [] : '' })}>
              <option value="single">단일 선택</option><option value="multi">복수 선택</option><option value="text">주관식</option>
            </select></label>
          <label className="field"><span>배점</span><input type="number" min={0} value={q.points} onChange={(e) => patchQ(i, { points: Number(e.target.value) })} /></label>
        </div>
        {q.type !== 'text' && <div className="field"><span>보기 (정답 체크)</span>
          {q.options.map((o, oi) => <div key={oi} className="option-row">
            <input type={q.type === 'multi' ? 'checkbox' : 'radio'} name={`ans-${i}`}
              checked={q.type === 'multi' ? (Array.isArray(q.answer) && q.answer.includes(o)) : q.answer === o}
              onChange={() => {
                if (q.type === 'multi') { const cur = Array.isArray(q.answer) ? q.answer : []; patchQ(i, { answer: cur.includes(o) ? cur.filter((a) => a !== o) : [...cur, o] }); }
                else patchQ(i, { answer: o });
              }} />
            <input value={o} placeholder={`보기 ${oi + 1}`} onChange={(e) => { const opts = [...q.options]; opts[oi] = e.target.value; patchQ(i, { options: opts }); }} />
            <button type="button" className="btn btn-ghost" disabled={q.options.length <= 2} onClick={() => patchQ(i, { options: q.options.filter((_, idx) => idx !== oi) })}>−</button>
          </div>)}
          <button type="button" className="btn btn-ghost" onClick={() => patchQ(i, { options: [...q.options, ''] })}>보기 추가</button>
        </div>}
        {q.type === 'text' && <label className="field"><span>정답(참고)</span><input value={typeof q.answer === 'string' ? q.answer : ''} onChange={(e) => patchQ(i, { answer: e.target.value })} /></label>}
      </div>)}
      <div className="row-actions">
        <button type="button" className="btn" onClick={() => setQuestions((qs) => [...qs, { ...EMPTY_Q, order: qs.length + 1 }])}>문항 추가</button>
        <button type="button" className="btn btn-primary" disabled={saving || Boolean(loadError)} onClick={() => void save()}>저장</button>
      </div>
    </section>
  </main>;
}

// ─── 과제 구성 ─────────────────────────────────────────────────────────────

export function InstructorAssignmentPage() {
  const { lessonId = '' } = useParams<{ lessonId: string }>();
  const [search] = useSearchParams();
  const courseId = search.get('courseId') ?? '';
  const toast = useToast();
  const [assignment, setAssignment] = useState<LectureAssignment | null>(null);
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // 6차 P2(같은 계열): 로드 실패를 "과제 없음" 으로 오인하면 빈 안내문으로 기존 과제를 덮어쓴다(upsert).
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await instructorApi.getAssignmentForLesson(lessonId);
        const a = res.data?.assignment ?? null;
        if (alive && a) { setAssignment(a); setInstructions(a.instructions ?? ''); setDueDate(a.dueDate ? a.dueDate.slice(0, 10) : ''); }
      } catch (err) {
        if (!alive) return;
        if (errorStatus(err) !== 404) setLoadError(errorMessage(err, '과제를 불러오지 못했습니다.'));
      }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [lessonId]);

  async function save() {
    if (loadError) { toast.error('과제를 불러오지 못한 상태에서는 저장할 수 없습니다. 새로고침 후 다시 시도하세요.'); return; }
    if (!instructions.trim()) { toast.error('과제 안내를 입력하세요.'); return; }
    setSaving(true);
    try {
      const res = await instructorApi.upsertAssignment({ lessonId, instructions, dueDate: dueDate || null });
      setAssignment(res.data.assignment);
      toast.success('과제를 저장했습니다.');
    } catch (err) { toast.error(errorMessage(err, '과제 저장에 실패했습니다.')); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="page"><LmsLoading message="불러오는 중..." /></main>;
  return <main className="page page-wide">
    <div className="page-head"><p className="muted"><Link to={courseId ? `/instructor/courses/${courseId}/edit` : '/instructor'}>강의 편집</Link> / 과제</p><h1>과제 구성</h1></div>
    {loadError && <section className="panel"><p className="error">{loadError} 새로고침 후 다시 시도하세요. (저장은 막혀 있습니다)</p></section>}
    <section className="panel">
      <label className="field"><span>과제 안내</span><textarea rows={8} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></label>
      <label className="field"><span>마감일</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
      <div className="row-actions">
        <button type="button" className="btn btn-primary" disabled={saving || Boolean(loadError)} onClick={() => void save()}>{assignment ? '저장' : '과제 만들기'}</button>
        {assignment && <Link className="btn btn-ghost" to={`/instructor/lessons/${lessonId}/submissions`}>제출물 보기</Link>}
      </div>
    </section>
  </main>;
}
