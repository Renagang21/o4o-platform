import { useState } from 'react';
export function OwnerPharmacistConfirmation({ confirmed, busy, onSave }: Readonly<{
  confirmed: boolean; busy: boolean; onSave: (confirmed: boolean) => void;
}>) {
  const [checked, setChecked] = useState(confirmed);
  return <fieldset disabled={busy} className="w-full space-y-3 rounded-lg border border-slate-200 p-3">
    <legend className="px-1 text-sm font-medium">본인 약사 상담 사용 확인</legend>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />본인은 약사이며 약사 상담 기능을 사용합니다.</label>
    <p className="text-xs text-slate-500">이 약국의 상담 사용 확인입니다. 공식 면허 검증을 의미하지 않습니다.</p>
    <button type="button" className="min-h-11 rounded border border-blue-700 px-3 py-2 text-sm text-blue-700" onClick={() => onSave(checked)}>본인 확인 저장</button>
  </fieldset>;
}
