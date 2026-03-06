/**
 * HistoryTab - 환자 타임라인 (live)
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 *
 * 분석(snapshot) + 코칭(session) 이벤트를 시간축 기준으로 통합 표시.
 * 데이터: PatientDetailPage context (snapshot) + API coaching sessions
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { pharmacyApi, type CoachingSession } from '@/api/pharmacy';
import { usePatientDetail } from '../PatientDetailPage';

// ── Types ──

type EventType = 'analysis' | 'coaching';
type FilterType = 'all' | EventType;

interface TimelineEvent {
  id: string;
  type: EventType;
  date: string;
  title: string;
  description: string;
  meta?: {
    riskLevel?: string;
  };
}

// ── Constants ──

const RISK_DISPLAY = {
  high: { label: '고위험', cls: 'text-red-700 bg-red-100', Icon: AlertTriangle },
  moderate: { label: '주의', cls: 'text-amber-700 bg-amber-100', Icon: AlertCircle },
  low: { label: '양호', cls: 'text-green-700 bg-green-100', Icon: CheckCircle },
} as const;

const EVENT_STYLE = {
  analysis: { dot: 'bg-blue-500', Icon: BarChart3, label: '분석' },
  coaching: { dot: 'bg-green-500', Icon: MessageSquare, label: '코칭' },
} as const;

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'analysis', label: '분석' },
  { key: 'coaching', label: '코칭' },
];

export default function HistoryTab() {
  const { patient, snapshot } = usePatientDetail();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    setLoading(true);
    pharmacyApi.getCoachingSessions(patient.id)
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [patient?.id]);

  // Merge analysis snapshot + coaching into unified timeline
  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    // Coaching sessions → timeline events
    for (const s of sessions) {
      events.push({
        id: `c-${s.id}`,
        type: 'coaching',
        date: s.createdAt,
        title: '코칭 상담',
        description: s.summary,
      });
    }

    // Snapshot → analysis event
    if (snapshot?.createdAt) {
      const riskKey = snapshot.riskLevel in RISK_DISPLAY ? snapshot.riskLevel : 'low';
      const risk = RISK_DISPLAY[riskKey as keyof typeof RISK_DISPLAY];
      events.push({
        id: 'a1',
        type: 'analysis',
        date: snapshot.createdAt,
        title: '분석 완료',
        description: `위험도: ${risk.label}`,
        meta: { riskLevel: riskKey },
      });
    }

    // Sort by date desc
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [snapshot, sessions]);

  const filteredEvents = filter === 'all'
    ? allEvents
    : allEvents.filter(e => e.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              filter === opt.key
                ? 'bg-primary-100 text-primary-700 border-primary-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">{filteredEvents.length}건</span>
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[160px]">
          <Clock className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">해당 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[17px] top-2 bottom-2 w-px bg-slate-200" />

          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const style = EVENT_STYLE[event.type];
              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Dot */}
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    <div className={`w-[9px] h-[9px] rounded-full ${style.dot} ring-4 ring-white`} />
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <style.Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-medium text-slate-400 uppercase">{style.label}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        </div>
                        {/* Title + Description */}
                        <p className="text-sm font-medium text-slate-800">{event.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                      </div>

                      {/* Meta Badge */}
                      <div className="flex-shrink-0">
                        {event.type === 'analysis' && event.meta?.riskLevel && (
                          (() => {
                            const rk = event.meta.riskLevel as keyof typeof RISK_DISPLAY;
                            const r = RISK_DISPLAY[rk];
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${r.cls}`}>
                                <r.Icon className="w-3 h-3" />
                                {r.label}
                              </span>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
