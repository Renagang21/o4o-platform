import { AiRequestInput } from '@o4o/ui/ai';
import { useEffect, useRef, useState } from 'react';
import { prepareConsultationSupport, type ConsultationStation, type ConsultationSupportPoint,
  type ConsultationSupportResult, findConsultationProducts, type ConsultationProductSearchResult, type ConsultationSupportSourceProof } from '../../../api/consultationWorkspace';
import type { ConsultationProduct } from './ConsultationProducts';

const button = 'min-h-12 rounded-lg border px-4 py-3 disabled:opacity-50';
type Props = { organizationId: string; mode: string; product: ConsultationProduct | null;
  room: ConsultationStation | null; locked: boolean; inquiry?: string; onUseDraft: (text: string, source: ConsultationSupportSourceProof) => void; onAccessDenied?: () => void;
  onSelectProduct?: (product: ConsultationProduct) => void };
/** Private, transient pharmacist review; only an explicitly accepted customer draft leaves this panel. */
export function ConsultationSupportPanel({ organizationId, mode, product, room, locked, inquiry, onUseDraft, onAccessDenied, onSelectProduct }: Readonly<Props>) {
  const [question, setQuestion] = useState(''), [reference, setReference] = useState(''),
    [source, setSource] = useState(''), [reviewed, setReviewed] = useState(false);
  const [result, setResult] = useState<ConsultationSupportResult | null>(null),
    [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const generation = useRef(0), alive = useRef(false), lock = useRef(false);
  const [turns, setTurns] = useState<string[]>([]), [search, setSearch] = useState<ConsultationProductSearchResult | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { generation.current++; setResult(null); setError(''); setNotice(''); setReviewed(false); }, [organizationId, mode, product?.id, product?.kind, room?.epoch]);
  useEffect(() => { setQuestion(''); setReference(''); setSource(''); setTurns([]); setSearch(null); }, [organizationId, mode, room?.epoch]);
  const change = (update: () => void) => {
    generation.current++; update(); setResult(null); setError(''); setNotice('');
  };
  const prepare = async (useDraft = false) => {
    if (!product || lock.current || locked) return;
    const captured = result, request = ++generation.current;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const data = await prepareConsultationSupport({ mode, productKind: product.kind, productId: product.id,
        ...(room?.active ? { stationId: room.id, epoch: room.epoch } : {}),
        ...(useDraft ? { verifyOnly: true, sourceVersion: captured?.sourceVersion } : {
          question, ...(reference.trim() ? { reference: { text: reference, source, reviewed } } : {}),
        }),
      });
      if (!alive.current || request !== generation.current) return;
      if (data.organizationId !== organizationId || data.mode !== mode || data.productId !== product.id || data.productKind !== product.kind)
        throw new Error('상담 매장이나 상품이 변경되었습니다. 다시 확인해 주세요.');
      if (useDraft) {
        if (data.state !== 'verified' || data.sourceVersion !== captured?.sourceVersion || !captured?.brief)
          throw new Error('현재 근거로 다시 준비해 주세요.');
        onUseDraft(captured.brief.customerDraft.text, { mode, productKind: product.kind, productId: product.id, sourceVersion: captured.sourceVersion! });
        setNotice('검토한 고객 설명을 문장 영역에 넣었습니다. 문장을 확인한 뒤 안내를 준비해 주세요.');
      } else setResult(data);
    } catch (e) {
      if (alive.current && request === generation.current) {
        if ([401, 403, 409].includes((e as { status?: number }).status ?? 0)) setResult(null);
        if ([401, 403].includes((e as { status?: number }).status ?? 0)) {
          setQuestion(''); setReference(''); setSource(''); setReviewed(false);
          onAccessDenied?.();
        }
        setError((e as Error).message || '판단 지원을 준비하지 못했습니다. 질문과 자료를 유지했습니다.');
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const find = async () => {
    if (lock.current || locked || !question.trim()) return;
    const request = ++generation.current;
    lock.current = true; setBusy(true); setError(''); setSearch(null); setResult(null);
    try {
      const data = await findConsultationProducts({ mode, question, context: turns.slice(-3),
        ...(room?.active ? { stationId: room.id, epoch: room.epoch } : {}) });
      if (!alive.current || request !== generation.current) return;
      if (data.organizationId !== organizationId || data.mode !== mode) throw new Error('현재 상담을 다시 확인해 주세요.');
      setSearch(data); setTurns(previous => [...previous.filter(turn => turn !== question.trim()), question.trim()].slice(-3));
    } catch (cause) {
      if (alive.current && request === generation.current) {
        setError((cause as Error).message || '상담 후보를 찾지 못했습니다.');
        if ([401, 403].includes((cause as { status?: number }).status ?? 0)) { setTurns([]); onAccessDenied?.(); }
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  const brief = result?.brief;
  const cited = (p: ConsultationSupportPoint) => <li className="space-y-1" key={`${p.sourceIds.join(':')}:${p.text}`}>
    <p className="whitespace-pre-wrap break-words">{p.text}</p>
    <p className="text-xs text-slate-500">근거: {p.sourceIds.map(id => result?.sources?.find(s => s.id === id)?.title || id).join(' · ')}</p>
    {p.sourceIds.flatMap(id => {
      const source = result?.sources?.find(item => item.id === id);
      return (source?.urls ?? []).filter(url => /^https?:\/\//i.test(url)).map(url => <p key={`${id}:${url}`} className="text-xs break-all"><a href={url} target="_blank" rel="noopener noreferrer" className="underline">출처 확인</a>{source?.checkedOn && ` · 확인일 ${source.checkedOn}`}{source?.revision && ` · 자료 버전 ${source.revision.slice(0, 12)}`}</p>);
    })}
  </li>;
  return <details className="rounded-xl border bg-white p-4">
    <summary className="min-h-11 cursor-pointer content-center font-semibold">약사 판단 지원</summary>
    <div className="mt-3 space-y-4">
      <p className="text-sm">고객의 질문에서 시작합니다. 필요한 경우 현재 매장의 취급 상품과 승인 자료를 찾아 확인합니다.</p>
      <label className="block">확인할 질문<AiRequestInput aria-label="약사 판단 지원 질문" value={question} maxLength={1000}
        disabled={busy || locked} onChange={e => change(() => setQuestion(e.target.value))} /></label>
      {inquiry && <button className={button} disabled={busy || locked} onClick={() => change(() => setQuestion(inquiry))}>현재 고객 질문 사용</button>}
      {onSelectProduct && <button className={button} disabled={busy || locked || !question.trim()} onClick={() => void find()}>상담 맥락으로 매장 상품 찾기</button>}
      {!!turns.length && <details><summary>이번 상담에서 확인할 질문 ({turns.length})</summary><ul>{turns.map((turn, i) => <li key={i}>{turn}</li>)}</ul><button className={button} disabled={busy || locked} onClick={() => change(() => { setTurns([]); setSearch(null); })}>이번 상담 맥락 비우기</button></details>}
      {search && <div role="status" className="space-y-2 rounded border p-3"><p>{search.message}</p>{search.candidates.map(item => <button className={button} key={`${item.kind}:${item.id}`} disabled={busy || locked} onClick={() => { change(() => setSearch(null)); onSelectProduct?.(item); }}>{item.name} · 상품 확인</button>)}</div>}
      {product ? <p className="text-sm">선택 상품: {product.name} · 상품 사실과 전문 근거를 나누어 검토합니다.{product.kind === 'local' && ' 매장 자체 상품은 공통 표준자료가 연결되지 않을 수 있습니다.'}</p> : <p className="text-sm">상품 자료가 필요하면 맥락으로 후보를 찾거나 위의 상품 찾기를 사용할 수 있습니다. 상품이 필요 없는 상담은 그대로 이어가세요.</p>}
      {product && <details><summary className="min-h-11 cursor-pointer content-center">검토한 자료 보완·재사용</summary>
        <p className="text-sm">자료 부족·오류는 상품과 자료 버전, 확인할 항목으로 정리해 주세요. 고객 원문·이름·연락처는 옮기지 마세요. 작성·저장·중앙 제안·검토·승인은 각각 확인하며 AI 초안을 자동 학습하거나 게시하지 않습니다.</p>
        <a className="inline-flex min-h-11 items-center underline" href={`/store/products/multilingual/${product.kind}/${encodeURIComponent(product.id)}`} target="_blank" rel="noopener noreferrer">선택 상품의 기존 자료 편집 열기</a>
      </details>}
      <details><summary className="min-h-11 cursor-pointer content-center">전문 참고자료 추가</summary>
        <label className="block">전문 참고자료<textarea aria-label="상담 전문 참고자료" value={reference} maxLength={5000} disabled={busy || locked}
          className="mt-2 min-h-28 w-full rounded border p-3" onChange={e => change(() => { setReference(e.target.value); setReviewed(false); })} /></label>
        <label className="mt-3 block">전문 자료 출처·확인일<input aria-label="상담 전문 자료 출처" value={source} maxLength={400} disabled={busy || locked}
          className="mt-2 min-h-12 w-full rounded border p-3" onChange={e => change(() => { setSource(e.target.value); setReviewed(false); })} /></label>
        <label className="mt-3 flex min-h-11 items-center gap-2"><input type="checkbox" checked={reviewed} disabled={busy || locked || !reference.trim() || !source.trim()}
          onChange={e => change(() => setReviewed(e.target.checked))} />전문 자료의 출처와 내용을 확인했습니다</label>
      </details>
      <p className="text-xs text-slate-500">이름·연락처 등 고객 식별 정보는 넣지 마세요. 이 질문과 참고자료는 현재 작업에만 사용하며 장기 상담 이력에 저장하지 않습니다.</p>
      <button className={`${button} bg-teal-700 text-white`} disabled={busy || locked || !product || !question.trim() || (!!reference.trim() && (!source.trim() || !reviewed))}
        onClick={() => void prepare()}>{busy ? '확인 중…' : error ? '같은 근거로 다시 준비' : '근거로 판단 지원 준비'}</button>
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {result?.state === 'empty' && <p role="status">{result.message}</p>}
      {brief && <div role="region" className="space-y-4 rounded-lg border border-teal-200 p-4" aria-label="약사 검토 초안">
        <h3 className="font-semibold">상품 사실</h3>{brief.productFacts.length ? <ul className="space-y-3">{brief.productFacts.map(cited)}</ul> : <p>상품 원문에서 확인한 사실은 없습니다.</p>}
        <h3 className="font-semibold">전문 참고·판단할 사항</h3>{brief.professionalNotes.length ? <ul className="space-y-3">{brief.professionalNotes.map(cited)}</ul> : <p>별도로 제시된 전문 참고·판단 사항은 없습니다.</p>}
        {brief.nextQuestion && <p className="rounded bg-amber-50 p-3">추가로 확인할 질문: {brief.nextQuestion}</p>}
        <h3 className="font-semibold">고객에게 설명할 초안</h3><ul>{cited(brief.customerDraft)}</ul>
        <button className={button} disabled={busy || locked} onClick={() => void prepare(true)}>검토한 고객 설명 사용</button>
      </div>}
      {notice && <p role="status">{notice}</p>}
    </div>
  </details>;
}
