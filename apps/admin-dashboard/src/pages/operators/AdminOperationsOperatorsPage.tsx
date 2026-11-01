import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { CENTRAL_OPERATION_MENUS } from '@o4o/types';
import { OperatorDialog } from '@o4o/operator-core-ui/operation-support';
import { CENTRAL_OPERATION_SERVICES } from './central-operation-groups';

const menus = CENTRAL_OPERATION_MENUS.filter(menu => menu.minimumRole === 'operator');
interface Operator { id: string; name: string | null; email: string; status: string; isActive: boolean; menuKeys: string[]; version: string }
interface Candidate { userId: string; name: string | null; email: string; hasGoogleLink: boolean }
interface Invitation { id: string; scope_key: string; scope_type: string; invited_email: string | null; status: string; expired: boolean; accepted_user_id: string | null }
const message = (error: unknown) => (error as { response?: { data?: { error?: string } } })?.response?.data?.error || '요청을 처리하지 못했습니다. 다시 조회해 주세요.';

export default function AdminOperationsOperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<'invite' | 'duties' | 'revoke' | null>(null);
  const [target, setTarget] = useState<Operator | null>(null);
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const searchSequence = useRef(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rows, pending] = await Promise.all([authClient.api.get('/admin/operations-operators'), authClient.api.get('/admin/service-operator-invitations')]);
      if (!Array.isArray(rows.data?.data) || !Array.isArray(pending.data?.data)) throw new Error('INVALID_RESPONSE');
      setOperators(rows.data.data);
      setInvites(pending.data.data.filter((row: Invitation) => row.scope_type === 'platform' && row.scope_key === 'admin-operations' && row.status === 'pending'));
    } catch (failure) { setError(message(failure)); } finally { setLoading(false); }
  }, []);
  const cancelSearch = useCallback(() => { searchSequence.current++; }, []);
  useEffect(() => { void load(); return cancelSearch; }, [load, cancelSearch]);
  function open(kind: 'invite' | 'duties' | 'revoke', row: Operator | null = null) {
    searchSequence.current++; setCandidates([]); setCandidate(null); setQuery(''); setEmail(''); setReason(''); setError(''); setNotice(''); setTarget(row);
    setKeys(kind === 'invite' ? menus.map(menu => menu.key) : row?.menuKeys ?? []); setDialog(kind);
  }
  async function search() {
    if (query.trim().length < 2) { setError('이름이나 이메일을 두 글자 이상 입력해 주세요.'); return; }
    const seq = ++searchSequence.current; setError(''); setCandidates([]); setCandidate(null);
    try {
      const response = await authClient.api.get('/admin/operator-assignments/candidates', { params: { q: query.trim() } });
      if (!Array.isArray(response.data?.data?.candidates)) throw new Error('INVALID_RESPONSE');
      if (seq === searchSequence.current) { setCandidates(response.data.data.candidates); if (!response.data.data.candidates.length) setNotice('검색 결과가 없습니다. 공통 계정이 없다면 이메일로 초대하세요.'); }
    } catch (failure) { if (seq === searchSequence.current) setError(message(failure)); }
  }
  async function submit() {
    if (writing.current || !dialog) return;
    writing.current = true; setBusy(true); setError('');
    try {
      if (dialog === 'invite') {
        await authClient.api.post('/admin/operations-operators', { ...(candidate ? { targetUserId: candidate.userId } : { email: email.trim() }), menuKeys: keys });
        setNotice('업무 운영자 초대 메일을 발송했습니다. 본인 수락 후 Google 로그인으로 업무 운영을 이용할 수 있습니다.');
      } else if (target) {
        await authClient.api.post(`/admin/operations-operators/${target.id}/${dialog}`, { menuKeys: keys, version: target.version, reason });
        setNotice(dialog === 'revoke' ? '업무 운영자 지정을 해제했습니다. 다른 서비스 권한은 유지됩니다.' : '담당 업무를 변경했습니다.');
      }
      searchSequence.current++; setDialog(null); await load();
    } catch (failure) { setError(message(failure)); } finally { writing.current = false; setBusy(false); }
  }
  async function manage(invite: Invitation, action: 'resend' | 'cancel') {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError(''); setNotice('');
    try { await authClient.api.post(`/admin/service-operator-invitations/${invite.id}/${action}`); setNotice(action === 'resend' ? '초대 메일을 다시 발송했습니다. 이전 링크는 사용할 수 없습니다.' : '초대를 취소했습니다.'); await load(); }
    catch (failure) { setError(message(failure)); } finally { writing.current = false; setBusy(false); }
  }
  return <section className="space-y-5">
    <h1 className="text-xl font-bold">업무 운영자 지정</h1>
    <p className="text-sm text-slate-600">관리자 사이트의 <Link to="/operations" className="text-blue-700 underline">업무 운영</Link>에서 일상업무를 처리할 사람을 지정합니다. 전체 관리자는 별도 지정 없이 모든 업무를 이용합니다.</p>
    <p className="text-sm text-slate-600">전체 관리자·서비스 Admin 권한은 부여하지 않습니다. 설정·중요 관리 업무와 독립 사업 내부 운영은 포함하지 않습니다.</p>
    <div className="flex flex-wrap gap-3"><button ref={trigger} type="button" disabled={busy} onClick={() => open('invite')} className="rounded bg-blue-700 px-4 py-2 text-white">업무 운영자 초대</button><button type="button" disabled={busy || loading} onClick={() => void load()} className="rounded border px-4 py-2">목록 새로고침</button></div>
    {!dialog && error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">업무 운영자 확인 중…</p> : error ? null : <>
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
    {dialog && <OperatorDialog busy={busy} label={dialog === 'invite' ? '업무 운영자 초대' : dialog === 'duties' ? '담당 업무 변경' : '업무 운영자 해제'} fallbackFocus={trigger} onCancel={() => { if (!writing.current) { searchSequence.current++; setDialog(null); } }} className="max-w-3xl rounded-xl bg-white p-5">
      <h2 className="text-lg font-semibold">{dialog === 'invite' ? '업무 운영자 초대' : dialog === 'duties' ? '담당 업무 변경' : '업무 운영자 해제'}</h2>
      {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
      {dialog === 'invite' ? <div className="mt-4 space-y-3">
        <label className="block">기존 사용자 검색<input className="mt-1 block w-full rounded border p-2" value={query} onChange={event => { searchSequence.current++; setCandidate(null); setCandidates([]); setQuery(event.target.value); }} /></label>
        <button type="button" disabled={busy} onClick={() => void search()} className="rounded border px-3 py-2">사용자 검색</button>
        {candidates.map(row => <label key={row.userId} className="flex items-start gap-2 rounded border p-3"><input type="radio" name="operations-candidate" checked={candidate?.userId === row.userId} onChange={() => { setCandidate(row); setEmail(''); }} /><span className="break-all">{row.name || '이름 없음'} · {row.email}{!row.hasGoogleLink && <span className="block text-sm text-amber-800">업무 운영 이용 전 Google 계정 연결이 필요합니다.</span>}</span></label>)}
        <label className="block">미가입자 초대 이메일<input type="email" className="mt-1 block w-full rounded border p-2" value={email} onChange={event => { setEmail(event.target.value); setCandidate(null); }} /></label>
        <p className="text-sm text-slate-600">가입된 계정은 검색 후 선택하세요. 이메일 일치만으로 계정을 연결하지 않습니다. 초대 수락 전에는 운영 권한이 활성화되지 않습니다.</p>
      </div> : <p className="my-4 break-all">{target?.name} · {target?.email}</p>}
      {dialog !== 'revoke' ? <fieldset disabled={busy} className="my-4 rounded border p-3"><legend>담당 일상업무</legend>
        <details open={dialog === 'duties'}><summary className="cursor-pointer py-2">{keys.length === menus.length ? '일상업무 전체' : '선택한 일상업무'} {keys.length}개 · 선택 변경</summary>
        <div className="mb-4 flex gap-4"><button type="button" onClick={() => setKeys(menus.map(menu => menu.key))}>일상업무 전체 선택</button><button type="button" onClick={() => setKeys([])}>선택 해제</button></div>
        {CENTRAL_OPERATION_SERVICES.map(([service, label]) => <section key={service} className="mb-4"><h3 className="mb-2 font-medium">{label}</h3><div className="grid gap-2 sm:grid-cols-2">{menus.filter(menu => menu.service === service).map(menu => <label key={menu.key} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={keys.includes(menu.key)} onChange={event => setKeys(old => event.target.checked ? [...old,menu.key] : old.filter(key => key !== menu.key))} />{menu.label}</label>)}</div></section>)}
        {!keys.length && <p className="text-amber-800">담당 업무가 없으면 업무 운영 화면을 이용할 수 없습니다.</p>}
        </details>
      </fieldset> : <p>업무 운영자 지정을 해제합니다. 전체 관리자와 별도로 보유한 서비스·독립 사업 권한은 변경하지 않습니다.</p>}
      {dialog !== 'invite' && <label className="block">처리 사유<textarea className="mt-1 block w-full rounded border p-2" maxLength={2000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>}
      <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => { searchSequence.current++; setDialog(null); }}>취소</button><button type="button" disabled={busy || (dialog === 'invite' ? (!candidate && !email.trim()) || !keys.length : !reason.trim())} onClick={() => void submit()} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{busy ? '처리 중…' : dialog === 'invite' ? '초대 메일 보내기' : dialog === 'duties' ? '담당 업무 저장' : '지정 해제'}</button></div>
    </OperatorDialog>}
  </section>;
}
