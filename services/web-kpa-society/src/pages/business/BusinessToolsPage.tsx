import { O4OHomeButton } from '@o4o/auth-react';
import BusinessStoreShortcut from './BusinessStoreShortcut';
import { useBusiness } from './BusinessWorkspace';
import { useAuth, authClient } from '../../contexts/AuthContext';

export default function BusinessToolsPage() {
  const { access } = useBusiness();
  const { isAuthenticated, isLoading } = useAuth();
  if (!access?.allowed) return <p>사업 참여 승인 후 업무 도구를 이용할 수 있습니다.</p>;
  return <section><h2 className="text-lg font-semibold">업무 도구</h2>
    <ul className="mt-4 space-y-4">
      <li><p className="mb-3 text-sm text-slate-600">주문·상품·자료함·태블릿·사이니지는 내 매장에서 이용합니다.</p><BusinessStoreShortcut /></li>
      <li><O4OHomeButton api={authClient.api} isAuthenticated={isAuthenticated} authLoading={isLoading} label="O4O AI 업무 시작" className="o4o-home-link" /></li>
      {access.canManage && <li><a className="text-blue-700" href="/operator/semi-franchises">사업 운영 · 참여 약국 관리</a></li>}
    </ul>
  </section>;
}
