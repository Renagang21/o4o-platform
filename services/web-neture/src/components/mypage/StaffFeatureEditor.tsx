import { useState } from 'react';

export type StaffFeature = { key: string; label: string; allowed: boolean | null };
type Props = {
  name: string;
  pending: boolean;
  features: StaffFeature[];
  selected: string[] | null;
  busy: boolean;
  onSave: (features: string[]) => void;
};

export function StaffFeatureEditor({ name, pending, features, selected, busy, onSave }: Readonly<Props>) {
  const available = features.filter(feature => feature.allowed === true);
  const [checked, setChecked] = useState(() => (selected ?? available.map(feature => feature.key))
    .filter(key => available.some(feature => feature.key === key)));
  return <fieldset disabled={busy} className="w-full space-y-3 rounded-lg border border-slate-200 p-3">
    <legend className="px-1 text-sm font-medium">{name} · 이용 기능</legend>
    <p className="text-xs text-slate-500">이 약국에서 이용 가능한 기능 중 허용할 항목을 선택하세요. 선택하지 않아도 최종 승인 후 기본 매장 업무는 이용할 수 있습니다.</p>
    {!available.length && <p className="text-sm text-slate-500">현재 추가로 허용할 서비스 기능이 없습니다.</p>}
    <div className="flex flex-wrap gap-3">{available.map(feature => <label key={feature.key} className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={checked.includes(feature.key)} onChange={event => setChecked(previous => event.target.checked ? [...previous, feature.key] : previous.filter(key => key !== feature.key))} />
      {feature.label}
    </label>)}</div>
    <button type="button" className="min-h-11 rounded border border-blue-700 px-3 py-2 text-sm text-blue-700" onClick={() => onSave(checked)}>{pending ? '최종 승인' : '이용 기능 저장'}</button>
  </fieldset>;
}
