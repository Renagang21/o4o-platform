import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeMembershipApi, type StoreInvitation } from '../api/storeMembership';
import { WORKSPACE_PATHS } from '../config/workspace';
import { useUnifiedStore } from '../contexts/StoreContext';

/**
 * 받은 매장 초대 — 수락 화면
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * 수락 전에는 그 매장이 보이지 않는다(`'invited'` 는 접근 0). 수락은 **받은 본인만** 할 수 있고,
 * 그 판정은 서버가 세션으로 한다.
 */

const errorMessage = (e: unknown): string =>
  e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
    ? (e as { message: string }).message
    : '요청을 처리하지 못했습니다.';

export default function StoreInvitationsPage() {
  const navigate = useNavigate();
  const { reload } = useUnifiedStore();
  const [invitations, setInvitations] = useState<StoreInvitation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setInvitations(await storeMembershipApi.listMyInvitations());
    } catch (e) {
      setInvitations([]);
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async (invitation: StoreInvitation) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await storeMembershipApi.accept(invitation.organizationId);
      // 수락으로 매장이 **방금** 생겼다 — context 의 매장 목록은 로그인 사용자가 바뀔 때만 다시
      // 읽으므로, 여기서 reload 하지 않으면 홈에 가도 빈 목록이 남아 수동 새로고침이 필요하다.
      reload();
      navigate(WORKSPACE_PATHS.home, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <main className="page" data-testid="store-invitations">
      <h1>받은 매장 초대</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {invitations === null ? (
        <p>불러오는 중...</p>
      ) : invitations.length === 0 ? (
        <p>받은 초대가 없습니다.</p>
      ) : (
        <ul className="option-list">
          {invitations.map((inv) => (
            <li key={inv.organizationId}>
              <span className="option-name">{inv.organizationName || '이름 없는 매장'}</span>
              <button type="button" onClick={() => void accept(inv)} disabled={busy}>
                {busy ? '처리 중...' : '수락'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
