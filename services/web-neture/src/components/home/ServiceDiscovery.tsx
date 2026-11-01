import { O4O_SERVICE_DIRECTORY } from '@o4o/auth-react';
import { Link } from 'react-router-dom';
import type { HomeEntryData } from '../../lib/home-entry';

type Service = { key: string; description: string; label: string; href: string; documentNavigation?: boolean };
const groups = [...new Set(O4O_SERVICE_DIRECTORY.map(item => item.category))].map(title => ({
  title,
  publicOnly: O4O_SERVICE_DIRECTORY.filter(item => item.category === title).every(item => item.publicOnly),
  services: O4O_SERVICE_DIRECTORY.filter(item => item.category === title).map(item => ({
    ...item,
    href: item.href.startsWith('https://neture.co.kr/') ? item.href.slice('https://neture.co.kr'.length) : item.href,
  })),
}));

/** 공개 탐색은 개인 업무·가입·이용 권한과 별개이며 각 서비스의 실제 진입 주소로 연결한다. */
export function discoveryServiceHasMembership(service: Service, data: HomeEntryData): boolean {
  const businessKey = service.key === 'kpa-society' ? 'pharmacy' : service.key;
  if (['pharmacy', 'carepharm', 'drugstore'].includes(businessKey) && data.businesses !== undefined) {
    const business = data.businesses.find(item => item.key === businessKey);
    // 사업 원장에 상태가 있으면 서비스 카탈로그나 커뮤니티로 덮어쓰지 않는다.
    if (business) return !!(business.canParticipate || business.membershipStatus);
    if (businessKey !== 'pharmacy') return false;
  }
  if (service.key === 'cooperative') return (data.cooperatives ?? []).length > 0;
  if (service.key === 'supplier' && data.serviceStates?.supplier?.status && data.serviceStates.supplier.status !== 'none') return true;
  if ((service.key === 'carepharm' || service.key === 'drugstore') && data.communities?.some(item => item.kind === 'semi-franchise' && item.businessKey === service.key && item.canParticipate)) return true;
  if (service.key === 'store') return (data.workspaceStores ?? data.stores).length > 0;
  return !!data.services.find(item => item.key === service.key)?.membership;
}

export default function ServiceDiscovery({ data, personalized = false }: { data?: HomeEntryData | null; personalized?: boolean }) {
  const hasPersonalData = personalized && !!data;
  const visibleGroups = groups.map(group => ({ ...group, services: group.services.filter(service => !personalized || !data || !discoveryServiceHasMembership(service, data)) })).filter(group => group.services.length > 0);
  const card = 'flex h-full min-w-0 w-full flex-col gap-2 break-words rounded-xl border border-slate-200 bg-white p-3 text-left text-slate-800 no-underline transition-colors hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700';
  const membershipGroups = visibleGroups.filter(group => !hasPersonalData || !group.publicOnly);
  const publicGroups = hasPersonalData ? visibleGroups.filter(group => group.publicOnly) : [];
  const renderCards = (services: Service[]) => <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 lg:grid-cols-4">
        {services.map(service => <li key={service.key} className="min-w-0">
          {service.href.startsWith('/') && !service.documentNavigation ? <Link className={card} to={service.href}>
            <span className="font-medium">{service.label}</span><span className="text-sm leading-relaxed text-slate-600">{service.description}</span><span className="text-sm text-slate-500">{service.label === 'O4O Partner' ? '준비 중 · 서비스 알아보기' : '도구 열기 →'}</span>
          </Link> : <a className={card} href={service.href} target="_blank" rel="noopener noreferrer">
            <span className="font-medium">{service.label}</span><span className="text-sm leading-relaxed text-slate-600">{service.description}</span><span className="text-sm text-slate-500">서비스로 이동 ↗</span>
          </a>}
        </li>)}
      </ul>;
  const renderGroups = (items: typeof groups) => items.map(group => <nav key={group.title} aria-label={group.title} className="mt-6">
      <h3 className="mb-3 text-base font-semibold text-slate-800">{group.title}</h3>
      {renderCards(group.services)}
    </nav>);
  return <>
  {membershipGroups.length > 0 && <section aria-labelledby="all-services-title" className="mt-12 w-full max-w-5xl">
    <h2 id="all-services-title" className="text-xl font-semibold text-slate-900">{hasPersonalData ? '다른 서비스 알아보기' : '전체 서비스'}</h2>
    <p className="text-sm text-slate-500">{hasPersonalData ? '아직 가입·신청하지 않은 서비스입니다. 서비스 소개를 살펴보고 참여할 수 있습니다.' : '공개 콘텐츠를 둘러보고 필요한 서비스를 찾아보세요. 가입·로그인이 필요한 기능은 각 서비스에서 안내합니다.'}</p>
    {hasPersonalData ? <nav aria-label="가입하지 않은 서비스" className="mt-6">{renderCards(membershipGroups.flatMap(group => group.services))}</nav> : renderGroups(membershipGroups)}
  </section>}
  {publicGroups.length > 0 && <section aria-labelledby="public-tools-title" className="mt-12 w-full max-w-5xl">
    <h2 id="public-tools-title" className="text-xl font-semibold text-slate-900">공개 도구·준비 중 서비스</h2>
    <p className="text-sm text-slate-500">서비스 가입 목록과 별도로 제공하는 도구와 준비 중인 서비스입니다.</p>
    {renderGroups(publicGroups)}
  </section>}
  </>;
}
