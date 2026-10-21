import { Link, useLocation, useOutletContext } from 'react-router-dom';
import type { StoreWorkspaceOutlet } from '../layouts/StoreWorkspaceShell';
import { storeWorkspaceBase } from './StoreWorkflowNavigation';

const tasks = [
  ['pharmacy-supply', '상품 주문', '/pharmacy/supply'],
  ['my-products', '내 취급상품', '/my-products'],
  ['pharmacy-orders', '주문 내역', '/pharmacy/orders'],
  ['pharmacy-recruitments', '판매처 모집', '/pharmacy/recruitments'],
] as const;
/** One set of existing task routes; inherit the workspace's permission-filtered menu. */
export function StoreCommerceNavigation() {
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  const outlet = useOutletContext<StoreWorkspaceOutlet | null>();
  const keys = outlet?.config.menuSections?.flatMap(section => section.items.map(item => item.key));
  return <nav aria-label="상품·거래 업무" className="mb-4 flex flex-wrap gap-2">
    {tasks.filter(([key]) => !keys || keys.includes(key)).map(([key, label, path]) => {
      const active = pathname === `${base}${path}` || (key === 'pharmacy-supply' && pathname === `${base}/workspace/commerce`);
      return <Link key={key} to={`${base}${path}`} aria-current={active ? 'page' : undefined}
        className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm ${active ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-700'}`}>{label}</Link>;
    })}
  </nav>;
}
