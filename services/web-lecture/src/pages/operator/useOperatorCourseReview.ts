import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { operatorApi, errorMessage, errorStatus, type OperatorCourseReview } from '../../api/lecture';
import { useToast } from '../../components/Toast';

/** One course review workspace; no enrollment or instructor editing is performed. */
export function useOperatorCourseReview(courseId: string, onComplete: () => void) {
  const toast = useToast();
  const lifecycle = useRef({ mounted: false, request: 0, writing: false });
  const [data, setData] = useState<OperatorCourseReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
    const state = lifecycle.current; state.mounted = true;
    return () => { state.mounted = false; state.request++; };
  }, []);
  const load = useCallback(async () => {
    const state = lifecycle.current;
    if (!state.mounted || state.writing) return;
    const request = ++state.request;
    const current = () => state.mounted && state.request === request;
    setLoading(true); setError(null); setData(null);
    try { const response = await operatorApi.review(courseId); if (current()) setData(response.data); }
    catch (err) { if (current()) setError(errorStatus(err) === 404 ? '강의를 찾을 수 없습니다.' : errorMessage(err, '강의 정보를 불러오지 못했습니다.')); }
    finally { if (current()) setLoading(false); }
  }, [courseId]);
  useEffect(() => { void load(); }, [load]);
  async function decide(kind: 'approve' | 'reject', reason?: string) {
    const state = lifecycle.current;
    if (!state.mounted || state.writing || loading || error || data?.course.status !== 'pending_review') return false;
    state.writing = true; setBusy(true); setActionError(null);
    const request = state.request;
    const current = () => state.mounted && state.request === request;
    try {
      if (kind === 'approve') await operatorApi.approve(courseId);
      else await operatorApi.reject(courseId, reason ?? '');
      if (!current()) return false;
      toast.success(`${kind === 'approve' ? '승인·게시' : '반려'} 완료`); onComplete();
      return true;
    } catch (err) {
      if (current()) { const text = errorMessage(err, `${kind === 'approve' ? '승인·게시' : '반려'} 실패`); setActionError(text); toast.error(text); }
      return false;
    } finally { if (current()) { state.writing = false; setBusy(false); } }
  }
  return { data, loading, error, actionError, busy, load, decide, clearActionError: () => setActionError(null) };
}
