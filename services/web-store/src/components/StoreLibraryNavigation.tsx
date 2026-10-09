import { NavLink } from 'react-router-dom';
import { useUnifiedStore } from '../contexts/StoreContext';

/** 원본 탐색과 매장 소유 사본을 구분한다. 출처는 동기화 관계가 아니다. */
export function StoreLibraryNavigation({ section }: Readonly<{ section: 'sources' | 'mine' }>) {
  const { effectiveServiceKey } = useUnifiedStore();
  const pharmacy = effectiveServiceKey === 'kpa-society';
  const link = (active: boolean) => `rounded-lg border px-4 py-2 text-sm ${active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`;
  return <section className="mb-5 space-y-3" aria-label="매장 자료 관리">
    <nav className="flex flex-wrap gap-2" aria-label="자료함 구분">
      {pharmacy && <NavLink to="/store/pharmacy/contents" className={link(section === 'sources')}>자료 가져오기</NavLink>}
      <NavLink to="/store/library/contents" className={link(section === 'mine')}>내 자료함</NavLink>
    </nav>
    <p className="text-sm text-slate-500">가져온 자료는 내 매장의 독립 사본입니다. 원본이 변경되어도 자동으로 업데이트되지 않습니다.</p>
    {section === 'mine' && <nav className="flex flex-wrap gap-3 text-sm" aria-label="내 자료함 보기">
      <NavLink to="/store/library/contents" className={({ isActive }) => isActive ? 'font-semibold text-blue-700' : 'text-slate-600'}>콘텐츠 · 제작 시작</NavLink>
      <NavLink to="/store/library/resources" className={({ isActive }) => isActive ? 'font-semibold text-blue-700' : 'text-slate-600'}>파일 · 참고 자료</NavLink>
      <NavLink to="/store/content" end className={({ isActive }) => isActive ? 'font-semibold text-blue-700' : 'text-slate-600'}>게시 · 활용 상태</NavLink>
    </nav>}
  </section>;
}
