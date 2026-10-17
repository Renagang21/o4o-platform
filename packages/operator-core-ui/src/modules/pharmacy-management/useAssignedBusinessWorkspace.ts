import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { neturePharmacyOperatorApi as api, type SemiFranchise } from './api';
import { DEFAULT_STATUS, isTab, type Msg, type Tab } from './assignedBusinessModel';

export interface BusinessDecision {
  id: string;
  label: string;
  needsReason: boolean;
  reasonRequired?: boolean;
  target: string;
  call: (reason?: string) => Promise<unknown>;
}
const errorText = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

function loadBusinessRows(key: string, tab: Tab, status: string) {
  switch (tab) {
    case 'memberships': return api.listSfMemberships(key, status);
    case 'proposals': return api.listProposals(key, status);
    case 'events': return api.listEvents(key, status);
    case 'recruitments': return api.listRecruitments(key, status);
    case 'contents': return api.listContents(key, status);
  }
}

/** 기존 담당 사업의 조회·심사 수명. 사업 scope와 요청 세대를 함께 소유한다. */
export function useAssignedBusinessWorkspace(businessKey?: string) {
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const initialTab: Tab = isTab(queryTab) ? queryTab : 'memberships';
  const initialKey = useRef(searchParams.get('key'));
  const [franchises, setFranchises] = useState<SemiFranchise[] | null>(null);
  const [sfKey, setSfKey] = useState('');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [status, setStatus] = useState(DEFAULT_STATUS[initialTab]);
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentRevision, setAssignmentRevision] = useState(0);
  const [message, setMessage] = useState<Msg>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decision, setDecision] = useState<BusinessDecision | null>(null);
  const [reason, setReason] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const decisionRef = useRef<BusinessDecision | null>(null);
  const submitting = useRef(false);
  const changingScope = useRef(false);
  const scope = `${sfKey}:${tab}:${status}`;
  const lifecycle = useRef({ mounted: false, scope, sequence: 0 });
  useLayoutEffect(() => {
    const state = { mounted: true, scope, sequence: 0 };
    lifecycle.current = state;
    changingScope.current = false;
    return () => { state.mounted = false; };
  }, [scope]);

  useEffect(() => {
    let active = true;
    setAssignmentError('');
    api.listAssignedSemiFranchises().then(assigned => {
      if (!active) return;
      const list = businessKey ? assigned.filter(f => f.key === businessKey) : assigned;
      setFranchises(list ?? []);
      if (list?.length) setSfKey(list.find(f => f.key === initialKey.current)?.key ?? list[0].key);
    }).catch(error => { if (active) setAssignmentError(errorText(error, '담당 사업을 불러오지 못했습니다.')); });
    return () => { active = false; };
  }, [businessKey, assignmentRevision]);

  const load = useCallback(async () => {
    if (!sfKey) return false;
    const state = lifecycle.current;
    const sequence = ++state.sequence;
    const current = () => state.mounted && lifecycle.current === state && state.sequence === sequence;
    setLoading(true); setRows([]); setLoadError('');
    try {
      const data = await loadBusinessRows(sfKey, tab, status);
      if (!Array.isArray(data)) throw new Error('목록 응답을 확인할 수 없습니다. 다시 조회해 주세요.');
      if (!current()) return false;
      setRows(data); return true;
    } catch (error) {
      if (current()) setLoadError(errorText(error, '목록을 불러오지 못했습니다.'));
      return false;
    } finally { if (current()) setLoading(false); }
  }, [sfKey, tab, status]);
  useEffect(() => { void load(); }, [load]);

  const run = (id: string, label: string, needsReason: boolean, call: BusinessDecision['call'], target = id, reasonRequired = false) => {
    if (changingScope.current || submitting.current || decisionRef.current || loading || loadError) return;
    const next = { id, label, needsReason, call, target, reasonRequired };
    decisionRef.current = next; setDecision(next); setReason(''); setDecisionError(''); setMessage(null);
  };
  const cancelDecision = () => {
    if (submitting.current) return;
    decisionRef.current = null; setDecision(null); setReason(''); setDecisionError('');
  };
  const confirmDecision = async () => {
    const selected = decisionRef.current;
    if (changingScope.current || !selected || submitting.current || loading || loadError) return;
    if (selected.reasonRequired && !reason.trim()) { setDecisionError('반려 사유를 입력해 주세요.'); return; }
    const state = lifecycle.current;
    const current = () => state.mounted && lifecycle.current === state;
    submitting.current = true; setBusyId(selected.id); setDecisionError('');
    try {
      await selected.call(selected.needsReason ? reason.trim() || undefined : undefined);
      if (!current()) return;
      decisionRef.current = null; setDecision(null); setReason('');
      setMessage({ type: 'success', text: `${selected.label} 처리했습니다.` });
      const refreshed = await load();
      if (current() && !refreshed) setMessage({ type: 'success', text: `${selected.label} 처리는 완료되었습니다. 목록 다시 조회로 결과를 확인해 주세요.` });
    } catch (error) {
      if (current()) setDecisionError(errorText(error, '처리하지 못했습니다. 다시 시도해 주세요.'));
    } finally {
      submitting.current = false;
      if (current()) setBusyId(null);
    }
  };
  const clearRows = () => { changingScope.current = true; setRows([]); setLoading(true); setMessage(null); };
  const locked = () => submitting.current || decisionRef.current !== null;
  const selectBusiness = (key: string) => {
    if (locked() || key === sfKey || !franchises?.some(f => f.key === key)) return;
    clearRows(); setSfKey(key);
  };
  const selectTab = (next: Tab) => {
    if (locked() || next === tab) return;
    clearRows(); setTab(next); setStatus(DEFAULT_STATUS[next]);
  };
  const selectStatus = (next: string) => {
    if (locked() || next === status) return;
    clearRows(); setStatus(next);
  };
  return { franchises, sfKey, tab, status, rows, loading, loadError, assignmentError, message, busyId,
    decision, reason, setReason, decisionError, run, confirmDecision, cancelDecision,
    interactionLocked: decision !== null || busyId !== null, load,
    retryAssignments: () => setAssignmentRevision(value => value + 1), selectBusiness, selectTab, selectStatus };
}
