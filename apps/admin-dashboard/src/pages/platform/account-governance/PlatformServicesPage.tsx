import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { platformAdminApi, type PlatformDirectoryEntry } from '@/api/platform-governance';

const GROUPS = [
  { id: 'services', name: '현재 서비스', description: '각 서비스의 운영자가 회원·신청·업무를 관리합니다.' },
  { id: 'spaces', name: '대표·공통 업무 공간', description: '서비스 탐색, 내 매장 업무, 플랫폼 전체 관리를 위한 공간입니다.' },
  { id: 'other', name: '연동·도구·준비 중', description: '기존 연결 경로와 준비 중인 서비스 안내입니다.' },
] as const;

const STATUS_META: Record<PlatformDirectoryEntry['state'], { label: string; cls: string }> = {
  configured: { label: '주소 등록', cls: 'bg-slate-100 text-slate-600' },
  active: { label: '사업 운영', cls: 'bg-emerald-50 text-emerald-700' },
  closed: { label: '사업 종료', cls: 'bg-slate-100 text-slate-600' },
  missing: { label: '사업 미등록', cls: 'bg-amber-50 text-amber-800' },
  unverified: { label: '상태 확인 필요', cls: 'bg-amber-50 text-amber-800' },
  federation: { label: '연합회', cls: 'bg-blue-50 text-blue-700' },
  planned: { label: '준비 중', cls: 'bg-amber-50 text-amber-800' },
};

export default function PlatformServicesPage() {
  const [services, setServices] = useState<PlatformDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setServices(await platformAdminApi.getServiceDirectory());
    } catch (err) {
      setServices([]);
      setError(err instanceof Error ? err.message : '서비스 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const term = search.trim().toLocaleLowerCase();
  const visible = services.filter(service => (group === 'all' || service.group === group)
    && `${service.name} ${service.url}`.toLocaleLowerCase().includes(term));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-900">플랫폼 서비스 관리</h1>
      <p className="text-sm text-slate-600">현재 서비스 주소와 업무 범위를 확인합니다. 회원 관리와 신청·승인은 각 서비스에서 처리합니다.</p>
      <div className="my-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
          <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input aria-label="서비스명 또는 주소 검색" value={search} onChange={event => setSearch(event.target.value)} placeholder="서비스명 또는 주소 검색"
            className="w-full min-w-0 bg-transparent py-2.5 text-sm outline-none" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <label htmlFor="directory-group">구분</label>
          <select id="directory-group" value={group} onChange={event => setGroup(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2.5">
            <option value="all">전체</option>
            {GROUPS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>
      <p className="mb-5 text-xs leading-relaxed text-slate-500">
        사업 운영·종료·미등록은 사업 등록 원장 기준입니다. 주소 등록은 접속 상태나 가입 가능 여부를 뜻하지 않습니다.
      </p>
      {error ? (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p>{error}</p>
          <button onClick={() => void load()} className="mt-3 rounded border border-rose-300 px-3 py-2 font-medium">다시 불러오기</button>
        </div>
      ) : loading ? (
        <div role="status" className="py-12 text-center text-sm text-slate-500">현재 서비스 목록을 불러오는 중입니다.</div>
      ) : services.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">현재 서비스 목록이 없습니다.</p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">검색 조건에 맞는 서비스가 없습니다.</p>
      ) : GROUPS.map(item => {
        const entries = visible.filter(service => service.group === item.id);
        if (entries.length === 0) return null;
        return <section key={item.id} aria-labelledby={`directory-${item.id}`} className="mb-8">
          <h2 id={`directory-${item.id}`} className="text-base font-semibold text-slate-900">{item.name} <span className="text-sm font-normal text-slate-500">{entries.length}</span></h2>
          <p className="mb-3 mt-1 text-xs text-slate-500">{item.description}</p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {entries.map(service => {
              const meta = STATUS_META[service.state] ?? STATUS_META.unverified;
              return <li key={service.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words font-semibold text-slate-800">{service.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{service.kind}</p>
                <p className="my-3 text-sm leading-relaxed text-slate-600">{service.description}</p>
                <a href={service.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-1 text-sm text-blue-700 underline underline-offset-2">
                  <span className="min-w-0 break-all">{service.url.replace(/^https:\/\//, '').replace(/\/$/, '')}</span>
                  <ExternalLink size={14} className="mt-1 shrink-0" aria-hidden="true" />
                  <span className="sr-only"> (새 창)</span>
                </a>
              </li>;
            })}
          </ul>
        </section>;
      })}
    </div>
  );
}
