/**
 * SurveyDetailPage — 설문 상세 / 참여 진입
 * WO-O4O-SURVEY-POINT-REWARD-PHASE1-V1
 *
 * 포인트 보상 정보 표시 후 /participation/:id/respond 로 연결.
 * 이미 응답한 경우 결과 페이지로 안내.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ClipboardList, Gift, ChevronLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { surveyApi, type SurveyDetail } from '../../api/survey';
import { participationApi } from '../../api/participation';
import { useAuth } from '../../contexts/AuthContext';

export default function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyResponded, setAlreadyResponded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    surveyApi.get(id)
      .then((res) => setSurvey(res.data))
      .catch((e: any) => setError(e.message ?? '불러오기 실패'))
      .finally(() => setLoading(false));
  }, [id]);

  // 기응답 확인 — ParticipationRespondPage도 중복 방지하지만 UX 개선을 위해 미리 확인
  useEffect(() => {
    if (!id || !user) return;
    participationApi.getMyResponse(id)
      .then((res) => { if (res) setAlreadyResponded(true); })
      .catch(() => {});
  }, [id, user]);

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
        <Link to="/surveys" className="mt-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="w-4 h-4" /> 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* 뒤로 */}
      <Link to="/surveys" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4" /> 설문 목록
      </Link>

      {/* 설문 정보 */}
      <div className="p-5 border rounded-xl bg-white space-y-3">
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
          <span>질문 {(survey.questions ?? []).length}개</span>
          <span>응답 {survey.responseCount}명</span>
        </div>

        {/* 포인트 보상 배지 */}
        {survey.rewardEnabled && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <Gift className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                설문 완료 시 <span className="text-emerald-600">{survey.rewardAmount}P</span> 획득
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">포인트는 응답 완료 즉시 지급됩니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* 이미 응답한 경우 */}
      {alreadyResponded ? (
        <div className="p-4 rounded-xl bg-slate-50 border space-y-3 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">이미 응답하셨습니다</p>
          {survey.rewardEnabled && (
            <p className="text-xs text-emerald-600">{survey.rewardAmount}P가 지급되었습니다.</p>
          )}
          <button
            onClick={() => navigate(`/participation/${id}/results`)}
            className="w-full py-2 text-sm text-slate-700 border rounded-lg hover:bg-slate-100"
          >
            결과 보기
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate(`/participation/${id}/respond`)}
          disabled={survey.status !== 'active'}
          className="w-full py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {survey.status === 'active' ? '설문 참여하기' : '현재 참여 불가'}
        </button>
      )}
    </div>
  );
}
