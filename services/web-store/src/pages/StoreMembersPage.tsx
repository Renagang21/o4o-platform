import { useCallback, useEffect, useState } from 'react';
import { storeMembershipApi, type StoreMember } from '../api/storeMembership';
import { useUnifiedStore } from '../contexts/StoreContext';

/**
 * 매장 구성원 — 초대 · 수락 대기 · 해제 (Owner 전용 화면)
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * **이 화면이 권한을 정하지 않는다.** 서버가 Owner 가 아니면 403 을 돌려주고, 여기서는 그 사유를
 * 그대로 보여준다. 화면에서 버튼을 숨기는 것으로 막지 않는다는 뜻이다.
 */

const ROLE_LABEL: Record<string, string> = {
  owner: '경영자',
  admin: '관리자',
  manager: '매니저',
  staff: '구성원',
  invited: '수락 대기',
};

const errorMessage = (e: unknown): string =>
  e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
    ? (e as { message: string }).message
    : '요청을 처리하지 못했습니다.';

export default function StoreMembersPage() {
  const { effectiveServiceKey } = useUnifiedStore();
  const [members, setMembers] = useState<StoreMember[] | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await storeMembershipApi.listMembers(effectiveServiceKey ?? undefined);
      setMembers(data.members);
    } catch (e) {
      setMembers([]);
      setError(errorMessage(e));
    }
  }, [effectiveServiceKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await storeMembershipApi.invite(email.trim(), effectiveServiceKey ?? undefined);
      setNotice('초대했습니다. 상대가 수락하면 구성원이 됩니다.');
      setEmail('');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (member: StoreMember) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await storeMembershipApi.remove(member.userId, effectiveServiceKey ?? undefined);
      setNotice(`${member.email} 님의 접근을 해제했습니다.`);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page" data-testid="store-members">
      <h1>매장 구성원</h1>
      <p>
        매장 업무를 함께할 사용자를 초대합니다. <strong>이미 가입한 사용자</strong>만 초대할 수 있고,
        상대가 수락해야 접근이 생깁니다.
      </p>

      <form onSubmit={invite} className="card">
        <label htmlFor="invite-email">초대할 사용자 이메일</label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !email.trim()}>
          {busy ? '처리 중...' : '초대'}
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {members === null ? (
        <p>불러오는 중...</p>
      ) : members.length === 0 ? (
        <p>표시할 구성원이 없습니다.</p>
      ) : (
        <ul className="option-list">
          {members.map((m) => (
            <li key={m.userId}>
              <span className="option-name">{m.name || m.email}</span>
              <span className="option-meta">
                {ROLE_LABEL[m.role] ?? m.role}
                {m.status === 'invited' && ' · 수락 대기'}
              </span>
              {/* 경영자 · 관리자 · 매니저 행은 서버가 거절한다 — 버튼도 내보내지 않는다. */}
              {(m.role === 'staff' || m.role === 'invited') && (
                <button type="button" onClick={() => void remove(m)} disabled={busy}>
                  해제
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
