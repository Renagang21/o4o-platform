export function ToggleButton({ selected, onClick, children }: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        selected
          ? 'bg-blue-50 border-blue-300 text-blue-700'
          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  violet: 'bg-violet-50 border-violet-300 text-violet-700',
  amber: 'bg-amber-50 border-amber-300 text-amber-700',
  orange: 'bg-orange-50 border-orange-300 text-orange-700',
};

export function ToggleButtonColored({ selected, onClick, children, color }: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color: 'emerald' | 'violet' | 'amber' | 'orange';
}) {
  const cls = selected
    ? COLOR_MAP[color]
    : 'border-slate-200 text-slate-500 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}
