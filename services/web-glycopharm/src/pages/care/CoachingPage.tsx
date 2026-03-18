/**
 * CoachingPage - 코칭 관리 (cross-patient)
 * WO-O4O-GLYCOPHARM-CARE-COACHING-PAGE-V1
 *
 * 약사가 연결된 전체 환자의 코칭을 확인하고 생성/관리하는 화면.
 * API:
 *   GET  /care/coaching           → 전체 코칭 세션 목록
 *   GET  /care/coaching/:patientId → 환자별 세션
 *   POST /care/coaching           → 새 코칭 세션 생성
 *   GET  /care/coaching-drafts/:patientId → AI 초안
 *   POST /care/coaching-drafts/:id/approve → AI 초안 전송
 *   POST /care/coaching-drafts/:id/discard → AI 초안 폐기
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Calendar,
  Users,
  Plus,
  X,
  Loader2,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  pharmacyApi,
  type CoachingSessionWithPatient,
  type CoachingSession,
  type CoachingDraftDto,
  type PharmacyCustomer,
} from '@/api/pharmacy';
import CareSubNav from './CareSubNav';

export default function CoachingPage() {
  // Data state
  const [sessions, setSessions] = useState<CoachingSessionWithPatient[]>([]);
  const [patients, setPatients] = useState<PharmacyCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formPatientId, setFormPatientId] = useState('');
  const [summary, setSummary] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [saving, setSaving] = useState(false);

  // AI Draft state
  const [draft, setDraft] = useState<CoachingDraftDto | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftSending, setDraftSending] = useState(false);
  const [draftDiscarding, setDraftDiscarding] = useState(false);

  // ─── Load data ───

  const loadSessions = useCallback(async () => {
    try {
      if (selectedPatientId) {
        const data = await pharmacyApi.getCoachingSessions(selectedPatientId);
        // Per-patient response doesn't include patientName; map it from patients
        const patient = patients.find((p) => p.id === selectedPatientId);
        const mapped: CoachingSessionWithPatient[] = (
          Array.isArray(data) ? data : []
        ).map((s: CoachingSession) => ({
          ...s,
          patientName: patient?.name || '환자',
        }));
        setSessions(mapped);
      } else {
        const data = await pharmacyApi.getAllCoachingSessions();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch {
      setSessions([]);
    }
  }, [selectedPatientId, patients]);

  const loadDraft = useCallback(async () => {
    if (!selectedPatientId) {
      setDraft(null);
      setDraftMessage('');
      return;
    }
    try {
      const data = await pharmacyApi.getCoachingDraft(selectedPatientId);
      if (data && data.status === 'draft') {
        setDraft(data);
        setDraftMessage(data.draftMessage);
      } else {
        setDraft(null);
        setDraftMessage('');
      }
    } catch {
      setDraft(null);
      setDraftMessage('');
    }
  }, [selectedPatientId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [, customersRes] = await Promise.all([
        Promise.resolve(), // sessions loaded after patients
        pharmacyApi.getCustomers({ pageSize: 200 }),
      ]);
      const items = (customersRes as { data?: { items?: PharmacyCustomer[] } })?.data?.items
        || (customersRes as { items?: PharmacyCustomer[] })?.items
        || [];
      setPatients(items);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Load sessions when filter or patients change
  useEffect(() => {
    if (!loading) {
      loadSessions();
      loadDraft();
    }
  }, [selectedPatientId, loading, loadSessions, loadDraft]);

  // ─── Handlers ───

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPatientId = selectedPatientId || formPatientId;
    if (!targetPatientId || !summary || !actionPlan || saving) return;

    setSaving(true);
    try {
      await pharmacyApi.createCoachingSession({
        patientId: targetPatientId,
        summary,
        actionPlan,
      });
      setSummary('');
      setActionPlan('');
      setFormPatientId('');
      setShowForm(false);
      await loadSessions();
    } catch {
      // error silenced
    } finally {
      setSaving(false);
    }
  };

  const handleDraftApprove = async () => {
    if (!draft || draftSending) return;
    setDraftSending(true);
    try {
      await pharmacyApi.approveCoachingDraft(draft.id, {
        actionPlan: draftMessage,
      });
      await Promise.all([loadSessions(), loadDraft()]);
    } catch {
      // error silenced
    } finally {
      setDraftSending(false);
    }
  };

  const handleDraftDiscard = async () => {
    if (!draft || draftDiscarding) return;
    setDraftDiscarding(true);
    try {
      await pharmacyApi.discardCoachingDraft(draft.id);
      await loadDraft();
    } catch {
      // error silenced
    } finally {
      setDraftDiscarding(false);
    }
  };

  // ─── Derived ───

  const totalSessions = sessions.length;
  const lastSession = sessions[0];
  const lastDate = lastSession
    ? new Date(lastSession.createdAt).toLocaleDateString()
    : '-';

  // ─── Render ───

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <CareSubNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">총 코칭 횟수</p>
              <p className="text-xl font-bold text-slate-800">{totalSessions}회</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">최근 코칭일</p>
              <p className="text-xl font-bold text-slate-800">{lastDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">연결 환자 수</p>
              <p className="text-xl font-bold text-slate-800">{patients.length}명</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">코칭 기록</h3>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">전체 환자</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? '취소' : '새 코칭 기록'}
          </button>
        </div>

        {/* AI Draft Section */}
        {draft && selectedPatientId && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-blue-700">AI 코칭 초안</span>
              <span className="text-xs text-blue-500">
                ({patients.find((p) => p.id === selectedPatientId)?.name || '환자'})
              </span>
            </div>
            <textarea
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleDraftDiscard}
                disabled={draftDiscarding}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {draftDiscarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                폐기
              </button>
              <button
                onClick={handleDraftApprove}
                disabled={draftSending || !draftMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {draftSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                전송
              </button>
            </div>
          </div>
        )}

        {/* New Coaching Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-primary-50 rounded-xl border border-primary-100 p-5 space-y-4">
            {!selectedPatientId && (
              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">환자 선택</label>
                <select
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">환자를 선택하세요</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-600 font-medium mb-1">상담 요약</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="오늘 상담한 내용을 요약해 주세요..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 font-medium mb-1">실행 계획</label>
              <textarea
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="환자에게 권장할 행동 계획을 작성해 주세요..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || !summary || !actionPlan || (!selectedPatientId && !formPatientId)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                저장
              </button>
            </div>
          </form>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : sessions.length === 0 ? (
          /* Empty state */
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[160px]">
            <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">아직 코칭 기록이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">위 버튼으로 첫 코칭을 기록해 보세요.</p>
          </div>
        ) : (
          /* Session list */
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary-500" />
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-full">
                      {session.patientName || '환자'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-800 mb-1">{session.summary}</p>
                <p className="text-xs text-slate-500">{session.actionPlan}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
