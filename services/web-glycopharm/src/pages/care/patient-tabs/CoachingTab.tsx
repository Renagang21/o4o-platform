/**
 * CoachingTab - 코칭 관리 (live)
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 *
 * API:
 *   GET  /api/v1/care/coaching/:patientId → 세션 목록
 *   POST /api/v1/care/coaching → 새 코칭 세션 생성
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Calendar,
  Plus,
  X,
  Loader2,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { pharmacyApi, type CoachingSession, type CoachingDraftDto } from '@/api/pharmacy';
import { usePatientDetail } from '../PatientDetailPage';

export default function CoachingTab() {
  const { patient, reload } = usePatientDetail();

  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [summary, setSummary] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  // AI Draft state (WO-O4O-CARE-AI-COACHING-DRAFT-V1)
  const [draft, setDraft] = useState<CoachingDraftDto | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftSending, setDraftSending] = useState(false);
  const [draftDiscarding, setDraftDiscarding] = useState(false);

  const loadData = useCallback(async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const [sessionsData, draftData] = await Promise.all([
        pharmacyApi.getCoachingSessions(patient.id),
        pharmacyApi.getCoachingDraft(patient.id).catch(() => null),
      ]);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      if (draftData && draftData.status === 'draft') {
        setDraft(draftData);
        setDraftMessage(draftData.draftMessage);
      } else {
        setDraft(null);
        setDraftMessage('');
      }
    } catch {
      setSessions([]);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.id || !summary || !actionPlan || saving) return;

    setSaving(true);
    try {
      await pharmacyApi.createCoachingSession({
        patientId: patient.id,
        summary,
        actionPlan,
      });
      setSummary('');
      setActionPlan('');
      setShowForm(false);
      await loadData();
      reload();
    } catch {
      // error silenced
    } finally {
      setSaving(false);
    }
  };

  // WO-O4O-CARE-AI-COACHING-DRAFT-V1
  const handleDraftApprove = async () => {
    if (!draft || draftSending) return;
    setDraftSending(true);
    try {
      await pharmacyApi.approveCoachingDraft(draft.id, {
        actionPlan: draftMessage,
      });
      await loadData();
      reload();
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
      await loadData();
    } catch {
      // error silenced
    } finally {
      setDraftDiscarding(false);
    }
  };

  const totalSessions = sessions.length;
  const lastSession = sessions[0];
  const lastDate = lastSession
    ? new Date(lastSession.createdAt).toLocaleDateString()
    : '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coaching Summary Block */}
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
            <MessageSquare className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">최근 요약</p>
            <p className="text-sm text-slate-700 truncate max-w-[200px]">
              {lastSession?.summary || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Coaching Draft — WO-O4O-CARE-AI-COACHING-DRAFT-V1 */}
      {draft && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-blue-700">AI 코칭 초안</span>
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

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">코칭 기록</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? '취소' : '새 코칭 기록'}
        </button>
      </div>

      {/* New Coaching Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-primary-50 rounded-xl border border-primary-100 p-5 space-y-4">
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
              placeholder="당뇨인에게 권장할 행동 계획을 작성해 주세요..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !summary || !actionPlan}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              저장
            </button>
          </div>
        </form>
      )}

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[160px]">
          <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">아직 코칭 기록이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">위 버튼으로 첫 코칭을 기록해 보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary-500" />
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
  );
}
