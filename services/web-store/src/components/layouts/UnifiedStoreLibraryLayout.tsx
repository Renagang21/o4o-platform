import { NavLink, Outlet } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../../config/workspace';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { RetiredServiceNotice, StoreAgreementGate, useRetiredOnlyStore } from './UnifiedStoreLayout';

const SOURCES = [
  ['content', '일반 콘텐츠'], ['supplier-library', '공급자 공개 자료'],
  ['multilingual-product-contents', '다국어 상품 안내'], ['blog', '블로그'], ['pop', 'POP'],
  ['qr', 'QR 자료'], ['video', '동영상'], ['signage', '사이니지'], ['screen-set', '태블릿 화면'],
];

export default function UnifiedStoreLibraryLayout() {
  const { commonServiceKey } = useUnifiedStore();
  const retiredOnly = useRetiredOnlyStore();
  if (retiredOnly) return <RetiredServiceNotice />;
  return <StoreAgreementGate serviceKey={commonServiceKey}>
    <nav aria-label="이용 가능한 자료의 출처" className="flex flex-wrap gap-3 px-4 py-4">
      <NavLink to={`${WORKSPACE_PATHS.myStore}/pharmacy/contents`}>사업 제공 콘텐츠</NavLink>
      {SOURCES.map(([path, label]) => <NavLink key={path} to={`${WORKSPACE_PATHS.myStore}/library/${path}`}>{label}</NavLink>)}
      <NavLink to={`${WORKSPACE_PATHS.myStore}/library/contents`}>내 콘텐츠 · 사본</NavLink>
    </nav>
    <Outlet />
  </StoreAgreementGate>;
}
