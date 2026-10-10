import { useState } from 'react';
import { AccessDenied } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';

export function CommunityAccessDenied() {
  const { user, refreshAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const recheck = async () => {
    setBusy(true);
    setNotice('');
    try {
      await refreshAuth();
      setNotice('권한을 다시 확인했습니다. 계속 접근이 거부되면 관리자에게 역할과 커뮤니티 서비스 가입 상태를 확인해 주세요.');
    } catch {
      setNotice('권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  return <AccessDenied description="커뮤니티 관리에 필요한 운영 권한을 확인하지 못했습니다.">
    {user?.email && <p className="mt-4 break-all text-sm text-slate-600">로그인 계정: {user.email}</p>}
    <p className="mt-4 text-sm text-slate-600">다른 관리자 화면에서 역할을 지정했다면 권한을 다시 확인해 주세요. 이 화면은 커뮤니티 운영 역할과 활성 서비스 가입이 필요합니다.</p>
    <button type="button" disabled={busy} onClick={recheck}
      className="mt-4 rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50">
      {busy ? '확인 중…' : '권한 다시 확인'}
    </button>
    {notice && <p role="status" className="mt-3 text-sm text-slate-600">{notice}</p>}
  </AccessDenied>;
}
