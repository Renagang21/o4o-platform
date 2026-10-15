import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { StoreLibraryNavigation } from '../StoreLibraryNavigation';
import { UNIFIED_STORE_CONFIG, withPharmacyStoreMenu } from '../../config/storeMenu';
import { WORKSPACE_PATHS } from '../../config/workspace';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { RetiredServiceNotice, StoreAgreementGate, useRetiredOnlyStore, StoreWorkDashboard } from './UnifiedStoreLayout';

const SOURCES = [
  ['content', '일반 콘텐츠'], ['supplier-library', '공급자 공개 자료'],
  ['multilingual-product-contents', '다국어 상품 안내'], ['blog', '블로그'], ['pop', 'POP'],
  ['qr', 'QR 자료'], ['video', '동영상'], ['signage', '사이니지'], ['screen-set', '태블릿 화면'],
];

export default function UnifiedStoreLibraryLayout() {
  const { commonServiceKey } = useUnifiedStore();
  const { pathname } = useLocation();
  const mine = pathname.endsWith('/multilingual-product-contents/my');
  const retiredOnly = useRetiredOnlyStore();
  if (retiredOnly) return <RetiredServiceNotice />;
  return <StoreAgreementGate serviceKey={commonServiceKey}>
    <StoreWorkDashboard config={commonServiceKey === 'kpa-society' ? withPharmacyStoreMenu(UNIFIED_STORE_CONFIG) : UNIFIED_STORE_CONFIG} withCapabilities workspace>
    <StoreLibraryNavigation section={mine ? 'mine' : 'sources'} />
    {!mine && <nav aria-label="이용 가능한 자료의 출처" className="flex flex-wrap gap-3 px-4 py-4">
      <NavLink to={`${WORKSPACE_PATHS.myStore}/pharmacy/contents`}>사업 제공 자료</NavLink>
      {SOURCES.slice(0, 3).map(([path, label]) => <NavLink className="min-h-11 content-center" key={path} to={`${WORKSPACE_PATHS.myStore}/library/${path}`}>{label}</NavLink>)}
      <details className="w-full rounded-lg border border-slate-200 p-3"><summary className="min-h-11 cursor-pointer content-center text-sm">유형별 자료 찾기</summary>
        <div className="flex flex-wrap gap-3">{SOURCES.slice(3).map(([path, label]) => <NavLink className="min-h-11 content-center text-sm" key={path} to={`${WORKSPACE_PATHS.myStore}/library/${path}`}>{label}</NavLink>)}</div>
      </details>
      <NavLink to={`${WORKSPACE_PATHS.myStore}/library/contents`}>내 콘텐츠 · 사본</NavLink>
    </nav>}
    <Outlet />
    </StoreWorkDashboard>
  </StoreAgreementGate>;
}
