import { useCallback, useEffect, useRef, useState } from 'react';
import { MemberHardDeleteConfirmModal } from '@o4o/operator-core-ui/modules/members';
import type {AxiosInstance} from 'axios';
import { useLatestRequest } from '../../common/operation-support/useLatestRequest';

/** This endpoint removes Neture relationships, not identity or all authored activity. */
export function AdminMemberDeleteModal({ api, userId, userName, onClose, onDeleted }: {
  api:AxiosInstance;
  userId: string; userName: string; onClose: () => void; onDeleted: () => void;
}) {
  const lock = useRef(false);
  const begin = useLatestRequest(userId);
  const [loading, setLoading] = useState(true);
  const [readingError, setReadingError] = useState('');
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');
  const read = useCallback(async () => {
    const current = begin(); setLoading(true); setReadingError('');
    try {
      const { data } = await api.get(`/operator/members/${userId}?serviceKey=neture`);
      if (!data?.success) throw new Error('가입 정리 대상을 확인하지 못했습니다.');
    } catch (e) { if (current()) setReadingError(e instanceof Error ? e.message : '대상 확인 실패'); }
    finally { if (current()) setLoading(false); }
  }, [userId, begin, api]);
  useEffect(() => { setWriting(false); void read(); }, [read]);
  async function confirm() {
    if (loading || readingError || lock.current) return;
    lock.current = true; setWriting(true); setError('');
    const current = begin();
    try {
      const { data } = await api.delete(`/operator/members/${userId}?mode=hard&serviceKey=neture`);
      if (!data?.success) throw new Error('가입 정리에 실패했습니다.');
      if (current()) { onDeleted(); onClose(); }
    } catch (e) { if (current()) setError(e instanceof Error ? e.message : '가입 정리 실패'); }
    finally { lock.current = false; if (current()) setWriting(false); }
  }
  return <MemberHardDeleteConfirmModal open member={{ id: userId, name: userName }} serviceLabel="Neture" relationshipOnly
    confirmDisabled={loading || !!readingError} loading={writing} onClose={onClose} onConfirm={confirm}>
    <p className="text-sm">Neture 가입·일반 역할 관계만 정리합니다. 다른 서비스와 활동·감사 기록은 유지됩니다.</p>
    {loading && <p role="status">대상을 확인하고 있습니다…</p>}
    {readingError && <p role="alert">{readingError}<button type="button" disabled={writing} onClick={() => void read()} className="ml-2 underline">다시 조회</button></p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </MemberHardDeleteConfirmModal>;
}
