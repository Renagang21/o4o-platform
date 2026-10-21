import { BusinessTabs } from '../../components/BusinessTabs';
import type { useStoreBusinesses } from './useStoreBusinesses';
import type { SemiFranchiseRow } from '../../api/neturePharmacy';

export function storeBusinessName(rows: ReadonlyArray<Pick<SemiFranchiseRow, 'key' | 'name'>>, key: string): string {
  return rows.find(row => row.key === key)?.name ?? (key === '__public__' ? '일반 공개 모집' : '선택한 협업체');
}

export function StoreBusinessTabs({ businesses, value, onChange, history = false, publicSource = false }: Readonly<{
  businesses: ReturnType<typeof useStoreBusinesses>; value: string; onChange: (key: string) => void;
  history?: boolean; publicSource?: boolean;
}>) {
  const rows = history ? businesses.rows.filter(row => row.membershipStatus != null) : businesses.joined;
  const choices = rows.map(row => ({ key: row.key, name: row.name }));
  if (publicSource) choices.push({ key: '__public__', name: '일반 공개 모집' });
  if (value && !choices.some(row => row.key === value)) choices.push({ key: value, name: storeBusinessName(businesses.rows, value) });
  return <section aria-label="협업체 선택" className="mb-4">
    <BusinessTabs businesses={choices} value={value} onChange={onChange} />
    {businesses.loading && <output className="block text-sm text-slate-500">가입한 협업체를 확인하고 있습니다…</output>}
    {businesses.error && <div role="alert" className="text-sm text-red-700">가입한 협업체를 확인하지 못했습니다. <button type="button" className="min-h-11 underline" onClick={businesses.reload}>협업체 다시 확인</button></div>}
    {!businesses.loading && !businesses.error && !businesses.joined.length && <p className="text-sm text-slate-500">현재 선택한 약국에 가입 승인된 협업체가 없습니다. 가입 상태는 이용 사업에서 확인하세요.</p>}
  </section>;
}
