import type { StoreDashboardConfig } from '@o4o/store-ui-core';
import { Link, useLocation } from 'react-router-dom';
import { currentStoreOperation, storeOperationGroups } from '../../config/storeWorkspace';

export function StoreOperationsNavigation({ config }: { config: StoreDashboardConfig }) {
  const location = useLocation();
  const groups = storeOperationGroups(config);
  const selected = currentStoreOperation(config, location.pathname, location.search);
  const landing = `${config.basePath}/workspace/use`;
  const isLanding = location.pathname === landing;
  if (!groups.length) return null;
  return <nav aria-label="매장 운영 업무" className="flex flex-wrap gap-2">
    {groups.map(group => {
      const search = new URLSearchParams(isLanding ? location.search : '');
      search.set('topic', group.key);
      return <Link key={group.key}
        to={{ pathname: landing, search: `?${search}`, hash: isLanding ? location.hash : '' }}
        state={isLanding ? location.state : undefined}
        aria-current={selected?.key === group.key ? 'page' : undefined}
        className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-5 py-2 text-sm font-semibold ${selected?.key === group.key ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-600'}`}>
        {group.title}
      </Link>;
    })}
  </nav>;
}
