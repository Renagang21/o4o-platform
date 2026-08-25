/**
 * PharmacyHubSurveyListPage — 회원 설문 목록 (`/content/surveys`)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6 (#24)
 *
 * 운영자가 만든 설문(#97)에 회원이 실제로 응답할 수 있어야 콘솔이 dead-end 가 아니다.
 * 그래서 두 축을 같은 WO 에서 함께 연다.
 *
 * 원장·API 는 공통 `/api/v1/surveys` (serviceKey='pharmacy-hub') 하나이며 신규 table 0.
 * KPA 의 `/participation/*` 모듈(별도 참여 도메인)은 PH 에 이식하지 않는다 — 설문 응답은
 * 공통 survey response endpoint 로 충분하고, 없는 도메인을 복제하지 않는다.
 * 경로 형태는 KPA `/content/surveys` 와 같다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, AlertCircle, Loader2, Gift, ChevronRight } from 'lucide-react';
import { listSurveys, type SurveyItem } from '../../lib/api/pharmacyHubSurveys';

function formatDate(d?: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('ko-KR');
  } catch {
    return '';
  }
}

export default function PharmacyHubSurveyListPage() {
  const [items, setItems] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSurveys({ audience: 'for-me', limit: 50 })
      .then((res) => {
        if (!cancelled) setItems(res.items);
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

      {!loading &&
        items.map((survey) => (
          <Link
            key={survey.id}
            to={`/content/surveys/${survey.id}`}
            className="block p-4 border border-slate-200 rounded-xl bg-white hover:border-teal-300 hover:shadow-sm transition-all"
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
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
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
