import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
export interface LegacyEducationHttpClient {
  get(path: string, config?: { params?: Record<string, unknown> }): Promise<{ data: { data: any } }>;
  patch(path: string, body: unknown): Promise<unknown>;
}

interface Inquiry {
  id: string; name: string; organizationName: string | null; subject: string | null;
  status: 'pending' | 'reviewing' | 'done'; createdAt: string;
}
interface Detail extends Inquiry { email: string; phone: string | null; message: string }
const base = '/admin/services/lecture/legacy-education-requests';

export function useLegacyEducationRequests(api: LegacyEducationHttpClient) {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [writeError, setWriteError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const state = useRef({ mounted: false, list: 0, detail: 0, writing: false, needsRefresh: false, reading: true, selectedId: '' });
  useLayoutEffect(() => {
    const lifecycle = state.current; lifecycle.mounted = true;
    return () => { lifecycle.mounted = false; lifecycle.list++; lifecycle.detail++; };
  }, []);
  const load = useCallback(async () => {
    if (!state.current.mounted) return false;
    const request = ++state.current.list;
    const current = () => state.current.mounted && state.current.list === request;
    state.current.reading = true; setLoading(true); setListError('');
    try {
      const response = await api.get(base, { params: { page } });
      if (!current()) return false;
      setItems(response.data.data.items); setPages(Math.max(1, response.data.data.pagination.totalPages));
      state.current.needsRefresh = false; setRefreshRequired(false); setSavedNotice('');
      return true;
    } catch { if (current()) { setItems([]); setListError('기존 문의를 불러오지 못했습니다.'); } return false; }
    finally { if (current()) { state.current.reading = false; setLoading(false); } }
  }, [page, api]);
  useEffect(() => { state.current.detail++; setDetail(null); setDetailLoading(false); setDetailError(''); setWriteError(''); void load(); }, [load]);

  async function open(id: string) {
    if (!state.current.mounted || state.current.writing || state.current.reading) return;
    const request = ++state.current.detail;
    const current = () => state.current.mounted && state.current.detail === request;
    state.current.selectedId = id;
    setDetailError(''); setWriteError(''); setDetail(null); setDetailLoading(true);
    try { const response = await api.get(`${base}/${id}`); if (current()) setDetail(response.data.data); }
    catch { if (current()) setDetailError('문의 상세를 불러오지 못했습니다.'); }
    finally { if (current()) setDetailLoading(false); }
  }
  async function update(status: Inquiry['status']) {
    if (!state.current.mounted || !detail || state.current.writing || state.current.reading || state.current.needsRefresh || detail.status === status) return;
    state.current.writing = true;
    const request = state.current.detail;
    const current = () => state.current.mounted && state.current.detail === request;
    setBusy(true); setWriteError('');
    try {
      await api.patch(`${base}/${detail.id}/status`, { status });
    } catch {
      if (current()) { setWriteError('문의 상태를 저장하지 못했습니다.'); state.current.writing = false; setBusy(false); }
      return;
    }
    if (!current()) return;
    setDetail({ ...detail, status });
    const refreshed = await load();
    if (!current()) return;
    if (!refreshed) {
      state.current.needsRefresh = true; setRefreshRequired(true);
      setSavedNotice('문의 상태는 저장됐지만 목록을 갱신하지 못했습니다. 다시 저장하지 말고 다시 불러와 주세요.');
    } else setSavedNotice('문의 상태가 저장되었습니다.');
    state.current.writing = false; setBusy(false);
  }
  const close = () => {
    if (state.current.writing) return;
    state.current.detail++; state.current.selectedId = ''; setDetail(null); setDetailLoading(false); setDetailError(''); setWriteError('');
  };
  const changePage = (value: number) => {
    if (state.current.writing || state.current.reading) return;
    close(); setPage(value);
  };
  const retry = async () => {
    if (state.current.writing || state.current.reading) return;
    if (detailError && !listError) await open(state.current.selectedId);
    else { setWriteError(''); await load(); }
  };
  return { items, detail, page, pages, error: writeError || detailError || listError, busy, loading, detailLoading,
    refreshRequired, savedNotice, open, update, close, changePage, retry };
}
