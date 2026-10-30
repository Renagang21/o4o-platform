import { Link } from 'react-router-dom';
import type { CentralOperationMenu } from '@o4o/types';
import { ChevronDown } from 'lucide-react';

import {centralGroups} from './central-operation-groups';
export default function CentralOperationDirectory({ services, menus }: {
  services: readonly (readonly [string, string])[]; menus: readonly CentralOperationMenu[];
}) {
  const links = (items: readonly CentralOperationMenu[]) => <ul className="mt-3 grid gap-2 border-t pt-3">{items.map(menu => <li key={menu.key}><Link className="block rounded border px-3 py-2 text-sm text-blue-700 hover:bg-blue-50" to={`/operations/${menu.service}/${menu.area}`}>{menu.label}</Link></li>)}</ul>;
  return <section aria-label="전체 업무 바로가기" className="space-y-3">
    <h2 className="text-lg font-semibold">업무 바로가기</h2>
    <p className="text-sm text-slate-500">서비스와 업무 그룹을 펼쳐 필요한 메뉴로 이동하세요.</p>
    <div className="grid items-start gap-3 md:grid-cols-2">
      {services.map(([key, name]) => {
        const items = menus.filter(menu => menu.service === key);
        if (key === 'neture') return <section key={key} className="rounded-xl border bg-white p-4 md:col-span-2">
          <h3 className="mb-3 font-semibold">{name}</h3>
          <div className="grid items-start gap-3 md:grid-cols-2">{centralGroups(items).map(({key:group,label,menus:groupItems}) => {
            if (groupItems.length === 1) return <section key={group} className="rounded-lg border p-3"><h4 className="text-sm font-medium">{label}</h4>{links(groupItems)}</section>;
            return <details key={group} className="group/category rounded-lg border p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium"><span>{label}</span><span className="flex items-center gap-2 text-xs text-slate-500">{groupItems.length}개<ChevronDown className="h-4 w-4 group-open/category:rotate-180" aria-hidden /></span></summary>{links(groupItems)}</details>;
          })}</div>
        </section>;
        return <details key={key} className="group/service rounded-xl border bg-white p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><h3 className="font-semibold">{name}</h3><span className="flex items-center gap-2 text-xs text-slate-500">{items.length}개 업무<ChevronDown className="h-4 w-4 group-open/service:rotate-180" aria-hidden /></span></summary><div className="mt-3 space-y-2">{centralGroups(items).map(group => group.menus.length === 1 ? <div key={group.key}>{links(group.menus)}</div> : <details key={group.key} className="group/category rounded border p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium"><span>{group.label}</span><ChevronDown aria-hidden size={16} className="group-open/category:rotate-180"/></summary>{links(group.menus)}</details>)}</div></details>;
      })}
    </div>
    {!services.length && <p>현재 연결된 운영 업무가 없습니다.</p>}
  </section>;
}
