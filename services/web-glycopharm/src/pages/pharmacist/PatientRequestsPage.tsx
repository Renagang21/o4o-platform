/**
 * PatientRequestsPage — 약사 연결 요청 관리
 * WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1
 *
 * 환자의 약국 연결 요청을 승인/거절하는 화면.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { pharmacyApi } from '@/api/pharmacy';
import type { PharmacyLinkRequestDto } from '@/api/pharmacy';

export default function PatientRequestsPage() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<PharmacyLinkRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject UI state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pharmacyApi.getPharmacyLinkRequests();
      const data = res && 'data' in res && Array.isArray(res.data)
        ? res.data
        : Array.isArray(res) ? res : [];
      setRequests(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await pharmacyApi.approvePharmacyLink(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await pharmacyApi.rejectPharmacyLink(requestId, rejectReason || undefined);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setRejectingId(null);
      setRejectReason('');
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/pharmacist')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">연결 요청</h1>
            <p className="text-xs text-slate-400">
              {requests.length > 0
                ? `${requests.length}건의 대기 중인 요청`
                : '환자 연결 요청 관리'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center">
            <Clock className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 font-medium">
              대기 중인 연결 요청이 없습니다
            </p>
            <p className="text-xs text-slate-400 mt-1">
              환자가 약국 연결을 요청하면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                {/* Patient Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {req.patientName}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {req.patientEmail}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(req.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                {/* Message */}
                {req.message && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                      <MessageSquare className="w-3 h-3" />
                      환자 메시지
                    </p>
                    <p className="text-sm text-slate-700">{req.message}</p>
                  </div>
                )}

                {/* Reject Reason Input */}
                {rejectingId === req.id ? (
                  <div className="mb-3">
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
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading === req.id}
                        className="flex-1 py-2 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === req.id ? '처리 중...' : '거절 확인'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons */
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading === req.id}
                      className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {actionLoading === req.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          승인
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setRejectingId(req.id)}
                      disabled={actionLoading === req.id}
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
        )}
      </div>
    </div>
  );
}
