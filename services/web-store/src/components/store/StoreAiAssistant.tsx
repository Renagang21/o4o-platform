import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StoreMenuSectionItem } from '@o4o/store-ui-core';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { askStoreAi, storeAiError, type StoreAiTask } from '../../api/storeAi';
import { STORE_WORKSPACE_AREAS, type StoreWorkspaceArea } from '../../config/storeWorkspace';
import { isUnifiedServiceKey } from '../../lib/serviceContext';

interface Turn { question: string; answer: string; page: string }
interface Props { area: StoreWorkspaceArea | null; basePath: string; items: StoreMenuSectionItem[] }

/** One optional query channel across the store workspace. Domain editors remain the execution surface. */
export function StoreAiAssistant(props: Readonly<Props>) {
  const { user, isAuthenticated } = useAuth();
  const { organizationId, effectiveServiceKey, status } = useUnifiedStore();
  if (!isAuthenticated || !user?.id || !organizationId || status !== 'ready') return null;
  // Service-free store owners may use the existing general O4O query; this grants no service membership.
  const scopedService = props.basePath.match(/^\/work\/([^/]+)\/store$/)?.[1];
  const serviceId = isUnifiedServiceKey(scopedService) ? scopedService : effectiveServiceKey ?? 'neture';
  return <AssistantSession key={`${user.id}:${organizationId}:${serviceId}`} {...props} serviceId={serviceId} />;
}

function AssistantSession({ area, basePath, items, serviceId }: Readonly<Props & { serviceId: string }>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [task, setTask] = useState<StoreAiTask>('question');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number>();
  const [copyStatus, setCopyStatus] = useState('');
  const lock = useRef(false), mounted = useRef(true), input = useRef(question);
  input.current = question;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const page = STORE_WORKSPACE_AREAS.find(item => item.key === area)?.label ?? '매장 설정';

  const submit = async () => {
    const submitted = question.trim();
    if (lock.current || !submitted || submitted.length > 2000) return;
    lock.current = true; setBusy(true); setError(''); setCopyStatus('');
    const inputAtSubmit = question;
    try {
      const result = await askStoreAi({
        question: submitted, serviceId, task,
        contextData: {
          pageTitle: `내 매장 · ${page}`,
          serviceInfo: {
            purpose: '매장 업무를 한 단계씩 돕는다. 필요한 정보가 없으면 핵심 질문 하나만 하고, 충분하면 지금 끝낼 수 있는 작은 결과를 먼저 제시한다. 확인되지 않은 수치·상품 사실·완료 상태를 만들지 않는다. 소비자 주문·결제는 지원하지 않는다. 저장·게시·기기 적용은 사용자가 기존 화면에서 확인한다.',
            previousTurns: turns.slice(-3).map(turn => ({ ...turn, answer: turn.answer.slice(0, 2000) })),
          },
        },
      });
      if (!mounted.current) return;
      setTurns(previous => [...previous, { question: submitted, answer: result.answer!, page }].slice(-6));
      setRemaining(result.remainingQueries);
      if (input.current === inputAtSubmit) setQuestion('');
    } catch (cause) { if (mounted.current) setError(storeAiError(cause)); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(turns[turns.length - 1].answer);
      if (mounted.current) setCopyStatus('답변을 복사했습니다. 사용할 편집기에 붙여넣어 확인하세요.');
    } catch { if (mounted.current) setCopyStatus('복사하지 못했습니다. 답변을 선택해 복사해 주세요.'); }
  };

  return <section className="mt-3 rounded-xl border border-teal-200 bg-white" aria-label="내 매장 AI">
    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls={id}
      className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-teal-800">
      <span>내 매장 AI · {page}</span><span className="text-xs font-normal">{busy ? '답변 준비 중' : open ? '접기' : '필요한 일 말하기'}</span>
    </button>
    <div id={id} hidden={!open} className="space-y-3 border-t border-teal-100 p-4">
      <p className="text-sm text-slate-600">원하는 일을 말하면 필요한 내용부터 함께 정리합니다. 직접 입력한 내용과 최근 대화를 AI에 전달합니다. 저장·적용은 결과를 확인한 뒤 진행하세요.</p>
      {turns.length > 0 && <div role="log" aria-label="매장 AI 대화" aria-live="polite" className="max-h-96 space-y-4 overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm">
        {turns.map((turn, index) => <article key={index} className="space-y-2">
          <p className="whitespace-pre-wrap break-words font-semibold text-slate-800">{turn.question}</p>
          <p className="text-xs text-slate-500">{turn.page}에서 요청</p>
          <p className="whitespace-pre-wrap break-words text-slate-700">{turn.answer}</p>
        </article>)}
      </div>}
      <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor={`${id}-question`}>지금 하고 싶은 일 또는 이어서 답할 내용</label>
        <textarea id={`${id}-question`} value={question} maxLength={2000} rows={3}
          onChange={event => setQuestion(event.target.value)}
          placeholder="예: 이 상품을 처음 보는 고객에게 짧게 설명하고 싶어요."
          className="w-full rounded-lg border border-slate-300 p-3 text-base" />
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${id}-task`} className="text-sm">도움 방식</label>
          <select id={`${id}-task`} value={task} onChange={event => setTask(event.target.value as StoreAiTask)} disabled={busy} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">
            <option value="question">함께 정리</option><option value="summary">입력 내용 요약</option><option value="draft">검토할 문구 초안</option>
          </select>
          <button type="submit" disabled={busy || !question.trim()} className="min-h-11 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? '답변 준비 중…' : error ? '다시 요청' : '보내기'}</button>
          <button type="button" disabled={busy} onClick={() => { setTurns([]); setQuestion(''); setError(''); setCopyStatus(''); }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm disabled:opacity-50">새 작업</button>
          {turns.length > 0 && <button type="button" onClick={() => void copy()} className="min-h-11 px-3 text-sm text-teal-800 underline">답변 복사</button>}
        </div>
      </form>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {copyStatus && <p role="status" className="text-sm text-slate-600">{copyStatus}</p>}
      {remaining !== undefined && <p className="text-xs text-slate-500">이번 응답 기준 남은 질문 {remaining}회</p>}
      {items.length > 0 && <details className="rounded-lg border border-slate-200 p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-medium">{page}에서 작업 이어가기</summary>
        <nav aria-label="AI 다음 작업" className="mt-2 flex flex-wrap gap-2">{items.map(item => <Link key={item.key} to={`${basePath}${item.subPath}`} className="min-h-11 rounded-lg border border-slate-200 px-3 py-3 text-sm text-teal-800">{item.label}</Link>)}</nav>
      </details>}
    </div>
  </section>;
}
