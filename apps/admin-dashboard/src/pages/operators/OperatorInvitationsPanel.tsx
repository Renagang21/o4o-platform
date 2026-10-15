import { useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';

export type Invite = {
  target_user_id: string | null;
  accepted_user_id: string | null;
  id: string;
  invited_email: string;
  role: string;
  purpose: string;
  status: string;
  expired: boolean;
  expires_at: string;
  accepted_at: string | null;
};
export default function OperatorInvitationsPanel({
  version,
  onLoaded,
}: {
  version: number;
  onLoaded: (rows: Invite[] | null) => void;
}) {
  const [rows, setRows] = useState<Invite[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const res = await authClient.api.get(
        '/admin/service-operator-invitations',
      );
      if (!Array.isArray(res.data?.data)) throw new Error('INVALID_RESPONSE');
      setRows(res.data.data);
      onLoaded(res.data.data);
      setError('');
    } catch {
      onLoaded(null);
      setError('초대·이메일 확인 목록을 불러오지 못했습니다.');
    }
  };
  useEffect(() => {
    void load();
  }, [version]);
  const manage = async (id: string, action: 'resend' | 'cancel') => {
    setBusy(true);
    try {
      await authClient.api.post(
        `/admin/service-operator-invitations/${id}/${action}`,
      );
      await load();
    } catch {
      setError(
        '요청에 실패했습니다. 재발송은 이전 발송 1분 후 가능합니다. 실제 처리 상태를 다시 조회하세요.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="mt-6 space-y-3 rounded-lg border bg-white p-4"
      aria-label="운영자 초대 및 이메일 확인"
    >
      <h2 className="font-semibold">운영자 초대 · 이메일 확인</h2>
      <p className="text-sm text-gray-600">
        새 지정은 수락 후 활성화됩니다. 기존 운영자는 권한을 유지하며 행
        메뉴에서 확인 메일을 보낼 수 있습니다. 최근 200건을 표시합니다.
      </p>
      <button type="button" onClick={() => void load()}>
        목록 새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      <ul className="divide-y">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-3 py-3 text-sm"
          >
            <span className="break-all">{row.invited_email}</span>
            <code>{row.role}</code>
            <span>
              {row.purpose === 'confirmation' ? '기존 지정 확인' : '신규 초대'}
            </span>
            <span>
              {row.status === 'accepted'
                ? '확인·수락 완료'
                : row.status === 'cancelled'
                  ? '취소'
                  : row.expired
                    ? '만료'
                    : '확인 대기'}
            </span>
            <span>
              유효기간:{' '}
              {new Date(row.expires_at).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
              })}
            </span>
            {row.status === 'pending' && (
              <>
                <button
                  disabled={busy}
                  onClick={() => void manage(row.id, 'resend')}
                >
                  재발송
                </button>
                <button
                  disabled={busy}
                  onClick={() => void manage(row.id, 'cancel')}
                >
                  초대 취소
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
