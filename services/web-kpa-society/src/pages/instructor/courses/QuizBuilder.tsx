/**
 * QuizBuilder — 강사용 퀴즈 작성 UI
 * WO-KPA-LMS-QUIZ-BUILDER-UI-V1
 *
 * QUIZ 유형 레슨에 연결된 퀴즈를 생성·수정한다.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  lmsInstructorApi,
  type InstructorQuiz,
  type QuizQuestionDraft,
  type QuizQuestionType,
} from '../../../api/lms-instructor';

/* ── styles ── */
const q: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 24, borderTop: '2px solid #4f46e5', paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#4f46e5', marginBottom: 16 },
  settings: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#6b7280' },
  input: { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, color: '#111827' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' },
  qCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 },
  qHeader: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 },
  qNum: { fontSize: 12, fontWeight: 700, color: '#6b7280', minWidth: 22, paddingTop: 4 },
  qInputWrap: { flex: 1 },
  qText: { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, color: '#111827', boxSizing: 'border-box' as const, resize: 'vertical' as const, minHeight: 56 },
  qMeta: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' as const },
  metaSelect: { padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, color: '#374151', background: '#fff' },
  metaInput: { padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, color: '#374151', width: 70 },
  optRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 },
  optInput: { flex: 1, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13, color: '#111827' },
  delBtn: { padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  addOptBtn: { padding: '4px 10px', background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', marginTop: 2 },
  delQBtn: { padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' },
  addQBtn: { width: '100%', padding: '9px', background: '#f3f4f6', color: '#374151', border: '1px dashed #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginTop: 4 },
  saveRow: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 },
  radioCheck: { cursor: 'pointer', accentColor: '#4f46e5' },
};

const saveBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '8px 20px', background: disabled ? '#c4b5fd' : '#4f46e5', color: '#fff',
  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
});
const msgStyle = (ok: boolean): React.CSSProperties => ({ fontSize: 13, color: ok ? '#10b981' : '#ef4444' });

const newQuestion = (order: number): QuizQuestionDraft => ({
  id: `new-${Date.now()}-${order}`,
  question: '',
  type: 'single',
  options: ['', ''],
  answer: '',
  points: 1,
  order,
});

interface Props {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
}

export default function QuizBuilder({ lessonId, courseId, lessonTitle }: Props) {
  const [quiz, setQuiz] = useState<InstructorQuiz | null>(null);
  const [loading, setLoading] = useState(true);

  // quiz settings
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState<string>('');
  const [maxAttempts, setMaxAttempts] = useState<string>('');
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([newQuestion(1)]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lmsInstructorApi.getQuizForLesson(lessonId);
      const existing = (res as any).data?.data?.quiz ?? (res as any).data?.quiz ?? null;
      if (existing) {
        setQuiz(existing);
        setPassingScore(existing.passingScore ?? 70);
        setTimeLimit(existing.timeLimit != null ? String(existing.timeLimit) : '');
        setMaxAttempts(existing.maxAttempts != null ? String(existing.maxAttempts) : '');
        setShowCorrectAnswers(existing.showCorrectAnswers ?? false);
        setIsPublished(existing.isPublished ?? false);
        if (existing.questions?.length > 0) {
          setQuestions(existing.questions.map((q: any) => ({
            ...q,
            options: q.options ?? [],
            answer: q.answer ?? '',
            points: q.points ?? 1,
          })));
        }
      }
    } catch {
      // 퀴즈 없음 — 신규 작성 모드
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const invalidQ = questions.find((q) => !q.question.trim());
    if (invalidQ) { setMsg({ text: '모든 문항에 텍스트를 입력하세요.', ok: false }); return; }

    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        lessonId,
        courseId,
        title: lessonTitle || '퀴즈',
        passingScore,
        timeLimit: timeLimit ? Number(timeLimit) : null,
        maxAttempts: maxAttempts ? Number(maxAttempts) : null,
        showCorrectAnswers,
        isPublished,
        questions: questions.map(({ id: _id, ...rest }, idx) => ({ ...rest, order: idx + 1 })),
      };

      if (quiz?.id) {
        await lmsInstructorApi.updateQuiz(quiz.id, payload);
      } else {
        const res = await lmsInstructorApi.createQuiz(payload);
        const created = (res as any).data?.data ?? (res as any).data ?? null;
        if (created?.id) setQuiz(created);
      }
      setMsg({ text: '저장되었습니다.', ok: true });
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || '저장에 실패했습니다.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = (idx: number, patch: Partial<QuizQuestionDraft>) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const addQuestion = () =>
    setQuestions((prev) => [...prev, newQuestion(prev.length + 1)]);

  const deleteQuestion = (idx: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== idx));

  const addOption = (qIdx: number) =>
    updateQuestion(qIdx, { options: [...(questions[qIdx].options ?? []), ''] });

  const updateOption = (qIdx: number, oIdx: number, val: string) => {
    const opts = [...(questions[qIdx].options ?? [])];
    opts[oIdx] = val;
    updateQuestion(qIdx, { options: opts });
  };

  const deleteOption = (qIdx: number, oIdx: number) => {
    const opts = (questions[qIdx].options ?? []).filter((_, i) => i !== oIdx);
    const ans = questions[qIdx].answer;
    const removedVal = (questions[qIdx].options ?? [])[oIdx];
    const newAns = Array.isArray(ans)
      ? ans.filter((a) => a !== removedVal)
      : ans === removedVal ? '' : ans;
    updateQuestion(qIdx, { options: opts, answer: newAns });
  };

  const toggleMultiAnswer = (qIdx: number, opt: string) => {
    const cur = questions[qIdx].answer;
    const arr = Array.isArray(cur) ? cur : cur ? [cur] : [];
    const next = arr.includes(opt) ? arr.filter((a) => a !== opt) : [...arr, opt];
    updateQuestion(qIdx, { answer: next });
  };

  const changeType = (qIdx: number, type: QuizQuestionType) => {
    updateQuestion(qIdx, { type, answer: type === 'multi' ? [] : '', options: type === 'text' ? [] : (questions[qIdx].options?.length ? questions[qIdx].options : ['', '']) });
  };

  if (loading) return <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 16 }}>퀴즈 불러오는 중...</div>;

  return (
    <div style={q.wrap}>
      <div style={q.sectionTitle}>퀴즈 설정 {quiz ? '(수정)' : '(신규)'}</div>

      {/* 기본 설정 */}
      <div style={q.settings}>
        <div style={q.field}>
          <label style={q.label}>통과 점수 (%)</label>
          <input style={q.input} type="number" min={1} max={100} value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))} />
        </div>
        <div style={q.field}>
          <label style={q.label}>제한 시간 (분, 비워두면 무제한)</label>
          <input style={q.input} type="number" min={1} value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)} placeholder="무제한" />
        </div>
        <div style={q.field}>
          <label style={q.label}>최대 응시 횟수 (비워두면 무제한)</label>
          <input style={q.input} type="number" min={1} value={maxAttempts}
            onChange={(e) => setMaxAttempts(e.target.value)} placeholder="무제한" />
        </div>
        <div style={{ ...q.field, justifyContent: 'flex-end', gap: 10 }}>
          <label style={q.checkRow}>
            <input type="checkbox" style={q.radioCheck} checked={showCorrectAnswers}
              onChange={(e) => setShowCorrectAnswers(e.target.checked)} />
            정답 공개 (응시 후)
          </label>
          <label style={q.checkRow}>
            <input type="checkbox" style={q.radioCheck} checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)} />
            퀴즈 공개
          </label>
        </div>
      </div>

      {/* 문항 목록 */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
        문항 ({questions.length}개)
      </div>

      {questions.map((question, qIdx) => (
        <div key={question.id} style={q.qCard}>
          <div style={q.qHeader}>
            <span style={q.qNum}>{qIdx + 1}</span>
            <div style={q.qInputWrap}>
              <textarea
                style={q.qText}
                value={question.question}
                onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                placeholder="문항 텍스트를 입력하세요"
              />
              <div style={q.qMeta}>
                <select style={q.metaSelect} value={question.type}
                  onChange={(e) => changeType(qIdx, e.target.value as QuizQuestionType)}>
                  <option value="single">단일 선택</option>
                  <option value="multi">복수 선택</option>
                  <option value="text">주관식</option>
                </select>
                <input style={q.metaInput} type="number" min={1} value={question.points}
                  onChange={(e) => updateQuestion(qIdx, { points: Number(e.target.value) })}
                  title="배점" placeholder="배점" />
                <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>점</span>
              </div>
            </div>
            {questions.length > 1 && (
              <button style={q.delQBtn} onClick={() => deleteQuestion(qIdx)}>삭제</button>
            )}
          </div>

          {/* 선택지 (single / multi) */}
          {(question.type === 'single' || question.type === 'multi') && (
            <div style={{ paddingLeft: 30 }}>
              {(question.options ?? []).map((opt, oIdx) => (
                <div key={oIdx} style={q.optRow}>
                  {question.type === 'single' ? (
                    <input
                      type="radio"
                      style={q.radioCheck}
                      name={`q-${question.id}-answer`}
                      checked={question.answer === opt && opt !== ''}
                      onChange={() => opt && updateQuestion(qIdx, { answer: opt })}
                    />
                  ) : (
                    <input
                      type="checkbox"
                      style={q.radioCheck}
                      checked={Array.isArray(question.answer) && question.answer.includes(opt) && opt !== ''}
                      onChange={() => opt && toggleMultiAnswer(qIdx, opt)}
                    />
                  )}
                  <input
                    style={q.optInput}
                    value={opt}
                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                    placeholder={`선택지 ${oIdx + 1}`}
                  />
                  {(question.options ?? []).length > 2 && (
                    <button style={q.delBtn} onClick={() => deleteOption(qIdx, oIdx)}>×</button>
                  )}
                </div>
              ))}
              <button style={q.addOptBtn} onClick={() => addOption(qIdx)}>+ 선택지 추가</button>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                {question.type === 'single' ? '라디오 버튼으로 정답 1개를 선택하세요' : '체크박스로 정답 여러 개를 선택하세요'}
              </div>
            </div>
          )}

          {/* 주관식 정답 */}
          {question.type === 'text' && (
            <div style={{ paddingLeft: 30 }}>
              <input
                style={{ ...q.optInput, width: '100%', boxSizing: 'border-box' as const }}
                value={Array.isArray(question.answer) ? question.answer.join('') : question.answer}
                onChange={(e) => updateQuestion(qIdx, { answer: e.target.value })}
                placeholder="정답 텍스트를 입력하세요 (대소문자 구분 없이 채점)"
              />
            </div>
          )}
        </div>
      ))}

      <button style={q.addQBtn} onClick={addQuestion}>+ 문항 추가</button>

      <div style={q.saveRow}>
        <button style={saveBtnStyle(saving)} disabled={saving} onClick={handleSave}>
          {saving ? '저장 중...' : '퀴즈 저장'}
        </button>
        {msg && <span style={msgStyle(msg.ok)}>{msg.text}</span>}
      </div>
    </div>
  );
}
