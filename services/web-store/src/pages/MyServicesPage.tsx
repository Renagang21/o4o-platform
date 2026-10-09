import { Link } from 'react-router-dom';
import { useUnifiedStore } from '../contexts/StoreContext';
import { WORKSPACE_PATHS } from '../config/workspace';
import SemiFranchisesPage from './neture-pharmacy/SemiFranchisesPage';

/** 사업 가입 원장을 표시한다. 내부 service enrollment를 사업 가입으로 치환하지 않는다. */
export default function MyServicesPage() {
  const { effectiveServiceKey } = useUnifiedStore();
  if (effectiveServiceKey === 'kpa-society') return <SemiFranchisesPage />;
  return <main className="page"><h1>이용 사업</h1>
    <p>약국 매장에서 사업별 가입 상태와 이용 조건을 확인할 수 있습니다.</p>
    <Link to={WORKSPACE_PATHS.myStore}>내 매장으로</Link>
  </main>;
}
