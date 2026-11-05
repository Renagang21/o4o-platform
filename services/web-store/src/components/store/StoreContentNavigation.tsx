import { Link } from 'react-router-dom';

export function StoreContentNavigation({ basePath, signage, showGeneral, showSignage }: Readonly<{
  basePath: string; signage: boolean; showGeneral: boolean; showSignage: boolean;
}>) {
  const style = 'inline-flex min-h-11 items-center rounded-lg border px-5 py-2 text-sm font-semibold';
  return <nav aria-label="매장 콘텐츠 구분" className="mt-3 flex flex-wrap gap-2">
    {showGeneral && <Link to={`${basePath}/workspace/studio`} aria-current={!signage ? 'page' : undefined} className={`${style} ${!signage ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'}`}>일반 콘텐츠</Link>}
    {showSignage && <Link to={`${basePath}/marketing/signage/videos?workspace=studio`} aria-current={signage ? 'page' : undefined} className={`${style} ${signage ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'}`}>사이니지</Link>}
  </nav>;
}
