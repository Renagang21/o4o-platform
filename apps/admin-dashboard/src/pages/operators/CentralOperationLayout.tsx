import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Home, Menu, X } from 'lucide-react';
import type { CentralOperationMenu } from '@o4o/types';
import { OperatorDialog } from '@o4o/operator-core-ui/operation-support';
import { centralGroups, centralMenuGroup, centralMenuHref, centralMenuIsActive } from './central-operation-groups';

export default function CentralOperationLayout({services, menus, header, children}: {
  services: readonly (readonly [string,string])[]; menus: readonly CentralOperationMenu[]; header: ReactNode; children: ReactNode;
}) {
  const {pathname} = useLocation();
  const active = menus.find(menu => centralMenuIsActive(menu, pathname));
  const activeService = active?.service;
  const activeGroup = active ? `${active.service}:${centralMenuGroup(active)}` : '';
  const [openServices,setOpenServices] = useState<string[]>(activeService ? [activeService] : []);
  const [openGroups,setOpenGroups] = useState<string[]>(activeGroup ? [activeGroup] : []);
  const [mobileOpen,setMobileOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (activeService) setOpenServices([activeService]);
    if (activeGroup) setOpenGroups([activeGroup]);
    setMobileOpen(false);
  }, [pathname,activeService,activeGroup]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const query = window.matchMedia?.('(min-width: 1024px)');
    const resize = () => { if (query?.matches) setMobileOpen(false); };
    query?.addEventListener('change',resize);
    return () => { document.body.style.overflow = previous; query?.removeEventListener('change',resize); };
  },[mobileOpen]);
  const toggle = (values: string[], key: string) => values.includes(key) ? values.filter(value => value !== key) : [...values,key];
  const nav = (prefix: string) => <nav aria-label="통합 운영 메뉴" className="space-y-1">
    <Link to="/operations" aria-current={pathname === '/operations' ? 'page' : undefined} onClick={() => setMobileOpen(false)} className={`flex gap-2 rounded-lg px-3 py-3 text-sm font-medium ${pathname === '/operations' ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}><Home size={18} aria-hidden/>운영 홈·알림</Link>
    {services.map(([key,label]) => <section key={key}>
      <button type="button" aria-expanded={openServices.includes(key)} aria-controls={`${prefix}-${key}`} onClick={() => setOpenServices(old => toggle(old,key))} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold ${activeService === key ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}><span>{label}</span><ChevronDown aria-hidden size={16} className={openServices.includes(key) ? 'rotate-180' : ''}/></button>
      <div id={`${prefix}-${key}`} hidden={!openServices.includes(key)} className="ml-3 border-l border-slate-200 pl-2">
        {centralGroups(menus.filter(menu => menu.service === key)).map(group => {
          const groupId = `${key}:${group.key}`, opened = openGroups.includes(groupId);
          const link = (menu: CentralOperationMenu) => <Link key={menu.key} to={centralMenuHref(menu)} aria-current={centralMenuIsActive(menu,pathname) ? 'page' : undefined} onClick={() => setMobileOpen(false)} className={`block rounded px-3 py-2.5 text-sm break-words ${centralMenuIsActive(menu,pathname) ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{menu.label}</Link>;
          if (group.menus.length === 1) return <div key={group.key}>{link(group.menus[0])}</div>;
          return <div key={group.key}>
            <button type="button" aria-expanded={opened} aria-controls={`${prefix}-${key}-${group.key}`} onClick={() => setOpenGroups(old => toggle(old,groupId))} className={`flex w-full items-center justify-between gap-2 rounded px-3 py-2.5 text-left text-sm font-medium ${activeGroup === groupId ? 'text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}><span>{group.label}</span><ChevronDown size={14} aria-hidden className={opened ? 'rotate-180' : ''}/></button>
            <div id={`${prefix}-${key}-${group.key}`} hidden={!opened} className="ml-2 border-l border-slate-100 pl-1">{group.menus.map(link)}</div>
          </div>;
        })}
      </div>
    </section>)}
  </nav>;
  return <div className="min-h-screen bg-gray-50">{header}
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <button ref={trigger} type="button" aria-expanded={mobileOpen} aria-haspopup="dialog" onClick={() => setMobileOpen(true)} className="mb-4 flex w-full items-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium lg:hidden"><Menu size={18} aria-hidden/>업무 메뉴<span className="ml-auto truncate text-slate-500">{active?.label ?? '운영 홈'}</span></button>
      <div className="flex items-start gap-6">
        <aside className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] w-64 shrink-0 overflow-y-auto rounded-xl border bg-white p-2 lg:block">{nav('desktop')}</aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
    {mobileOpen && <OperatorDialog label="통합 운영 메뉴" fallbackFocus={trigger} dismissOnBackdrop onCancel={() => setMobileOpen(false)} className="max-w-sm rounded-xl bg-white p-3">
      <div className="mb-3 flex items-center justify-between border-b pb-3"><h2 className="font-semibold">업무 메뉴</h2><button type="button" data-dialog-initial-focus aria-label="메뉴 닫기" className="rounded p-2" onClick={() => setMobileOpen(false)}><X size={20}/></button></div>{nav('mobile')}
    </OperatorDialog>}
  </div>;
}
