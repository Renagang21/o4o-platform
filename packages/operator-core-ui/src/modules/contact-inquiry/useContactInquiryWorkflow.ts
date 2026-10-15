import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  ContactInquiryApi,
  ContactInquiryDetail,
  ContactInquiryListResult,
} from './types';

function message(e: unknown, fallback: string) {
  const error = e as {
    response?: { data?: { error?: string } };
    message?: string;
  };
  return error?.response?.data?.error || error?.message || fallback;
}

/** 목록 조회, 상세 입력, 순차 저장 결과는 서로 덮어쓰지 않는다. */
export function useContactInquiryWorkflow(
  api: ContactInquiryApi,
  serviceKey: string,
) {
  const listPage = useRef(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [result, setResult] = useState<ContactInquiryListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactInquiryDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStatus, setDetailStatus] = useState('');
  const [detailNote, setDetailNote] = useState('');
  const [saving, setSaving] = useState(false);
  const state = useRef({ mounted: false, list: 0, detail: 0, saving: false });
  useLayoutEffect(() => {
    const scope = { mounted: true, list: 0, detail: 0, saving: false };
    state.current = scope;
    setSaving(false);
    setDetail(null);
    setDetailId(null);
    setDetailLoading(false);
    setNotice(null);
    setActionError(null);
    setListError(null);
    setResult(null);
    return () => {
      scope.mounted = false;
      scope.list++;
      scope.detail++;
    };
  }, [api, serviceKey]);
  useLayoutEffect(() => {
    state.current.list++;
  }, [statusFilter]);

  const load = useCallback(
    async (page = 1): Promise<boolean> => {
      const scope = state.current;
      if (!scope.mounted) return false;
      const request = ++scope.list;
      listPage.current = page;
      const current = () => scope.mounted && request === scope.list;
      setLoading(true);
      setListError(null);
      try {
        const value = await api.list(serviceKey, {
          status: statusFilter || undefined,
          page,
          limit: 20,
        });
        if (!Array.isArray(value?.items) || !value.pagination)
          throw new Error('문의 목록 응답을 확인하지 못했습니다.');
        if (!current()) return false;
        setResult(value);
        return true;
      } catch (e) {
        if (current()) {
          setResult(null);
          setListError(message(e, '문의 목록을 불러오지 못했습니다.'));
        }
        return false;
      } finally {
        if (current()) setLoading(false);
      }
    },
    [api, serviceKey, statusFilter],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    const scope = state.current;
    if (scope.saving) return;
    const request = ++scope.detail;
    const current = () => scope.mounted && request === scope.detail;
    setDetailId(id);
    setDetail(null);
    setActionError(null);
    setNotice(null);
    setDetailLoading(true);
    try {
      const value = await api.getDetail(serviceKey, id);
      if (!value?.id) throw new Error('문의 상세 응답을 확인하지 못했습니다.');
      if (!current()) return;
      setDetail(value);
      setDetailStatus(value.status);
      setDetailNote(value.internalNote ?? '');
    } catch (e) {
      if (current())
        setActionError(message(e, '문의 상세를 불러오지 못했습니다.'));
    } finally {
      if (current()) setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    if (state.current.saving) return;
    state.current.detail++;
    setDetail(null);
    setDetailId(null);
    setActionError(null);
    setDetailLoading(false);
  };
  const handleSave = async () => {
    const scope = state.current;
    if (!detail || scope.saving || !scope.mounted) return;
    scope.saving = true;
    const request = scope.detail;
    const current = () => scope.mounted && request === scope.detail;
    setSaving(true);
    setActionError(null);
    setNotice(null);
    let statusSaved = false;
    try {
      let updated = detail;
      if (detailStatus !== detail.status) {
        updated = await api.setStatus(serviceKey, detail.id, detailStatus);
        if (!current()) return;
        statusSaved = true;
        setDetail(updated);
        setDetailStatus(updated.status);
      }
      if (detailNote !== (updated.internalNote ?? ''))
        updated = await api.setNote(serviceKey, detail.id, detailNote);
      if (!current()) return;
      setDetail(updated);
      setDetailStatus(updated.status);
      setDetailNote(updated.internalNote ?? '');
      setNotice('저장되었습니다.');
      await load(result?.pagination.page ?? 1);
    } catch (e) {
      if (!current()) return;
      setActionError(message(e, '저장에 실패했습니다.'));
      if (statusSaved) {
        setNotice(
          '상태는 저장되었지만 내부 메모는 저장하지 못했습니다. 메모만 다시 저장해 주세요.',
        );
        await load(result?.pagination.page ?? 1);
      }
    } finally {
      scope.saving = false;
      if (current()) setSaving(false);
    }
  };
  return {
    statusFilter,
    setStatusFilter: (value: string) => {
      if (state.current.saving) return;
      setNotice(null); setActionError(null); setStatusFilter(value);
    },
    result,
    loading,
    listError,
    actionError,
    notice,
    detail,
    detailId,
    detailLoading,
    detailStatus,
    setDetailStatus,
    detailNote,
    setDetailNote,
    saving,
    load,
    retryList: () => load(listPage.current),
    openDetail,
    closeDetail,
    handleSave,
  };
}
