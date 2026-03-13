/**
 * SelectPharmacyPage — 환자 약국 선택/연결
 * WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1
 *
 * 환자가 약국을 선택하고 연결 요청을 보내는 화면.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  CheckCircle,
  Clock,
  Send,
  Search,
} from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { PharmacyListItem, MyLinkStatus } from '@/api/patient';

export default function SelectPharmacyPage() {
  const navigate = useNavigate();

  const [pharmacies, setPharmacies] = useState<PharmacyListItem[]>([]);
  const [linkStatus, setLinkStatus] = useState<MyLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selection & request state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pharmaciesRes, statusRes] = await Promise.all([
        patientApi.getPharmacies().catch(() => ({ data: [] })),
        patientApi.getMyLinkStatus().catch(() => ({ data: { linked: false } })),
      ]);

      setPharmacies(
        Array.isArray(pharmaciesRes?.data) ? pharmaciesRes.data : [],
      );
      setLinkStatus(statusRes?.data || { linked: false });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequest = async () => {
    if (!selectedId) return;
    setSending(true);
    setError('');
    try {
      const res = await patientApi.requestPharmacyLink(selectedId, message || undefined);
      if (res?.error) {
        setError(res.error.message || '요청에 실패했습니다.');
        return;
      }
      setSent(true);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  const filteredPharmacies = search.trim()
    ? pharmacies.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : pharmacies;

  const selectedPharmacy = pharmacies.find((p) => p.id === selectedId);

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
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">약국 연결</h1>
            <p className="text-xs text-slate-400">담당 약국을 선택하세요</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
          </div>
        ) : sent ? (
          /* ── Success ── */
          <div className="bg-teal-50 rounded-2xl p-8 text-center">
            <CheckCircle className="w-14 h-14 text-teal-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              연결 요청 완료
            </h2>
            <p className="text-sm text-slate-600 mb-1">
              {selectedPharmacy?.name || '약국'}에 연결 요청을 보냈습니다.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              약사가 승인하면 혈당 관리가 시작됩니다.
            </p>
            <button
              onClick={() => navigate('/patient')}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              메인으로 돌아가기
            </button>
          </div>
        ) : linkStatus?.linked ? (
          /* ── Already Linked ── */
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              약국에 연결되어 있습니다
            </h2>
            <p className="text-base font-medium text-emerald-700 mb-4">
              {linkStatus.pharmacyName}
            </p>
            <p className="text-xs text-slate-400">
              혈당 기록을 입력하면 담당 약사가 확인할 수 있습니다.
            </p>
          </div>
        ) : linkStatus?.pendingRequest ? (
          /* ── Pending Request ── */
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 text-center">
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              연결 요청 대기 중
            </h2>
            <p className="text-base font-medium text-amber-700 mb-2">
              {linkStatus.pendingRequest.pharmacyName}
            </p>
            <p className="text-xs text-slate-400">
              약사가 요청을 확인하면 알려드리겠습니다.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              요청일: {new Date(linkStatus.pendingRequest.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
        ) : selectedId ? (
          /* ── Confirm Request ── */
          <div>
            <div className="bg-teal-50 rounded-2xl border border-teal-200 p-5 mb-4">
              <h3 className="text-sm font-semibold text-teal-800 mb-1">선택한 약국</h3>
              <p className="text-lg font-bold text-slate-800">
                {selectedPharmacy?.name}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                메시지 (선택사항)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="약사에게 전달할 메시지를 입력하세요."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedId(null)}
                className="flex-1 py-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                다른 약국 선택
              </button>
              <button
                onClick={handleRequest}
                disabled={sending}
                className="flex-1 py-3 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    연결 요청
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── Pharmacy List ── */
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="약국 이름 검색"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
              />
            </div>

            {filteredPharmacies.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-8 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {search ? '검색 결과가 없습니다' : '등록된 약국이 없습니다'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPharmacies.map((pharmacy) => (
                  <button
                    key={pharmacy.id}
                    onClick={() => setSelectedId(pharmacy.id)}
                    className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 text-left hover:bg-teal-50 hover:border-teal-200 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {pharmacy.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        관리 환자 {pharmacy.patientCount}명
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
