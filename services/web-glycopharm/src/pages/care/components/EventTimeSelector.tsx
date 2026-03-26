import { Clock } from 'lucide-react';

interface EventTimeSelectorProps {
  measuredAt: string;
  setMeasuredAt: (v: string) => void;
  timeEditOpen: boolean;
  setTimeEditOpen: (v: boolean) => void;
  resetMeasuredAtToNow: () => void;
  formatMeasuredTime: () => string;
}

export default function EventTimeSelector({
  measuredAt, setMeasuredAt, timeEditOpen, setTimeEditOpen, resetMeasuredAtToNow, formatMeasuredTime,
}: EventTimeSelectorProps) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">측정 일시</label>
      {timeEditOpen ? (
        <div className="space-y-1.5">
          <input
            type="datetime-local"
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { resetMeasuredAtToNow(); setTimeEditOpen(false); }}
              className="text-xs text-slate-500 hover:text-primary-600 transition-colors"
            >
              지금으로
            </button>
            <button
              type="button"
              onClick={() => setTimeEditOpen(false)}
              className="text-xs text-primary-600 font-medium hover:underline"
            >
              확인
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setTimeEditOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors text-left"
        >
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-700">{formatMeasuredTime()}</span>
          <span className="text-xs text-primary-500 ml-auto flex-shrink-0">수정</span>
        </button>
      )}
    </div>
  );
}
