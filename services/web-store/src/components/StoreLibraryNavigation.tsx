import { NavLink, useLocation } from 'react-router-dom';
import { storeWorkspaceBase } from './store/StoreWorkflowNavigation';
import { useUnifiedStore } from '../contexts/StoreContext';

/** 원본 탐색과 매장 소유 사본을 구분한다. 출처는 동기화 관계가 아니다. */
export function StoreLibraryNavigation({ section }: Readonly<{ section: 'sources' | 'mine' }>) {
  const { effectiveServiceKey } = useUnifiedStore();
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  const pharmacy = effectiveServiceKey === 'kpa-society';
  const link = (active: boolean) => `rounded-lg border px-4 py-2 text-sm ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`;
  return <section className="mb-5 space-y-3" aria-label="매장 자료 관리">
    <nav className="flex flex-wrap gap-2" aria-label="자료함 구분">
      {pharmacy && <NavLink to={`${base}/pharmacy/contents`} className={link(section === 'sources')}>자료 가져오기</NavLink>}
      {!pharmacy && <NavLink to="/store/library/content" className={link(section === 'sources')}>제공 자료 찾기</NavLink>}
      <NavLink to={`${base}/library/contents`} className={link(section === 'mine')}>내 자료함</NavLink>
    </nav>
    <NavLink to={`${base}/workspace/use`} className="inline-block rounded-lg border border-teal-200 px-3 py-2 text-sm text-teal-800">저장한 자료 활용하기</NavLink>
    <p className="text-sm text-slate-500">가져온 자료는 내 매장의 독립 사본입니다. 원본이 변경되어도 자동으로 업데이트되지 않습니다.</p>
    {section === 'mine' && <nav className="flex flex-wrap gap-3 text-sm" aria-label="내 자료함 보기">
      <NavLink to={`${base}/library/contents`} className={({ isActive }) => isActive ? 'font-semibold text-blue-700' : 'text-slate-600'}>콘텐츠 · 제작 시작</NavLink>
      <NavLink to={`${base}/library/resources`} className={({ isActive }) => isActive ? 'font-semibold text-blue-700' : 'text-slate-600'}>파일 · 참고 자료</NavLink>
      {pharmacy && <NavLink to="/store/library/multilingual-product-contents/my" className={({ isActive }) => isActive ? 'font-semibold text-blue-700' : 'text-slate-600'}>다국어 상품 안내</NavLink>}
      <NavLink to={`${base}/content`} end className={({ isActive }) => isActive ? 'font-semibold text-blue-700' : 'text-slate-600'}>게시 · 활용 상태</NavLink>
    </nav>}
    {section === 'sources' && pharmacy && <NavLink to="/store/library/multilingual-product-contents" className="inline-flex min-h-11 items-center text-sm text-blue-700 underline">다국어 제공 자료 찾기</NavLink>}
  </section>;
}
