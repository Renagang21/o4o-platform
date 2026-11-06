import { NavLink, useLocation } from 'react-router-dom';
import { storeWorkspaceBase } from './store/StoreWorkflowNavigation';
import { useUnifiedStore } from '../contexts/StoreContext';

/** 원본 탐색과 매장 소유 사본을 구분한다. 출처는 동기화 관계가 아니다. */
export function StoreLibraryNavigation({ section, showSources = true }: Readonly<{ section: 'sources' | 'mine'; showSources?: boolean }>) {
  const { effectiveServiceKey } = useUnifiedStore();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const business = params.get('business') || params.get('libraryBusiness') || '';
  const sourceQuery = business ? `?business=${encodeURIComponent(business)}` : '';
  const libraryQuery = business ? `?libraryBusiness=${encodeURIComponent(business)}` : '';
  const base = storeWorkspaceBase(pathname);
  const pharmacy = effectiveServiceKey === 'kpa-society';
  const resources = pathname === `${base}/library/resources`;
  const contents = pathname === `${base}/library/contents` || pathname === `${base}/workspace/studio`;
  const contentsPath = pathname === `${base}/workspace/studio` ? pathname : `${base}/library/contents`;
  const link = (active: boolean) => `shrink-0 rounded-lg border px-3 py-2 text-sm ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`;
  return <section className="mb-3 flex flex-wrap items-start gap-2" aria-label="매장 자료 관리">
    <nav className="flex min-w-0 max-w-full gap-2 overflow-x-auto whitespace-nowrap pb-1" aria-label="자료함 구분">
      <NavLink to={`${contentsPath}${libraryQuery}`} className={link(contents)}>내 콘텐츠</NavLink>
      <NavLink to={`${base}/library/resources`} className={link(resources)}>파일 · 참고 자료</NavLink>
      {showSources && pharmacy && <NavLink to={`${base}/pharmacy/contents${sourceQuery}`} className={link(section === 'sources')}>제공 자료</NavLink>}
      {showSources && !pharmacy && <NavLink to="/store/library/content" className={link(section === 'sources')}>제공 자료 찾기</NavLink>}
    </nav>
    <details className="rounded-lg border border-slate-200 bg-white px-3 text-sm">
      <summary aria-label="자료 관리 더보기" className="min-h-11 cursor-pointer content-center">자료 관리</summary>
      <nav className="flex flex-wrap gap-3 pb-3" aria-label="내 자료함 보기">
      {pharmacy && <NavLink to="/store/library/multilingual-product-contents/my" className={({ isActive }) => isActive ? 'font-semibold text-blue-700' : 'text-slate-600'}>다국어 상품 안내</NavLink>}
      <NavLink to={`${base}/content`} end className="min-h-11 content-center text-slate-700">가져온 사본 게시 설정</NavLink>
      <NavLink to={`${base}/workspace/use`} className="min-h-11 content-center text-teal-800">출력·적용 확인</NavLink>
      {section === 'sources' && pharmacy && <NavLink to="/store/library/multilingual-product-contents" className="min-h-11 content-center text-blue-700 underline">다국어 제공 자료 찾기</NavLink>}
      </nav>
      <p className="max-w-xl pb-3 text-xs text-slate-500">가져온 자료는 내 매장의 독립 사본입니다. 원본이 변경되어도 자동으로 업데이트되지 않습니다. 게시 설정과 실제 기기 적용·재생은 별도로 확인합니다.</p>
    </details>
  </section>;
}
