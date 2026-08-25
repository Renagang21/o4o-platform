/**
 * PharmacyHubSurveyDetailPage — 설문 상세 · 응답 (`/content/surveys/:id`)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 (#24)
 *
 * 공통 `/api/v1/surveys/:id` (질문 포함) + `POST /responses` + `GET /my-response`.
 * KPA 는 상세와 응답 화면이 분리돼 있고 응답이 별도 `/participation` 도메인에 있지만,
 * PH 에는 그 도메인이 없다. 없는 모듈을 복제하는 대신 같은 공통 endpoint 로 한 화면에서
 * 응답까지 마친다 — 회원이 얻는 기능(설문 열람·응답·보상 지급)은 동일하다.
 * 집계 결과 조회는 backend 가 작성자/admin 전용(requireSurveyOwner)이라 회원 화면에
 * '결과 보기' 를 만들지 않는다(불가능한 동선 노출 금지).
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ClipboardList,
  Gift,
  ChevronLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  getSurvey,
  getMySurveyResponse,
  submitSurveyResponse,
  type SurveyDetail,
  type SurveyAnswer,
} from '../../lib/api/pharmacyHubSurveys';

const LIST_PATH = '/content/surveys';

export default function PharmacyHubSurveyDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyResponded, setAlreadyResponded] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getSurvey(id), getMySurveyResponse(id)])
      .then(([detail, mine]) => {
        if (cancelled) return;
        setSurvey(detail);
        setAlreadyResponded(!!mine);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.response?.data?.error || e?.message || '불러오기 실패');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const questions = useMemo(() => survey?.questions ?? [], [survey]);

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMulti = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: next };
    });
  };

  const missingRequired = questions.some((q) => {
    if (!q.isRequired) return false;
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length === 0;
    return !v || !String(v).trim();
  });

  const handleSubmit = async () => {
    if (!survey) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: SurveyAnswer[] = questions
        .filter((q) => {
          const v = answers[q.id];
          return Array.isArray(v) ? v.length > 0 : !!v && !!String(v).trim();
        })
        .map((q) => ({ questionId: q.id, value: answers[q.id] }));
      await submitSurveyResponse(survey.id, payload);
      setAlreadyResponded(true);
    } catch (e: any) {
      setSubmitError(e?.response?.data?.error || e?.message || '응답 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 p-3 rounded bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error ?? '설문을 찾을 수 없습니다.'}
        </div>
        <Link
          to={LIST_PATH}
          className="mt-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="w-4 h-4" /> 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <Link
        to={LIST_PATH}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="w-4 h-4" /> 설문 목록
      </Link>

      <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-3">
        <div className="flex items-start gap-3">
          <ClipboardList className="w-6 h-6 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-800">{survey.title}</h1>
            {survey.description && (
              <p className="text-sm text-slate-600 mt-1">{survey.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>질문 {questions.length}개</span>
          <span>응답 {survey.responseCount}명</span>
        </div>

        {survey.rewardEnabled && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 border border-teal-100">
            <Gift className="w-5 h-5 text-teal-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-teal-800">
                설문 완료 시 <span className="text-teal-600">{survey.rewardAmount}P</span> 획득
              </p>
              <p className="text-xs text-teal-600 mt-0.5">포인트는 응답 완료 즉시 지급됩니다.</p>
            </div>
          </div>
        )}
      </div>

      {alreadyResponded ? (
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-center">
          <CheckCircle2 className="w-8 h-8 text-teal-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">이미 응답하셨습니다</p>
          {survey.rewardEnabled && (
            <p className="text-xs text-teal-600">{survey.rewardAmount}P가 지급되었습니다.</p>
          )}
        </div>
      ) : survey.status !== 'active' ? (
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">
          현재 응답할 수 없는 설문입니다.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                {idx + 1}. {q.question}
                {q.isRequired && <span className="text-red-500 ml-1">*</span>}
              </p>
              {q.description && <p className="text-xs text-slate-500">{q.description}</p>}

              {q.type === 'text' ? (
                <textarea
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="답변을 입력하세요"
                />
              ) : q.type === 'multi' ? (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt) => {
                    const checked =
                      Array.isArray(answers[q.id]) &&
                      (answers[q.id] as string[]).includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMulti(q.id, opt.value)}
                          className="accent-teal-600"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              ) : (q.options ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(q.options ?? []).map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt.value}
                        onChange={() => setAnswer(q.id, opt.value)}
                        className="accent-teal-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={(answers[q.id] as string) ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="답변을 입력하세요"
                />
              )}
            </div>
          ))}

          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {submitError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || missingRequired || questions.length === 0}
            className="w-full py-3 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '제출 중…' : '응답 제출'}
          </button>
        </div>
      )}
    </div>
  );
}
