import { Loader2, ClipboardPlus } from 'lucide-react';

// ── Types (exported for DataTab useMemo) ──

export type RecordEntryType = 'glucose' | 'blood_pressure' | 'weight' | 'meal' | 'medication' | 'exercise' | 'symptom';

export interface DisplayEntry {
  id: string;
  timestamp: Date;
  entryType: RecordEntryType;
  label: string;
}

// ── Constants ──

export const ENTRY_TYPE_CONFIG: Record<RecordEntryType, { tag: string; bg: string; text: string }> = {
  glucose: { tag: '혈당', bg: 'bg-blue-50', text: 'text-blue-600' },
  blood_pressure: { tag: '혈압', bg: 'bg-pink-50', text: 'text-pink-600' },
  weight: { tag: '체중', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  meal: { tag: '식사', bg: 'bg-orange-50', text: 'text-orange-600' },
  medication: { tag: '투약', bg: 'bg-violet-50', text: 'text-violet-600' },
  exercise: { tag: '운동', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  symptom: { tag: '증상', bg: 'bg-amber-50', text: 'text-amber-700' },
};

export const RECORD_FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'glucose', label: '혈당' },
  { value: 'meal', label: '식사' },
  { value: 'medication', label: '투약' },
  { value: 'exercise', label: '운동' },
  { value: 'symptom', label: '증상' },
  { value: 'blood_pressure', label: '혈압' },
  { value: 'weight', label: '체중' },
];

export const TYPE_GROUP_ORDER: RecordEntryType[] = ['glucose', 'meal', 'medication', 'exercise', 'symptom', 'blood_pressure', 'weight'];

// ── Helpers ──

function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const base = `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()} (${weekdays[date.getDay()]})`;
  if (isSameDay(date, today)) return `오늘 · ${base}`;
  if (isSameDay(date, yesterday)) return `어제 · ${base}`;
  return base;
}

// ── Component ──

interface RecentRecordsSectionProps {
  loadingReadings: boolean;
  viewMode: 'by_date' | 'by_type';
  setViewMode: (v: 'by_date' | 'by_type') => void;
  recordFilter: string;
  setRecordFilter: (v: string) => void;
  displayEntries: DisplayEntry[];
  dateGroups: { date: Date; entries: DisplayEntry[] }[];
  typeGroups: { type: RecordEntryType; entries: DisplayEntry[] }[];
}

export default function RecentRecordsSection({
  loadingReadings, viewMode, setViewMode, recordFilter, setRecordFilter,
  displayEntries, dateGroups, typeGroups,
}: RecentRecordsSectionProps) {
  return (
    <div>
      {/* Header + Tabs + Filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">최근 기록</h3>
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('by_date')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'by_date' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              일자별
            </button>
            <button
              type="button"
              onClick={() => setViewMode('by_type')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'by_type' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              항목별
            </button>
          </div>
        </div>
        <select
          value={recordFilter}
          onChange={(e) => setRecordFilter(e.target.value)}
          className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {RECORD_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loadingReadings ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[160px]">
          <ClipboardPlus className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">
            {recordFilter !== 'all' ? '해당 항목의 기록이 없습니다.' : '최근 기록이 없습니다.'}
          </p>
          <p className="text-xs text-slate-400 mt-1">위 양식으로 첫 데이터를 입력해 보세요.</p>
        </div>
      ) : viewMode === 'by_date' ? (
        /* ── Date view ── */
        <div className="space-y-3">
          {dateGroups.map((group) => (
            <div key={group.date.toISOString()} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-600">{getDateLabel(group.date)}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {group.entries.map((entry) => {
                  const cfg = ENTRY_TYPE_CONFIG[entry.entryType];
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs text-slate-400 w-11 flex-shrink-0 tabular-nums">
                        {entry.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${cfg.bg} ${cfg.text} flex-shrink-0`}>
                        {cfg.tag}
                      </span>
                      <span className="text-sm text-slate-700 truncate">{entry.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Type view ── */
        <div className="space-y-3">
          {typeGroups.map(({ type, entries }) => {
            const cfg = ENTRY_TYPE_CONFIG[type];
            return (
              <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className={`px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 ${cfg.bg}`}>
                  <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.tag}</span>
                  <span className="text-[10px] text-slate-400">{entries.length}건</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs text-slate-400 w-24 flex-shrink-0 tabular-nums">
                        {entry.timestamp.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}{' '}
                        {entry.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      <span className="text-sm text-slate-700 truncate">{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
