/**
 * PharmacistCoachingPage — 당뇨인용 약사 코칭 확인 화면
 * WO-GLYCOPHARM-PATIENT-COACHING-VIEW-SCREEN-V1
 * WO-GLUCOSEVIEW-PATIENT-PHARMACY-LINK-FLOW-V1
 *
 * 약국 연결 상태에 따라 3가지 UI:
 * 1. 미연결 → 약국 연결 CTA
 * 2. 대기 중 → 승인 대기 안내
 * 3. 연결 완료 → 코칭 기록 표시
 *
 * 고령 사용자 고려: 큰 글자, 명확한 색상, 카드형 UI.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, UserCheck, ChevronDown, ChevronUp, Calendar, Building2, Clock } from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { PatientCoachingRecord, MyLinkStatus } from '@/api/patient';

export default function PharmacistCoachingPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PatientCoachingRecord[]>([]);
  const [linkStatus, setLinkStatus] = useState<MyLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [coachingRes, statusRes] = await Promise.all([
        patientApi.getMyCoaching().catch(() => ({ success: false, data: [] })),
        patientApi.getMyLinkStatus().catch(() => ({ success: false, data: { linked: false } as MyLinkStatus })),
      ]);

      if (coachingRes.success && coachingRes.data) {
        setRecords(Array.isArray(coachingRes.data) ? coachingRes.data : []);
      } else {
        setRecords([]);
      }
      setLinkStatus(statusRes?.data || { linked: false });
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const latest = records.length > 0 ? records[0] : null;
  const older = records.slice(1);

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
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
        ) : !linkStatus?.linked && !linkStatus?.pendingRequest ? (
          /* State 1: Not Linked */
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 flex flex-col items-center justify-center">
            <Building2 className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-500">약국을 먼저 연결해 주세요</p>
            <p className="text-sm text-slate-400 mt-1 text-center">
              약사가 코칭을 시작하려면 약국 연결이 필요합니다.
            </p>
            <button
              onClick={() => navigate('/patient/select-pharmacy')}
              className="mt-5 px-6 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              약국 연결하기
            </button>
          </div>
        ) : linkStatus?.pendingRequest && !linkStatus?.linked ? (
          /* State 2: Pending */
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 flex flex-col items-center justify-center">
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">
              {linkStatus.pendingRequest.pharmacyName} 승인 대기 중
            </p>
            <p className="text-sm text-slate-500 mt-1 text-center">
              약사가 연결을 승인하면 코칭이 시작됩니다.
            </p>
            <p className="text-xs text-slate-400 mt-3">
              요청일: {new Date(linkStatus.pendingRequest.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        ) : records.length === 0 ? (
          /* State 3: Linked but no coaching yet */
          <div>
            {linkStatus?.linked && (
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-4 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">{linkStatus.pharmacyName}</p>
                  <p className="text-xs text-emerald-600">연결됨</p>
                </div>
              </div>
            )}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 flex flex-col items-center justify-center">
              <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-base font-medium text-slate-500">아직 코칭 기록이 없습니다</p>
              <p className="text-sm text-slate-400 mt-1 text-center">
                약사가 코칭을 등록하면 여기에 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Connected Pharmacy */}
            {linkStatus?.linked && (
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-4 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">{linkStatus.pharmacyName}</p>
                  <p className="text-xs text-emerald-600">연결됨</p>
                </div>
              </div>
            )}

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

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate(`/patient/messages?coaching=${latest.id}`)}
                    className="flex-1 py-2.5 text-sm font-medium text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    질문하기
                  </button>
                  <button
                    onClick={() => navigate('/patient/appointments')}
                    className="flex-1 py-2.5 text-sm font-medium text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    상담 예약
                  </button>
                </div>
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
