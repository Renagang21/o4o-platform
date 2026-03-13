/**
 * PharmacistAppointmentsPage — 약사 예약 관리
 * WO-GLYCOPHARM-APPOINTMENT-SYSTEM-V1
 *
 * 3섹션: 오늘 예약 / 대기 요청 / 예정 예약.
 * 승인/거절/방문완료 처리.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import type { PharmacyAppointmentDto } from '@/api/pharmacy';

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isFuture(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now && !isToday(dateStr);
}

export default function PharmacistAppointmentsPage() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<PharmacyAppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject UI
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getPharmacyAppointments();
      const data = res && 'data' in res && Array.isArray((res as { data: unknown }).data)
        ? (res as { data: PharmacyAppointmentDto[] }).data
        : Array.isArray(res) ? res : [];
      setAppointments(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    try {
      await pharmacyApi.confirmAppointment(id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'confirmed' } : a)),
      );
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await pharmacyApi.rejectAppointment(id, rejectReason || undefined);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'rejected', rejectReason: rejectReason || null } : a)),
      );
      setRejectingId(null);
      setRejectReason('');
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    setActionLoading(id);
    try {
      await pharmacyApi.completeAppointment(id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'completed' } : a)),
      );
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  // Categorize
  const todayConfirmed = appointments.filter(
    (a) => a.status === 'confirmed' && isToday(a.scheduledAt),
  );
  const pendingRequests = appointments.filter((a) => a.status === 'requested');
  const upcomingConfirmed = appointments.filter(
    (a) => a.status === 'confirmed' && isFuture(a.scheduledAt),
  );

  const totalActive = todayConfirmed.length + pendingRequests.length + upcomingConfirmed.length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/pharmacy')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">예약 관리</h1>
            <p className="text-xs text-slate-400">
              {totalActive > 0
                ? `${totalActive}건의 활성 예약`
                : '상담 예약 관리'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : totalActive === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center">
            <Clock className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 font-medium">예약이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">
              환자가 상담을 예약하면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Today's Appointments */}
            {todayConfirmed.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">
                  오늘 예약 ({todayConfirmed.length}건)
                </h2>
                <div className="space-y-2">
                  {todayConfirmed.map((appt) => (
                    <div
                      key={appt.id}
                      className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {appt.patientName}
                            </p>
                            <p className="text-xs text-emerald-600">
                              {new Date(appt.scheduledAt).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleComplete(appt.id)}
                          disabled={actionLoading === appt.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading === appt.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              방문 완료
                            </>
                          )}
                        </button>
                      </div>
                      {appt.notes && (
                        <p className="text-xs text-slate-500 mt-1">{appt.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: Pending Requests */}
            {pendingRequests.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">
                  대기 요청 ({pendingRequests.length}건)
                </h2>
                <div className="space-y-2">
                  {pendingRequests.map((appt) => (
                    <div
                      key={appt.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4"
                    >
                      {/* Patient Info */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {appt.patientName}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {appt.patientEmail}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-slate-700">
                            {new Date(appt.scheduledAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(appt.scheduledAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      {appt.notes && (
                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                            <MessageSquare className="w-3 h-3" />
                            환자 메모
                          </p>
                          <p className="text-sm text-slate-700">{appt.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {rejectingId === appt.id ? (
                        <div>
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="거절 사유 (선택사항)"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm mb-2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason('');
                              }}
                              className="flex-1 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              취소
                            </button>
                            <button
                              onClick={() => handleReject(appt.id)}
                              disabled={actionLoading === appt.id}
                              className="flex-1 py-2 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === appt.id ? '처리 중...' : '거절 확인'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirm(appt.id)}
                            disabled={actionLoading === appt.id}
                            className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {actionLoading === appt.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                승인
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setRejectingId(appt.id)}
                            disabled={actionLoading === appt.id}
                            className="flex-1 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 3: Upcoming */}
            {upcomingConfirmed.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
                  예정 예약 ({upcomingConfirmed.length}건)
                </h2>
                <div className="space-y-2">
                  {upcomingConfirmed.map((appt) => (
                    <div
                      key={appt.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {appt.patientName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(appt.scheduledAt).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short',
                            })}
                            {' '}
                            {new Date(appt.scheduledAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        확정
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
