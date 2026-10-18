import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPharmacyManagementClient } from './api';
import { ServiceFeatureSelector } from './ServiceFeatureSelector';

type Target = { key: string; name: string; features: string[]; status?: string };
type Policy = { features: Array<{ key: string; label: string }>; targets: Target[] };
const base = '/neture/admin/service-feature-policies';

export default function AdminPharmacyServiceSettingsPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [target, setTarget] = useState('default');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    setPolicy(null); setError(''); setNotice(''); setSelected([]);
    getPharmacyManagementClient().get(base).then(response => {
      if (cancelled) return;
      const data: Policy = response.data.data;
      if (!response.data.success || !Array.isArray(data?.features) || !Array.isArray(data?.targets) ||
        !data.targets.length || data.targets.some(item => !Array.isArray(item.features) ||
          item.features.some(key => !data.features.some(feature => feature.key === key)))) throw new Error('Invalid policy');
      setPolicy(data); setTarget(data.targets[0].key); setSelected(data.targets[0].features);
    }).catch(() => { if (!cancelled) setError('제공 설정을 불러오지 못했습니다. 다시 시도해 주세요.'); });
    return () => { cancelled = true; };
  }, [retry]);
  const current = policy?.targets.find(item => item.key === target);
  const save = async () => {
    if (!policy || !current || busy) return;
    const capturedTarget = target;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await getPharmacyManagementClient().put(`${base}/${encodeURIComponent(capturedTarget)}`, { features: selected });
      if (!response.data.success) throw new Error('Save failed');
      if (!alive.current) return;
      setPolicy(previous => previous && ({ ...previous, targets: previous.targets.map(item => item.key === capturedTarget ? { ...item, features: selected } : item) }));
      setNotice('제공 기능을 저장했습니다. 다음 이용 자격 확인부터 적용됩니다.');
    } catch { if (alive.current) setError('저장하지 못했습니다. 다시 시도해 주세요.'); }
    finally { if (alive.current) setBusy(false); }
  };
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
    <h1 className="text-2xl font-bold text-gray-900">약국 서비스 설정</h1>
    <p className="text-sm text-gray-600">대상을 선택하고 제공할 기능을 지정합니다. 기본·유료·가입 협력사업의 기능은 합산하며 중복 제공은 한 번만 적용합니다.</p>
    <Link className="inline-block text-blue-700 underline" to="/admin/semi-franchises">약국 협력사업 등록·관리</Link>
    {error && <p role="alert" className="text-red-700">{error} {!policy && <button type="button" disabled={busy} className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>다시 시도</button>}</p>}
    {notice && <p role="status" className="text-blue-700">{notice}</p>}
    {!policy && !error && <p role="status">제공 설정을 확인하는 중…</p>}
    {policy && <form className="space-y-4 rounded-lg border border-gray-200 bg-white p-4" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label className="block space-y-2"><span className="font-medium">설정 대상</span>
        <select className="block w-full rounded border border-gray-300 p-2" value={target} disabled={busy} onChange={event => {
          const item = policy.targets.find(value => value.key === event.target.value);
          if (!item) return;
          setTarget(item.key); setSelected(item.features); setError(''); setNotice('');
        }}>{policy.targets.map(item => <option key={item.key} value={item.key}>{item.name}{item.status === 'closed' ? ' · 마감' : ''}</option>)}</select>
      </label>
      {current?.status === 'closed' && <p className="text-sm text-amber-800">마감된 사업입니다. 저장한 기능은 사업이 활성 상태일 때만 제공됩니다.</p>}
      <ServiceFeatureSelector features={policy.features} selected={selected} disabled={busy} onChange={setSelected}
        description="이 대상이 제공할 기능을 선택하세요. 체크를 해제해도 다른 자격으로 제공받는 기능은 유지됩니다." />
      <p className="text-sm text-gray-600">유료 여부는 경영자 회원 기준입니다. 직원의 기능 허용은 경영자가 My Home에서 관리합니다.</p>
      <button type="submit" disabled={busy} className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{busy ? '저장 중…' : '저장'}</button>
    </form>}
  </main>;
}
