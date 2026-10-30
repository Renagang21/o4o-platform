import { Link } from 'react-router-dom';
import type { CentralOperationMenu } from '@o4o/types';
import { ChevronDown } from 'lucide-react';

const groups = [
  ['members', '회원·승인'], ['service', '콘텐츠·커뮤니티'],
  ['business', '상품·사업'], ['settings', '운영·설정'],
] as const;
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
          <div className="grid items-start gap-3 md:grid-cols-2">{groups.map(([group, label]) => {
            const groupItems = items.filter(menu => menu.group === group);
            return groupItems.length > 0 && <details key={group} className="group rounded-lg border p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium"><span>{label}</span><span className="flex items-center gap-2 text-xs text-slate-500">{groupItems.length}개<ChevronDown className="h-4 w-4 group-open:rotate-180" aria-hidden /></span></summary>{links(groupItems)}</details>;
          })}</div>
        </section>;
        return <details key={key} className="group rounded-xl border bg-white p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><h3 className="font-semibold">{name}</h3><span className="flex items-center gap-2 text-xs text-slate-500">{items.length}개 업무<ChevronDown className="h-4 w-4 group-open:rotate-180" aria-hidden /></span></summary>{links(items)}</details>;
      })}
    </div>
    {!services.length && <p>현재 연결된 운영 업무가 없습니다.</p>}
  </section>;
}
