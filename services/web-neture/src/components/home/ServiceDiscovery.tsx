import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HOST_ORIGIN } from '../../lib/hostProfile';

type Service = { label: string; href: string; preparing?: never } | { label: string; preparing: true; href?: never };
const groups: { title: string; services: Service[] }[] = [
  { title: '약국 협력사업 참여', services: [
    { label: 'O4O 약국 경영지원', href: 'https://pharmacy.neture.co.kr/' },
    { label: '만성질환관리', preparing: true },
    { label: '약국/약사협동조합', preparing: true },
    { label: '창고형 약국', preparing: true },
  ] },
  { title: '약국 경영·공급 활동', services: [
    { label: '내 매장', href: 'https://store.neture.co.kr/' },
    { label: '공급자', href: HOST_ORIGIN.supplier },
  ] },
  { title: '커뮤니티·단체활동', services: [
    { label: '커뮤니티', href: HOST_ORIGIN.community },
    { label: '약사회 분회', href: 'https://kpa.neture.co.kr/' },
    { label: 'O4O 강의 · 교육·학습', href: 'https://study.neture.co.kr/' },
  ] },
  { title: '제품·유통 사업 참여', services: [
    { label: '유통참여형 펀딩', href: `${HOST_ORIGIN.funding}/` },
  ] },
  { title: '기타', services: [
    { label: 'O4O Partner', href: '/services/partner' },
    { label: '병원·약품 파일 도구', href: '/hospital' },
  ] },
];

/** 공개 탐색은 개인 업무·가입·이용 권한과 별개다. 준비 중 항목은 안내만 제공한다. */
export default function ServiceDiscovery() {
  const [selected, setSelected] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);
  const card = 'flex h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left text-slate-800 no-underline transition-colors hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700';
  return <section aria-labelledby="all-services-title" className="mt-12 w-full max-w-3xl">
    <h2 id="all-services-title" className="text-xl font-semibold text-slate-900">전체 서비스</h2>
    <p className="text-sm text-slate-500">필요한 활동을 찾아보세요. 서비스별 이용 자격은 진입 후 확인합니다.</p>
    {groups.map(group => <nav key={group.title} aria-label={group.title} className="mt-6">
      <h3 className="mb-3 text-base font-semibold text-slate-800">{group.title}</h3>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
        {group.services.map(service => <li key={service.label}>
          {service.preparing ? <button type="button" className={card} aria-haspopup="dialog" onClick={event => { trigger.current = event.currentTarget; setSelected(service.label); }}>
            <span className="font-medium">{service.label}</span><span className="text-sm text-slate-500">준비 중 · 안내 보기</span>
          </button> : service.href.startsWith('/') ? <Link className={card} to={service.href}>
            <span className="font-medium">{service.label}</span><span className="text-sm text-slate-500">{service.label === 'O4O Partner' ? '준비 중 · 서비스 알아보기' : '도구 열기 →'}</span>
          </Link> : <a className={card} href={service.href} target="_blank" rel="noopener noreferrer">
            <span className="font-medium">{service.label}</span><span className="text-sm text-slate-500">서비스로 이동 ↗</span>
          </a>}
        </li>)}
      </ul>
    </nav>)}
    <dialog ref={dialog} aria-labelledby="preparing-title" aria-describedby="preparing-description" className="w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border-0 p-6 shadow-xl backdrop:bg-slate-900/40" onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); dialog.current?.querySelector('button')?.focus(); } }} onClose={() => { setSelected(null); trigger.current?.focus(); }}>
      <h2 id="preparing-title" className="text-lg font-semibold">{selected}</h2>
      <p id="preparing-description" className="my-4 text-slate-600">준비 중입니다.</p>
      <button type="button" autoFocus onClick={() => dialog.current?.close()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">닫기</button>
    </dialog>
  </section>;
}
