/**
 * HistoryTab - 환자 타임라인 포털
 * WO-CARE-HISTORY-INTEGRATION-V1
 *
 * 분석(snapshot) + 코칭(session) 이벤트를 시간축 기준으로 통합 표시.
 * 데이터: PatientDetailPage context (snapshot) + local mock coaching
 */

import { useState, useMemo } from 'react';
import {
  BarChart3,
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
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
    status?: string;
  };
}

// ── Constants ──

const RISK_DISPLAY = {
  high: { label: '고위험', cls: 'text-red-700 bg-red-100', Icon: AlertTriangle },
  moderate: { label: '주의', cls: 'text-amber-700 bg-amber-100', Icon: AlertCircle },
  low: { label: '양호', cls: 'text-green-700 bg-green-100', Icon: CheckCircle },
} as const;

const COACHING_STATUS = {
  completed: { label: '완료', cls: 'text-green-700 bg-green-100' },
  in_progress: { label: '진행중', cls: 'text-blue-700 bg-blue-100' },
  on_hold: { label: '보류', cls: 'text-slate-600 bg-slate-100' },
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

// ── Mock coaching data (CoachingTab과 동일 구조) ──

const MOCK_COACHING_EVENTS: TimelineEvent[] = [
  {
    id: 'c1',
    type: 'coaching',
    date: '2026-02-18',
    title: '대면 상담',
    description: '식후 혈당 관리 방법 안내, 저녁 식단 조정 권유',
    meta: { status: 'completed' },
  },
  {
    id: 'c2',
    type: 'coaching',
    date: '2026-02-12',
    title: '전화 상담',
    description: '복약 순응도 확인, 인슐린 투여 시간 조정 논의',
    meta: { status: 'completed' },
  },
  {
    id: 'c3',
    type: 'coaching',
    date: '2026-02-05',
    title: '메시지',
    description: '운동 프로그램 안내 자료 전달',
    meta: { status: 'completed' },
  },
];

export default function HistoryTab() {
  const { snapshot } = usePatientDetail();
  const [filter, setFilter] = useState<FilterType>('all');

  // Merge analysis snapshot + coaching into unified timeline
  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [...MOCK_COACHING_EVENTS];

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
  }, [snapshot]);

  const filteredEvents = filter === 'all'
    ? allEvents
    : allEvents.filter(e => e.type === filter);

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
                        {event.type === 'coaching' && event.meta?.status && (
                          (() => {
                            const sk = event.meta.status as keyof typeof COACHING_STATUS;
                            const s = COACHING_STATUS[sk];
                            return s ? (
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${s.cls}`}>
                                {s.label}
                              </span>
                            ) : null;
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
