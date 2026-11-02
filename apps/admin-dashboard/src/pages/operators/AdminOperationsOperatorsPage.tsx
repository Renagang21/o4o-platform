import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { OperatorDialog } from '@o4o/operator-core-ui/operation-support';
import AdminOperationsDutySelection, { DAILY_OPERATION_MENUS as menus } from './AdminOperationsDutySelection';

type DialogMode = 'invite' | 'duties' | 'revoke';
const TITLES = { invite: '업무 운영자 초대', duties: '담당 업무 변경', revoke: '업무 운영자 해제' };
const ACTIONS = { invite: '초대 메일 보내기', duties: '담당 업무 저장', revoke: '지정 해제' };
function canSubmit(mode: DialogMode | null, busy: boolean, recipient: boolean, count: number, reason: string) {
  if (busy || !mode) return false;
  if (mode === 'invite') return recipient && count > 0;
  return reason.trim().length > 0;
}
interface Operator { id: string; name: string | null; email: string; status: string; isActive: boolean; menuKeys: string[]; version: string }
interface Candidate { userId: string; name: string | null; email: string; hasGoogleLink: boolean }
interface Invitation { id: string; scope_key: string; scope_type: string; invited_email: string | null; status: string; expired: boolean; accepted_user_id: string | null }
const failure = (error: unknown) => (error as { response?: { data?: { error?: unknown; message?: unknown; code?: unknown } } })?.response?.data;
function message(error: unknown) {
  const data = failure(error);
  if (typeof data?.error === 'string') return data.error;
  const detail = data?.error as { message?: unknown } | undefined;
  if (typeof detail?.message === 'string') return detail.message;
  if (typeof data?.message === 'string') return data.message;
  return '요청 결과를 확인하지 못했습니다. 입력 내용을 유지한 채 다시 확인해 주세요.';
}

export default function AdminOperationsOperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [target, setTarget] = useState<Operator | null>(null);
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [searchNotice, setSearchNotice] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [failureCode, setFailureCode] = useState('');
  const writing = useRef(false);
  const searchSequence = useRef(0);
  const loadSequence = useRef(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true); setError('');
    try {
      const [rows, pending] = await Promise.all([authClient.api.get('/admin/operations-operators'), authClient.api.get('/admin/service-operator-invitations')]);
      if (!Array.isArray(rows.data?.data) || !Array.isArray(pending.data?.data)) throw new Error('INVALID_RESPONSE');
      if (sequence !== loadSequence.current) return;
      setOperators(rows.data.data);
      setInvites(pending.data.data.filter((row: Invitation) => row.scope_type === 'platform' && row.scope_key === 'admin-operations' && row.status === 'pending'));
    } catch (error_) { if (sequence === loadSequence.current) setError(message(error_)); } finally { if (sequence === loadSequence.current) setLoading(false); }
  }, []);
  const cancelSearch = useCallback(() => { searchSequence.current++; loadSequence.current++; }, []);
  useEffect(() => { void load(); return cancelSearch; }, [load, cancelSearch]);
  useEffect(() => { if (dialog && error) feedback.current?.focus(); }, [dialog, error]);
  function open(kind: DialogMode, row: Operator | null = null) {
    setCompleted(false); setFailureCode(''); setSearchNotice('');
    searchSequence.current++; setCandidates([]); setCandidate(null); setQuery(''); setEmail(''); setReason(''); setError(''); setNotice(''); setTarget(row);
    setKeys(kind === 'invite' ? menus.map(menu => menu.key) : row?.menuKeys ?? []); setDialog(kind);
  }
  async function search() {
    setSearchNotice('');
    if (query.trim().length < 2) { setError('이름이나 이메일을 두 글자 이상 입력해 주세요.'); return; }
    const seq = ++searchSequence.current; setError(''); setCandidates([]); setCandidate(null);
    try {
      const response = await authClient.api.get('/admin/operator-assignments/candidates', { params: { q: query.trim() } });
      if (!Array.isArray(response.data?.data?.candidates)) throw new Error('INVALID_RESPONSE');
      if (seq === searchSequence.current) { setCandidates(response.data.data.candidates); if (!response.data.data.candidates.length) setSearchNotice('검색 결과가 없습니다. 공통 계정이 없다면 이메일로 초대하세요.'); }
    } catch (error_) { if (seq === searchSequence.current) setError(message(error_)); }
  }
  async function submit() {
    if (writing.current || !dialog || completed) return;
    writing.current = true; setBusy(true); setError(''); setFailureCode(''); setSearchNotice('');
    try {
      if (dialog === 'invite') {
        const response = await authClient.api.post('/admin/operations-operators', { ...(candidate ? { targetUserId: candidate.userId } : { email: email.trim() }), menuKeys: keys });
        if (response.data?.success !== true) throw new Error('INVITATION_RESULT_UNCONFIRMED');
        setNotice('업무 운영자 초대 메일을 발송했습니다. 본인 수락 후 Google 로그인으로 업무 운영을 이용할 수 있습니다.');
        setCompleted(true); searchSequence.current++; void load(); return;
      } else if (target) {
        await authClient.api.post(`/admin/operations-operators/${target.id}/${dialog}`, { menuKeys: keys, version: target.version, reason });
        setNotice(dialog === 'revoke' ? '업무 운영자 지정을 해제했습니다. 다른 서비스 권한은 유지됩니다.' : '담당 업무를 변경했습니다.');
      }
      searchSequence.current++; setDialog(null); await load();
    } catch (error_) { const code = failure(error_)?.code; setFailureCode(typeof code === 'string' ? code : ''); setError(message(error_)); } finally { writing.current = false; setBusy(false); }
  }
  async function manage(invite: Invitation, action: 'resend' | 'cancel') {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError(''); setNotice('');
    try { await authClient.api.post(`/admin/service-operator-invitations/${invite.id}/${action}`); setNotice(action === 'resend' ? '초대 메일을 다시 발송했습니다. 이전 링크는 사용할 수 없습니다.' : '초대를 취소했습니다.'); await load(); }
    catch (error_) { setError(message(error_)); } finally { writing.current = false; setBusy(false); }
  }
  return <section className="space-y-5">
    <h1 className="text-xl font-bold">업무 운영자 지정</h1>
    <p className="text-sm text-slate-600">관리자 사이트의 <Link to="/operations" className="text-blue-700 underline">업무 운영</Link>에서 일상업무를 처리할 사람을 지정합니다. 전체 관리자는 별도 지정 없이 모든 업무를 이용합니다.</p>
    <p className="text-sm text-slate-600">전체 관리자·서비스 Admin 권한은 부여하지 않습니다. 설정·중요 관리 업무와 독립 사업 내부 운영은 포함하지 않습니다.</p>
    <div className="flex flex-wrap gap-3"><button ref={trigger} type="button" disabled={busy || loading} onClick={() => open('invite')} className="rounded bg-blue-700 px-4 py-2 text-white">업무 운영자 초대</button><button type="button" disabled={busy || loading} onClick={() => void load()} className="rounded border px-4 py-2">목록 새로고침</button></div>
    {!dialog && error && <p role="alert" className="text-red-700">{error}</p>}{!dialog && notice && <output className="block">{notice}</output>}
    {loading && <output className="block">업무 운영자 확인 중…</output>}
    {!loading && !error && <>
      <h2 className="font-semibold">지정된 업무 운영자</h2>
      {!operators.length && <p>지정된 업무 운영자가 없습니다.</p>}
      <ul className="space-y-3">{operators.map(row => <li key={row.id} className="rounded border bg-white p-4">
        <p className="font-medium break-all">{row.name || '이름 없음'} · {row.email}</p><p className="mt-1 text-sm text-slate-600">담당 업무 {row.menuKeys.length}개 · {row.isActive && ['active','approved'].includes(row.status) ? '활성 계정' : '계정 상태 확인 필요'}</p>
        <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => open('duties', row)} className="rounded border px-3 py-2">담당 업무 변경</button><button type="button" disabled={busy} onClick={() => open('revoke', row)} className="rounded border border-red-200 px-3 py-2 text-red-700">업무 운영자 해제</button></div>
      </li>)}</ul>
      <h2 className="font-semibold">수락 대기 중인 초대</h2>
      {!invites.length && <p>수락 대기 중인 초대가 없습니다.</p>}
      <ul className="space-y-2">{invites.map(invite => <li key={invite.id} className="flex flex-wrap items-center gap-3 rounded border bg-white p-3"><span className="break-all">{invite.invited_email ?? '초대 정보 파기 완료'}</span><span>{invite.expired ? '만료' : '수락 대기'}</span>{!invite.expired && <button type="button" disabled={busy} onClick={() => void manage(invite, 'resend')}>재발송</button>}<button type="button" disabled={busy || invite.expired} onClick={() => void manage(invite, 'cancel')}>초대 취소</button></li>)}</ul>
    </>}
    {dialog && <OperatorDialog busy={busy} label={TITLES[dialog]} fallbackFocus={trigger} onCancel={() => { if (!writing.current) { searchSequence.current++; setDialog(null); } }} className="max-w-3xl rounded-xl bg-white p-5">
      <h2 className="text-lg font-semibold">{TITLES[dialog]}</h2>
      {dialog === 'invite' ? <div className="mt-4 space-y-3">
        <label className="block">기존 사용자 검색<input disabled={busy || completed} className="mt-1 block w-full rounded border p-2" value={query} onChange={event => { searchSequence.current++; setCandidate(null); setCandidates([]); setSearchNotice(''); setQuery(event.target.value); }} /></label>
        <button type="button" disabled={busy || completed} onClick={() => void search()} className="rounded border px-3 py-2">사용자 검색</button>
        {searchNotice && !completed && <p role="status" className="text-sm text-slate-600">{searchNotice}</p>}
        {candidates.map(row => <label key={row.userId} className="flex items-start gap-2 rounded border p-3"><input type="radio" disabled={busy || completed} name="operations-candidate" checked={candidate?.userId === row.userId} onChange={() => { setCandidate(row); setEmail(''); }} /><span className="break-all">{row.name || '이름 없음'} · {row.email}{!row.hasGoogleLink && <span className="block text-sm text-amber-800">업무 운영 이용 전 Google 계정 연결이 필요합니다.</span>}</span></label>)}
        <label className="block">미가입자 초대 이메일<input type="email" disabled={busy || completed} className="mt-1 block w-full rounded border p-2" value={email} onChange={event => { setEmail(event.target.value); setCandidate(null); }} /></label>
        <p className="text-sm text-slate-600">가입된 계정은 검색 후 선택하세요. 이메일 일치만으로 계정을 연결하지 않습니다. 초대 수락 전에는 운영 권한이 활성화되지 않습니다.</p>
      </div> : <p className="my-4 break-all">{target?.name} · {target?.email}</p>}
      {dialog !== 'revoke' ? <AdminOperationsDutySelection value={keys} onChange={setKeys} disabled={busy || completed} expanded={dialog === 'duties'} /> : <p>업무 운영자 지정을 해제합니다. 전체 관리자와 별도로 보유한 서비스·독립 사업 권한은 변경하지 않습니다.</p>}
      {dialog === 'duties' && <p className="my-3 text-sm text-slate-600">새 업무 분야의 권한이 필요한 경우 업무 운영자 초대를 다시 보내 본인 수락을 받아 주세요.</p>}
      {dialog !== 'invite' && <label className="block">처리 사유<textarea className="mt-1 block w-full rounded border p-2" maxLength={2000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>}
      <div className="sticky bottom-0 z-10 mt-5 space-y-3 border-t bg-white pt-3">
        {dialog === 'invite' && <p className="break-all text-sm text-slate-600">받는 사람: {candidate?.email || email.trim() || '위에서 사용자를 선택하거나 이메일을 입력해 주세요.'}</p>}
        {busy && !completed && <p role="status">{dialog === 'invite' ? '초대 메일 발송을 요청하고 있습니다…' : '변경 내용을 저장하고 있습니다…'}</p>}
        {error && <p ref={feedback} role="alert" tabIndex={-1} className="text-red-700">{error}</p>}
        {completed && <p role="status" className="text-emerald-800">{notice}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          {failureCode === 'INVITATION_MAIL_FAILED' && <button type="button" disabled={busy} onClick={() => { setDialog(null); void load(); }} className="rounded border px-3 py-2">초대 목록 확인</button>}
          <button type="button" disabled={busy} onClick={() => { searchSequence.current++; setDialog(null); }}>{completed ? '완료' : '취소'}</button>
          {!completed && <button type="button" disabled={!canSubmit(dialog, busy, Boolean(candidate || email.trim()), keys.length, reason)} onClick={() => void submit()} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{busy ? '처리 중…' : ACTIONS[dialog]}</button>}
        </div>
      </div>
    </OperatorDialog>}
  </section>;
}
