import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import {
  getOperatorTrialDetail, getOperatorTrialParticipants, getOperatorTrialKpi,
  approveTrialFirst, rejectTrialFirst, updateTrialStatus, retryTrialForumSync,
  updateParticipantRewardStatus, updateParticipantPaymentStatus, exportParticipantsCSV,
} from '../../api/trial';
import type {
  OperatorTrial, ParticipantListResponse, MarketTrialDetailKpi, TrialParticipant,
  TrialStatus, PaymentStatus, UpdateParticipantPaymentInput,
} from '../../api/trial';
import { fundingParticipantFilters, type ParticipantFilter } from './fundingOperatorModel';

function message(error: unknown, fallback: string): string {
  const value = error as { response?: { data?: { message?: string } }; message?: string } | null;
  return value?.response?.data?.message || value?.message || fallback;
}

/** One mounted funding workspace owns reads, writes and read-only recovery. */
export function useFundingOperatorWorkflow(id: string) {
  const beginDetail = useLatestRequest(`funding-detail:${id}`);
  const beginParticipants = useLatestRequest(`funding-participants:${id}`);
  const beginKpi = useLatestRequest(`funding-kpi:${id}`);
  const beginMutation = useLatestRequest(`funding-write:${id}`);
  const beginSnapshot = useLatestRequest(`funding-snapshot:${id}`);
  const beginExport = useLatestRequest(`funding-export:${id}`);
  const writeLock = useRef(false);
  const refreshLock = useRef(false);
  const needsRefresh = useRef(false);
  const exportLock = useRef(false);
  const [trial, setTrial] = useState<OperatorTrial | null>(null);
  const [participantData, setParticipantData] = useState<ParticipantListResponse | null>(null);
  const [trialKpi, setTrialKpi] = useState<MarketTrialDetailKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [participantsError, setParticipantsError] = useState('');
  const [kpiError, setKpiError] = useState('');
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [savedBeforeRefresh, setSavedBeforeRefresh] = useState(false);
  const [pending, setPending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [filter, setFilter] = useState<ParticipantFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | ''>('');

  const loadDetail = useCallback(async () => {
    const current = beginDetail();
    if (!current()) return false;
    try {
      const value = await getOperatorTrialDetail(id);
      if (!current()) return false;
      setTrial(value); setError('');
      return true;
    } catch (error) {
      if (current()) setError(message(error, '유통참여형 펀딩을 불러오는데 실패했습니다.'));
      return false;
    } finally { if (current()) setLoading(false); }
  }, [id, beginDetail]);

  const loadParticipants = useCallback(async () => {
    const current = beginParticipants();
    if (!current()) return false;
    setParticipantsLoading(true); setParticipantsError('');
    try {
      const data = await getOperatorTrialParticipants(id, fundingParticipantFilters(filter, paymentFilter));
      if (!Array.isArray(data?.participants) || !data?.summary) throw new Error('참여자 응답을 확인할 수 없습니다.');
      if (!current()) return false;
      setParticipantData(data);
      return true;
    } catch (error) {
      if (current()) { setParticipantData(null); setParticipantsError(message(error, '참여자 조회에 실패했습니다.')); }
      return false;
    } finally { if (current()) setParticipantsLoading(false); }
  }, [id, filter, paymentFilter, beginParticipants]);

  const refreshKpi = useCallback(async () => {
    const current = beginKpi();
    if (!current()) return;
    setTrialKpi(null); setKpiError('');
    try {
      const value = await getOperatorTrialKpi(id);
      if (current()) { setTrialKpi(value); setKpiError(''); }
    } catch (error) {
      if (current()) { setTrialKpi(null); setKpiError(message(error, '운영 지표 조회에 실패했습니다.')); }
    }
  }, [id, beginKpi]);

  useEffect(() => { void loadDetail(); void refreshKpi(); }, [loadDetail, refreshKpi]);
  useEffect(() => { void loadParticipants(); }, [loadParticipants]);

  // Both post-write recovery and manual retry perform reads only.
  const loadSnapshot = async () => {
    const current = beginSnapshot();
    if (!current()) return;
    refreshLock.current = true;
    setRefreshing(true);
    void refreshKpi();
    const [detailOk, participantsOk] = await Promise.all([loadDetail(), loadParticipants()]);
    if (!current()) return;
    const required = !detailOk || !participantsOk;
    needsRefresh.current = required;
    setRefreshRequired(required); setRefreshing(false);
    if (!required) setSavedBeforeRefresh(false);
    refreshLock.current = false;
  };

  const refresh = async () => {
    if (writeLock.current || refreshLock.current) return;
    await loadSnapshot();
  };

  const mutate = async (write: () => Promise<unknown>, fallback: string, participant?: { id: string; payment: boolean }) => {
    if (writeLock.current || refreshLock.current || needsRefresh.current) return false;
    writeLock.current = true;
    const current = beginMutation();
    if (!current()) { writeLock.current = false; return false; }
    setPending(true); setError('');
    if (participant?.payment) setUpdatingPaymentId(participant.id);
    else if (participant) setUpdatingId(participant.id);
    try {
      await write();
    } catch (error) {
      if (current() && (error as { response?: { data?: { code?: string } } })?.response?.data?.code === 'PAYMENT_VERSION_CONFLICT') {
        needsRefresh.current = true; setRefreshRequired(true);
      }
      if (current()) setError(message(error, fallback));
      if (current()) { writeLock.current = false; setPending(false); setUpdatingId(null); setUpdatingPaymentId(null); }
      return false;
    }
    if (!current()) return false;
    setSavedBeforeRefresh(true);
    await loadSnapshot();
    if (!current()) return false;
    writeLock.current = false; setPending(false); setUpdatingId(null); setUpdatingPaymentId(null);
    // A failed refresh does not turn a successful write into a failed save.
    return true;
  };

  const handleExport = async () => {
    if (exportLock.current || writeLock.current || refreshLock.current || needsRefresh.current) return;
    exportLock.current = true;
    const current = beginExport();
    if (!current()) { exportLock.current = false; return; }
    setExportLoading(true);
    try { await exportParticipantsCSV(id, fundingParticipantFilters(filter, paymentFilter)); }
    catch (error) { if (current()) setError(message(error, 'CSV 다운로드에 실패했습니다.')); }
    finally { if (current()) { exportLock.current = false; setExportLoading(false); } }
  };

  return {
    trial, participantData, trialKpi, loading, participantsLoading, participantsError, kpiError,
    error, setError, filter, setFilter, paymentFilter, setPaymentFilter,
    actionLoading: pending || refreshing || refreshRequired,
    pending, refreshing, refreshRequired, savedBeforeRefresh, updatingId, updatingPaymentId, exportLoading,
    loadParticipants, refresh, handleExport,
    approve: () => mutate(() => approveTrialFirst(id), '승인에 실패했습니다.'),
    reject: (reason: string) => mutate(() => rejectTrialFirst(id, reason), '반려에 실패했습니다.'),
    changeStatus: (status: TrialStatus) => mutate(() => updateTrialStatus(id, status), '유통참여형 펀딩 상태 변경에 실패했습니다.'),
    retryForum: () => mutate(() => retryTrialForumSync(id), '포럼 개설을 다시 시도해 주세요.'),
    handleToggleRewardStatus: (participant: TrialParticipant) => mutate(
      () => updateParticipantRewardStatus(id, participant.id, participant.rewardStatus === 'fulfilled' ? 'pending' : 'fulfilled'),
      '상태 변경에 실패했습니다.', { id: participant.id, payment: false },
    ),
    handlePaymentStatusChange: (participant: TrialParticipant, input: UpdateParticipantPaymentInput) => mutate(
      () => updateParticipantPaymentStatus(id, participant.id, input),
      '입금 기록 저장에 실패했습니다.', { id: participant.id, payment: true },
    ),
  };
}
