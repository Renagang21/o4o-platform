import { Link } from 'react-router-dom';
import { MyHomeButton } from '@o4o/auth-react';
import { authClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedStore } from '../../contexts/StoreContext';

/** Retired application URLs only. Membership approval owns store provisioning. */
export default function PharmacyRegistrationNotice() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { reload } = useUnifiedStore();
  return <main className="center-card"><section className="card">
    <h1>회원 등록·매장 연결 안내</h1>
    <p>약국 경영자 회원 등록이 승인되면 내 매장이 자동으로 연결됩니다. 별도 매장 신청은 필요하지 않습니다.</p>
    <p>승인 대기·반려·이용 정지 상태는 회원 등록 상태에서 확인합니다. 연결되지 않은 경우 회원 상태를 확인한 뒤 다시 확인하시기 바랍니다.</p>
    <div className="actions"><MyHomeButton api={authClient.api} accountId={user?.id} isAuthenticated={isAuthenticated} authLoading={isLoading} /><button type="button" onClick={reload}>매장 연결 다시 확인</button><Link to="/store">내 매장으로</Link></div>
  </section></main>;
}
