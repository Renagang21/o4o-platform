/**
 * PharmacyCoachingPage — 당뇨인용 약사 코칭 확인 화면 (환자 뷰)
 * WO-GLYCOPHARM-PATIENT-COACHING-VIEW-SCREEN-V1
 * WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-C1:
 *   file/component PharmacistCoachingPage → PharmacyCoachingPage 표준화.
 *   (patient-facing view of pharmacy coaching)
 *   DTO 필드 pharmacistName 은 backend 계약이라 불변.
 *
 * 약사가 작성한 코칭 내용을 당뇨인가 확인.
 * - 최신 코칭 강조 표시
 * - 행동 가이드 (actionPlan)
 * - 과거 코칭 기록 목록
 *
 * 고령 사용자 고려: 큰 글자, 명확한 색상, 카드형 UI.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, UserCheck, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { PatientCoachingRecord } from '@/api/patient';

export default function PharmacyCoachingPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PatientCoachingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadCoaching = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientApi.getMyCoaching();
      if (res.success && res.data) {
        setRecords(Array.isArray(res.data) ? res.data : []);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoaching();
  }, [loadCoaching]);

  const latest = records.length > 0 ? records[0] : null;
  const older = records.slice(1);

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/patient')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-violet-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">약사 코칭 확인</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : records.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 flex flex-col items-center justify-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-500">아직 코칭 기록이 없습니다</p>
            <p className="text-sm text-slate-400 mt-1 text-center">
              약사가 코칭을 등록하면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            {/* Latest Coaching — Highlighted */}
            {latest && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-3">
                  최신 코칭
                </h2>
                <div className="bg-violet-50 rounded-2xl border border-violet-200 p-5">
                  {/* Pharmacist + date */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-violet-800">
                        {latest.pharmacistName || '약사'}
                      </p>
                      <p className="text-xs text-violet-400">
                        {new Date(latest.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-base font-medium text-slate-800 mb-3 leading-relaxed">
                    {latest.summary}
                  </p>

                  {/* Action Plan */}
                  {latest.actionPlan && (
                    <div className="bg-white rounded-xl p-4 border border-violet-100">
                      <p className="text-xs font-semibold text-violet-600 mb-2">
                        실행 가이드
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {latest.actionPlan}
                      </p>
                    </div>
                  )}
                </div>

                {/* Appointment shortcut */}
                <button
                  onClick={() => navigate('/patient/appointments')}
                  className="w-full mt-3 py-2.5 text-sm font-medium text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  상담 예약하기
                </button>
              </section>
            )}

            {/* Past Coaching Records */}
            {older.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  이전 코칭 ({older.length}건)
                </h2>
                <div className="space-y-2">
                  {older.map((record) => {
                    const isExpanded = expandedId === record.id;
                    return (
                      <div
                        key={record.id}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : record.id)}
                          className="w-full p-4 flex items-center justify-between text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {record.summary}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {record.pharmacistName || '약사'} ·{' '}
                              {new Date(record.createdAt).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                          )}
                        </button>

                        {isExpanded && record.actionPlan && (
                          <div className="px-4 pb-4">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <p className="text-xs font-semibold text-slate-500 mb-1">
                                실행 가이드
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {record.actionPlan}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
