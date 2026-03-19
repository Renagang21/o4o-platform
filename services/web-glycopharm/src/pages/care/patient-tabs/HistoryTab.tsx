/**
 * HistoryTab - 당뇨인 타임라인 (통합)
 * WO-GLYCOPHARM-CARE-CONTROL-TOWER-V1 Phase 3
 *
 * 4가지 이벤트를 시간축으로 통합 표시:
 *   health_reading | analysis | coaching | alert
 *
 * 데이터: pharmacyApi.getPatientTimeline(patientId) — backend UNION ALL
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
  Heart,
  Bell,
} from 'lucide-react';
import { pharmacyApi, type TimelineEventDto } from '@/api/pharmacy';
import { usePatientDetail } from '../PatientDetailPage';

// ── Types ──

type EventType = TimelineEventDto['type'];
type FilterType = 'all' | EventType;

// ── Constants ──

const RISK_DISPLAY = {
  high: { label: '고위험', cls: 'text-red-700 bg-red-100', Icon: AlertTriangle },
  moderate: { label: '주의', cls: 'text-amber-700 bg-amber-100', Icon: AlertCircle },
  low: { label: '양호', cls: 'text-green-700 bg-green-100', Icon: CheckCircle },
} as const;

const EVENT_STYLE: Record<EventType, { dot: string; Icon: typeof BarChart3; label: string }> = {
  health_reading: { dot: 'bg-purple-500', Icon: Heart, label: '건강데이터' },
  analysis: { dot: 'bg-blue-500', Icon: BarChart3, label: '분석' },
  coaching: { dot: 'bg-green-500', Icon: MessageSquare, label: '코칭' },
  alert: { dot: 'bg-red-500', Icon: Bell, label: '알림' },
};

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'health_reading', label: '건강데이터' },
  { key: 'analysis', label: '분석' },
  { key: 'coaching', label: '코칭' },
  { key: 'alert', label: '알림' },
];

const SEVERITY_STYLE = {
  critical: 'text-red-700 bg-red-100',
  warning: 'text-amber-700 bg-amber-100',
  info: 'text-blue-700 bg-blue-100',
} as const;

export default function HistoryTab() {
  const { patient } = usePatientDetail();
  const [filter, setFilter] = useState<FilterType>('all');
  const [events, setEvents] = useState<TimelineEventDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    setLoading(true);
    pharmacyApi.getPatientTimeline(patient.id)
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [patient?.id]);

  const filteredEvents = useMemo(
    () => filter === 'all' ? events : events.filter(e => e.type === filter),
    [events, filter],
  );

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
      <div className="flex items-center gap-2 flex-wrap">
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
                <div key={`${event.type}-${event.id}`} className="relative flex gap-4">
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
                            {new Date(event.eventAt).toLocaleDateString()}
                          </span>
                        </div>
                        {/* Content by type */}
                        <EventContent event={event} />
                      </div>

                      {/* Meta Badge */}
                      <div className="flex-shrink-0">
                        <EventBadge event={event} />
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

function EventContent({ event }: { event: TimelineEventDto }) {
  const p = event.payload;

  switch (event.type) {
    case 'health_reading': {
      const parts: string[] = [];
      if (p.fasting != null) parts.push(`공복 ${p.fasting}`);
      if (p.postMeal != null) parts.push(`식후 ${p.postMeal}`);
      if (p.systolic != null && p.diastolic != null) parts.push(`BP ${p.systolic}/${p.diastolic}`);
      if (p.weight != null) parts.push(`체중 ${p.weight}kg`);
      return (
        <>
          <p className="text-sm font-medium text-slate-800">건강 데이터 입력</p>
          <p className="text-xs text-slate-500 mt-0.5">{parts.join(' · ') || '데이터 기록'}</p>
        </>
      );
    }
    case 'analysis': {
      const riskKey = (p.riskLevel as string) in RISK_DISPLAY
        ? (p.riskLevel as keyof typeof RISK_DISPLAY)
        : 'low';
      const risk = RISK_DISPLAY[riskKey];
      return (
        <>
          <p className="text-sm font-medium text-slate-800">분석 완료</p>
          <p className="text-xs text-slate-500 mt-0.5">
            위험도: {risk.label} · TIR {String(p.tir ?? '-')}% · CV {String(p.cv ?? '-')}%
          </p>
        </>
      );
    }
    case 'coaching':
      return (
        <>
          <p className="text-sm font-medium text-slate-800">코칭 상담</p>
          <p className="text-xs text-slate-500 mt-0.5">{(p.summary as string) || '상담 기록'}</p>
        </>
      );
    case 'alert':
      return (
        <>
          <p className="text-sm font-medium text-slate-800">{(p.message as string) || '알림'}</p>
          <p className="text-xs text-slate-500 mt-0.5">유형: {p.alertType as string}</p>
        </>
      );
  }
}

function EventBadge({ event }: { event: TimelineEventDto }) {
  const p = event.payload;

  if (event.type === 'analysis' && p.riskLevel) {
    const rk = p.riskLevel as string;
    if (rk in RISK_DISPLAY) {
      const r = RISK_DISPLAY[rk as keyof typeof RISK_DISPLAY];
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${r.cls}`}>
          <r.Icon className="w-3 h-3" />
          {r.label}
        </span>
      );
    }
  }

  if (event.type === 'alert' && p.severity) {
    const sev = p.severity as string;
    const sevCls = SEVERITY_STYLE[sev as keyof typeof SEVERITY_STYLE] ?? SEVERITY_STYLE.info;
    const sevLabel = sev === 'critical' ? '긴급' : sev === 'warning' ? '경고' : '정보';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${sevCls}`}>
        {sevLabel}
      </span>
    );
  }

  return null;
}
