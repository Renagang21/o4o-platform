import { Link } from 'react-router-dom';
import type { HomeEntryData } from '../../lib/home-entry';
import { HOST_ORIGIN } from '../../lib/hostProfile';

type Service = { key: string; description: string; label: string; href: string; documentNavigation?: boolean };
const groups: { title: string; services: Service[] }[] = [
  { title: '약국 협력사업 참여', services: [
    { key: 'kpa-society', description: 'O4O를 이용하는 약국의 일상 업무를 지원합니다.', label: 'O4O 약국 경영지원', href: 'https://pharmacy.neture.co.kr/' },
    { key: 'carepharm', description: 'CarePharm에서 만성질환관리 협력사업과 참여 정보를 확인합니다.', label: '만성질환관리', href: `${HOST_ORIGIN.carepharm}/` },
    { key: 'cooperative', description: '약국·약사 협동조합을 둘러보고 조합별 활동을 확인합니다.', label: '약국/약사협동조합', href: 'https://coop.neture.co.kr/' },
    { key: 'megapharm', description: '메가팜의 창고형 약국 협력사업과 참여 정보를 확인합니다.', label: '창고형 약국', href: 'https://megapharm.neture.co.kr/' },
  ] },
  { title: '약국 경영·공급 활동', services: [
    { key: 'store', description: '내 매장의 제품·콘텐츠와 운영 업무를 관리합니다.', label: '내 매장', href: 'https://store.neture.co.kr/' },
    { key: 'supplier', description: '제품을 등록하고 참여 매장에 공급합니다.', label: '공급자', href: HOST_ORIGIN.supplier },
  ] },
  { title: '커뮤니티·단체활동', services: [
    { key: 'community', description: '공개 글을 둘러보고 관심 있는 이야기를 나눕니다.', label: '커뮤니티', href: HOST_ORIGIN.community },
    { key: 'kpa-branch', description: '소속 분회의 소식과 회원 활동을 확인합니다.', label: '약사회 분회', href: 'https://kpa.neture.co.kr/' },
    { key: 'lecture', description: '공개 강의를 둘러보고 필요한 교육을 찾아보세요.', label: 'O4O 강의 · 교육·학습', href: 'https://study.neture.co.kr/' },
  ] },
  { title: '제품·유통 사업 참여', services: [
    { key: 'funding', description: '제품과 유통참여형 펀딩 소식을 확인합니다.', label: '유통참여형 펀딩', href: `${HOST_ORIGIN.funding}/` },
  ] },
  { title: '기타', services: [
    { key: 'partner', description: '준비 중인 서비스의 안내를 확인합니다.', label: 'O4O Partner', href: '/services/partner' },
    { key: 'hospital', description: '병원·약품 관련 파일을 정리하는 도구를 이용합니다.', label: '병원·약품 파일 도구', href: '/hospital', documentNavigation: true },
  ] },
];

/** 공개 탐색은 개인 업무·가입·이용 권한과 별개이며 각 서비스의 실제 진입 주소로 연결한다. */
export function discoveryServiceHasMembership(service: Service, data: HomeEntryData): boolean {
  if ((service.key === 'carepharm' || service.key === 'megapharm') && data.businesses !== undefined) return data.businesses.some(item => item.key === service.key && item.canParticipate);
  if (service.key === 'cooperative') return (data.cooperatives ?? []).length > 0;
  if (service.key === 'supplier' && data.serviceStates?.supplier?.status && data.serviceStates.supplier.status !== 'none') return true;
  if ((service.key === 'carepharm' || service.key === 'megapharm') && data.communities?.some(item => item.kind === 'semi-franchise' && item.businessKey === service.key && item.canParticipate)) return true;
  if (service.key === 'store') return (data.workspaceStores ?? data.stores).length > 0;
  return !!data.services.find(item => item.key === service.key)?.membership;
}

export default function ServiceDiscovery({ data, personalized = false }: { data?: HomeEntryData | null; personalized?: boolean }) {
  const visibleGroups = groups.map(group => ({ ...group, services: group.services.filter(service => !personalized || !data || !discoveryServiceHasMembership(service, data)) })).filter(group => group.services.length > 0);
  const card = 'flex h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left text-slate-800 no-underline transition-colors hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700';
  return <section aria-labelledby="all-services-title" className="mt-12 w-full max-w-3xl">
    <h2 id="all-services-title" className="text-xl font-semibold text-slate-900">{personalized && data ? '다른 서비스 알아보기' : '전체 서비스'}</h2>
    <p className="text-sm text-slate-500">공개 콘텐츠를 둘러보고 필요한 서비스를 찾아보세요. 가입·로그인이 필요한 기능은 각 서비스에서 안내합니다.</p>
    {visibleGroups.map(group => <nav key={group.title} aria-label={group.title} className="mt-6">
      <h3 className="mb-3 text-base font-semibold text-slate-800">{group.title}</h3>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
        {group.services.map(service => <li key={service.label}>
          {service.href.startsWith('/') && !service.documentNavigation ? <Link className={card} to={service.href}>
            <span className="font-medium">{service.label}</span><span className="text-sm leading-relaxed text-slate-600">{service.description}</span><span className="text-sm text-slate-500">{service.label === 'O4O Partner' ? '준비 중 · 서비스 알아보기' : '도구 열기 →'}</span>
          </Link> : <a className={card} href={service.href} target="_blank" rel="noopener noreferrer">
            <span className="font-medium">{service.label}</span><span className="text-sm leading-relaxed text-slate-600">{service.description}</span><span className="text-sm text-slate-500">서비스로 이동 ↗</span>
          </a>}
        </li>)}
      </ul>
    </nav>)}
  </section>;
}
