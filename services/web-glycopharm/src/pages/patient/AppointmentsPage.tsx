/**
 * PatientAppointmentsPage — 당뇨인 상담 예약
 * WO-GLYCOPHARM-APPOINTMENT-SYSTEM-V1
 *
 * 약국 연결 확인 → 예약 생성 → 예약 목록/취소.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  Send,
} from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { AppointmentDto, MyLinkStatus } from '@/api/patient';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  requested: { label: '요청', bg: 'bg-amber-50', text: 'text-amber-700' },
  confirmed: { label: '확정', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { label: '거절', bg: 'bg-red-50', text: 'text-red-700' },
  completed: { label: '완료', bg: 'bg-slate-100', text: 'text-slate-600' },
  cancelled: { label: '취소', bg: 'bg-slate-50', text: 'text-slate-400' },
};

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();

  const [linkStatus, setLinkStatus] = useState<MyLinkStatus | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, appointmentsRes] = await Promise.all([
        patientApi.getMyLinkStatus().catch(() => ({ data: { linked: false } as MyLinkStatus })),
        patientApi.getMyAppointments().catch(() => ({ data: [] as AppointmentDto[] })),
      ]);

      setLinkStatus(statusRes?.data || { linked: false });
      const apptData = appointmentsRes && 'data' in appointmentsRes && Array.isArray(appointmentsRes.data)
        ? appointmentsRes.data
        : Array.isArray(appointmentsRes) ? appointmentsRes : [];
      setAppointments(apptData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!date || !time) return;
    setSending(true);
    setError('');
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const res = await patientApi.createAppointment(scheduledAt, notes || undefined);
      if (res && 'error' in res && res.error) {
        setError((res.error as { message?: string }).message || '예약에 실패했습니다.');
        return;
      }
      setSent(true);
      setDate('');
      setTime('');
      setNotes('');
      // Reload appointments
      const apptRes = await patientApi.getMyAppointments().catch(() => ({ data: [] }));
      const data = apptRes && 'data' in apptRes && Array.isArray(apptRes.data) ? apptRes.data : [];
      setAppointments(data);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await patientApi.cancelAppointment(id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a)),
      );
    } catch {
      // silent
    } finally {
      setCancellingId(null);
    }
  };

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
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">상담 예약</h1>
            <p className="text-xs text-slate-400">약사와 상담 시간을 예약하세요</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : !linkStatus?.linked ? (
          /* Not Linked */
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-2">약국 연결이 필요합니다</h2>
            <p className="text-sm text-slate-600 mb-4">
              상담을 예약하려면 먼저 약국에 연결해 주세요.
            </p>
            <button
              onClick={() => navigate('/patient/select-pharmacy')}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              약국 연결하기
            </button>
          </div>
        ) : (
          <>
            {/* Appointment Form */}
            {sent ? (
              <div className="bg-orange-50 rounded-2xl p-6 text-center mb-6">
                <CheckCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-slate-800 mb-1">예약 요청 완료</h2>
                <p className="text-sm text-slate-600 mb-4">
                  약사가 확인 후 승인하면 알려드리겠습니다.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="px-5 py-2 text-sm font-medium text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors"
                >
                  추가 예약
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  예약 신청
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">날짜</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">시간</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">메모 (선택)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="상담 내용이나 요청사항을 입력하세요."
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 mt-2">{error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!date || !time || sending}
                  className="w-full mt-4 py-3 text-sm font-medium text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      예약 요청
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Appointment List */}
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              내 예약 ({appointments.length}건)
            </h3>

            {appointments.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-8 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">예약 기록이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map((appt) => {
                  const config = STATUS_CONFIG[appt.status] || STATUS_CONFIG.requested;
                  const canCancel = appt.status === 'requested' || appt.status === 'confirmed';
                  return (
                    <div
                      key={appt.id}
                      className="bg-white rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {new Date(appt.scheduledAt).toLocaleDateString('ko-KR', {
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short',
                            })}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(appt.scheduledAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' · '}
                            {appt.pharmacyName}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>

                      {appt.notes && (
                        <p className="text-xs text-slate-400 mb-2">{appt.notes}</p>
                      )}

                      {appt.status === 'rejected' && appt.rejectReason && (
                        <div className="bg-red-50 rounded-lg px-3 py-2 mb-2">
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            거절 사유: {appt.rejectReason}
                          </p>
                        </div>
                      )}

                      {canCancel && (
                        <button
                          onClick={() => handleCancel(appt.id)}
                          disabled={cancellingId === appt.id}
                          className="w-full mt-1 py-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          {cancellingId === appt.id ? '취소 중...' : '예약 취소'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
