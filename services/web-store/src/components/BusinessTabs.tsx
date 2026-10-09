import type { SemiFranchiseRow } from '../api/neturePharmacy';

export function BusinessTabs({ businesses, value, onChange }: Readonly<{
  businesses: Pick<SemiFranchiseRow, 'key' | 'name'>[];
  value: string;
  onChange: (key: string) => void;
}>) {
  return <nav aria-label="사업별 보기" className="mb-4 flex flex-wrap gap-2">
    {[{ key: '', name: '전체' }, ...businesses].map(b =>
      <button type="button" key={b.key} aria-pressed={value === b.key} onClick={() => onChange(b.key)}
        className={`rounded-lg border px-3 py-2 text-sm ${value === b.key ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'}`}>
        {b.name}
      </button>
    )}
  </nav>;
}
