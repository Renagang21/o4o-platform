interface PlaceholderChartProps {
  type: 'glucose' | 'trend' | 'summary';
  className?: string;
}

export default function PlaceholderChart({ type, className = '' }: PlaceholderChartProps) {
  if (type === 'glucose') {
    // 혈당 그래프 placeholder
    return (
      <div className={`bg-slate-50 rounded-lg border border-slate-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500">24시간 혈당 추이</span>
          <span className="text-xs text-slate-400">mg/dL</span>
        </div>
        <svg viewBox="0 0 300 100" className="w-full h-24">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="300" y2="25" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
          <line x1="0" y1="50" x2="300" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
          <line x1="0" y1="75" x2="300" y2="75" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />

          {/* Sample glucose curve */}
          <path
            d="M0,60 Q30,45 60,50 T120,40 T180,55 T240,35 T300,50"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />

          {/* Target range area */}
          <rect x="0" y="35" width="300" height="30" fill="#22c55e" opacity="0.1" />
        </svg>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    );
  }

  if (type === 'trend') {
    // 경향 차트 placeholder
    return (
      <div className={`bg-slate-50 rounded-lg border border-slate-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500">7일 경향</span>
        </div>
        <div className="flex items-end gap-2 h-16">
          {[40, 60, 45, 70, 55, 65, 50].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-blue-200 rounded-sm"
                style={{ height: `${h}%` }}
              />
              <span className="text-xs text-slate-400">
                {['월', '화', '수', '목', '금', '토', '일'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'summary') {
    // 요약 카드 placeholder
    return (
      <div className={`bg-slate-50 rounded-lg border border-slate-200 p-4 ${className}`}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold text-slate-300">--</div>
            <div className="text-xs text-slate-400 mt-1">평균</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-300">--%</div>
            <div className="text-xs text-slate-400 mt-1">범위 내</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-300">--</div>
            <div className="text-xs text-slate-400 mt-1">변동성</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
