/**
 * SurveyListPage — 설문조사 목록 (회원용)
 * WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1
 *
 * 진행중 설문 목록. 포인트 보상 배지 표시.
 * 응답 → /participation/:id/respond (기존 ParticipationRespondPage 활용)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, AlertCircle, Loader2, Gift, ChevronRight } from 'lucide-react';
import { surveyApi, type SurveyItem } from '../../api/survey';

function formatDate(d?: string | null) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return ''; }
}

export default function SurveyListPage() {
  const [items, setItems] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    surveyApi.list({ audience: 'for-me' })
      .then((res) => setItems(res.data ?? []))
      .catch((e: any) => setError(e.message ?? '불러오기 실패'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-800">설문조사</h1>
      </div>
      <p className="text-sm text-slate-500">참여 가능한 설문에 응답하고 포인트를 받으세요.</p>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">현재 진행 중인 설문이 없습니다.</p>
        </div>
      )}

      {!loading && items.map((survey) => (
        <Link
          key={survey.id}
          to={`/surveys/${survey.id}`}
          className="block p-4 border rounded-xl bg-white hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-slate-800 truncate">{survey.title}</h2>
              {survey.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{survey.description}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                <span>응답 {survey.responseCount}명</span>
                {survey.endAt && <span>~{formatDate(survey.endAt)} 마감</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {survey.rewardEnabled && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  <Gift className="w-3 h-3" />
                  {survey.rewardAmount}P
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
