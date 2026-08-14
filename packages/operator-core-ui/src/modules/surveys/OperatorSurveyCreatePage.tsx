/**
 * OperatorSurveyCreatePage — 설문 만들기 (공통)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
 * 원본: KPA-Society / K-Cosmetics 의 동일 View 2벌
 *      (WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1, WO-O4O-KCOSMETICS-OPERATOR-SURVEYS-V1).
 * 입력 항목·검증·payload 구성은 그대로 유지한다.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import type {
  OperatorSurveyCreatePageProps,
  OperatorSurveyCreatePayload,
  SurveyQuestionType,
} from './types';

interface DraftQuestion {
  id: string;
  type: SurveyQuestionType;
  question: string;
  isRequired: boolean;
  options: string[];
}

const QUESTION_TYPE_LABEL: Record<SurveyQuestionType, string> = {
  single: '단일 선택',
  multi: '복수 선택',
  text: '주관식',
};

function newQuestion(): DraftQuestion {
  return { id: crypto.randomUUID(), type: 'single', question: '', isRequired: false, options: ['', ''] };
}

export function OperatorSurveyCreatePage({ client, config }: OperatorSurveyCreatePageProps) {
  const navigate = useNavigate();
  const { accent } = config;
  const listPath = config.listPath ?? '/operator/surveys';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [rewardAmount, setRewardAmount] = useState(100);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => setQuestions((q) => [...q, newQuestion()]);

  const removeQuestion = (id: string) =>
    setQuestions((q) => q.filter((item) => item.id !== id));

  const updateQuestion = (id: string, patch: Partial<DraftQuestion>) =>
    setQuestions((q) => q.map((item) => item.id === id ? { ...item, ...patch } : item));

  const addOption = (qid: string) =>
    updateQuestion(qid, { options: [...(questions.find((q) => q.id === qid)?.options ?? []), ''] });

  const updateOption = (qid: string, idx: number, val: string) =>
    setQuestions((q) => q.map((item) =>
      item.id === qid
        ? { ...item, options: item.options.map((o, i) => i === idx ? val : o) }
        : item
    ));

  const removeOption = (qid: string, idx: number) =>
    setQuestions((q) => q.map((item) =>
      item.id === qid
        ? { ...item, options: item.options.filter((_, i) => i !== idx) }
        : item
    ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('제목을 입력하세요'); return; }
    if (questions.some((q) => !q.question.trim())) { toast.error('모든 질문을 입력하세요'); return; }

    setSaving(true);
    try {
      const payload: OperatorSurveyCreatePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q, idx) => ({
          type: q.type,
          question: q.question.trim(),
          order: idx,
          isRequired: q.isRequired,
          options: q.type !== 'text'
            ? q.options.filter((o) => o.trim()).map((o, i) => ({ label: o.trim(), value: o.trim(), order: i }))
            : undefined,
        })),
        startAt: startAt || null,
        endAt: endAt || null,
        rewardEnabled,
        rewardAmount,
        visibility: 'members_only',
      };
      await client.create(payload);
      toast.success('설문이 생성되었습니다');
      navigate(listPath);
    } catch (e: any) {
      toast.error(e?.message ?? '생성 실패');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 ' + accent.focusRing;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(listPath)} className="text-slate-500 hover:text-slate-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <ClipboardList className={'w-5 h-5 ' + accent.headerIcon} />
        <h1 className="text-lg font-semibold text-slate-800">설문 만들기</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <section className="space-y-4 p-4 border rounded-lg bg-white">
          <h2 className="text-sm font-semibold text-slate-700">기본 정보</h2>
          <div>
            <label className="block text-xs text-slate-600 mb-1">제목 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="설문 제목"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="설문 설명 (선택)"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">시작일</label>
              <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">종료일</label>
              <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)}
                className={inputCls} />
            </div>
          </div>
        </section>

        {/* 포인트 보상 */}
        <section className={'p-4 border rounded-lg space-y-3 ' + accent.sectionBg}>
          <h2 className="text-sm font-semibold text-slate-700">포인트 보상</h2>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="rewardEnabled"
              checked={rewardEnabled}
              onChange={(e) => setRewardEnabled(e.target.checked)}
              className={'w-4 h-4 ' + accent.checkboxAccent}
            />
            <label htmlFor="rewardEnabled" className="text-sm text-slate-700">응답 완료 시 포인트 지급</label>
          </div>
          {rewardEnabled && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 whitespace-nowrap">보상 포인트</label>
              <input
                type="number"
                min={1}
                value={rewardAmount}
                onChange={(e) => setRewardAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className={'w-28 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ' + accent.focusRing}
              />
              <span className="text-xs text-slate-500">P</span>
            </div>
          )}
        </section>

        {/* 질문 목록 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">질문 ({questions.length}개)</h2>
          {questions.map((q, qIdx) => (
            <div key={q.id} className="p-4 border rounded-lg bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">질문 {qIdx + 1}</span>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(q.id)}
                    className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                value={q.type}
                onChange={(e) => updateQuestion(q.id, { type: e.target.value as SurveyQuestionType })}
                className={'w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ' + accent.focusRing}
              >
                {(Object.entries(QUESTION_TYPE_LABEL) as [SurveyQuestionType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <input
                value={q.question}
                onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                placeholder="질문 내용"
                className={inputCls}
              />

              {q.type !== 'text' && (
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) => updateOption(q.id, oIdx, e.target.value)}
                        placeholder={'보기 ' + (oIdx + 1)}
                        className={'flex-1 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ' + accent.focusRing}
                      />
                      {q.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(q.id, oIdx)}
                          className="text-slate-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(q.id)}
                    className={'text-xs hover:underline ' + accent.linkText}>
                    + 보기 추가
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id={'req-' + q.id} checked={q.isRequired}
                  onChange={(e) => updateQuestion(q.id, { isRequired: e.target.checked })}
                  className={'w-4 h-4 ' + accent.checkboxAccent} />
                <label htmlFor={'req-' + q.id} className="text-xs text-slate-600">필수 질문</label>
              </div>
            </div>
          ))}

          <button type="button" onClick={addQuestion}
            className={'flex items-center gap-1 text-sm hover:underline ' + accent.linkText}>
            <Plus className="w-4 h-4" />
            질문 추가
          </button>
        </section>

        {/* 제출 */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(listPath)}
            className="flex-1 py-2 text-sm border rounded hover:bg-slate-50">
            취소
          </button>
          <button type="submit" disabled={saving}
            className={'flex-1 py-2 text-sm text-white rounded disabled:opacity-50 ' + accent.primaryButton}>
            {saving ? '저장 중...' : '설문 저장 (초안)'}
          </button>
        </div>
      </form>
    </div>
  );
}
