import { useEffect, useRef, useState } from 'react';
import { prepareConsultationSupport, type ConsultationStation, type ConsultationSupportPoint,
  type ConsultationSupportResult } from '../../../api/consultationWorkspace';
import type { ConsultationProduct } from './ConsultationProducts';

const button = 'min-h-12 rounded-lg border px-4 py-3 disabled:opacity-50';
type Props = { organizationId: string; mode: string; product: ConsultationProduct | null;
  room: ConsultationStation | null; locked: boolean; inquiry?: string; onUseDraft: (text: string) => void; onAccessDenied?: () => void };
/** Private, transient pharmacist review; only an explicitly accepted customer draft leaves this panel. */
export function ConsultationSupportPanel({ organizationId, mode, product, room, locked, inquiry, onUseDraft, onAccessDenied }: Props) {
  const [question, setQuestion] = useState(''), [reference, setReference] = useState(''),
    [source, setSource] = useState(''), [reviewed, setReviewed] = useState(false);
  const [result, setResult] = useState<ConsultationSupportResult | null>(null),
    [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const generation = useRef(0), alive = useRef(false), lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { generation.current++; setResult(null); setError(''); setNotice(''); setReviewed(false); }, [organizationId, mode, product?.id, product?.kind, room?.epoch]);
  useEffect(() => { setQuestion(''); setReference(''); setSource(''); }, [organizationId, mode, room?.epoch]);
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
        onUseDraft(captured.brief.customerDraft.text);
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
  const brief = result?.brief;
  const cited = (p: ConsultationSupportPoint) => <li className="space-y-1" key={`${p.sourceIds.join(':')}:${p.text}`}>
    <p className="whitespace-pre-wrap break-words">{p.text}</p>
    <p className="text-xs text-slate-500">근거: {p.sourceIds.map(id => result?.sources?.find(s => s.id === id)?.title || id).join(' · ')}</p>
  </li>;
  return <details className="rounded-xl border bg-white p-4">
    <summary className="min-h-11 cursor-pointer content-center font-semibold">약사 판단 지원</summary>
    {!product ? <p className="mt-3 text-sm">위의 상품 찾기·제품 설명에서 상담할 상품을 먼저 선택해 주세요.</p> : <div className="mt-3 space-y-4">
      <p className="text-sm">{product.name} · 상품 사실과 전문 근거를 나누어 확인하고 고객에게 전할 설명을 준비합니다.</p>
      <label className="block">확인할 질문<textarea aria-label="약사 판단 지원 질문" value={question} maxLength={1000}
        disabled={busy || locked} className="mt-2 min-h-24 w-full rounded border p-3" onChange={e => change(() => setQuestion(e.target.value))} /></label>
      {inquiry && <button className={button} disabled={busy || locked} onClick={() => change(() => setQuestion(inquiry))}>현재 고객 질문 사용</button>}
      <details><summary className="min-h-11 cursor-pointer content-center">전문 참고자료 추가</summary>
        <label className="block">전문 참고자료<textarea aria-label="상담 전문 참고자료" value={reference} maxLength={5000} disabled={busy || locked}
          className="mt-2 min-h-28 w-full rounded border p-3" onChange={e => change(() => { setReference(e.target.value); setReviewed(false); })} /></label>
        <label className="mt-3 block">전문 자료 출처·확인일<input aria-label="상담 전문 자료 출처" value={source} maxLength={400} disabled={busy || locked}
          className="mt-2 min-h-12 w-full rounded border p-3" onChange={e => change(() => { setSource(e.target.value); setReviewed(false); })} /></label>
        <label className="mt-3 flex min-h-11 items-center gap-2"><input type="checkbox" checked={reviewed} disabled={busy || locked || !reference.trim() || !source.trim()}
          onChange={e => change(() => setReviewed(e.target.checked))} />전문 자료의 출처와 내용을 확인했습니다</label>
      </details>
      <p className="text-xs text-slate-500">이름·연락처 등 고객 식별 정보는 넣지 마세요. 이 질문과 참고자료는 현재 작업에만 사용하며 장기 상담 이력에 저장하지 않습니다.</p>
      <button className={`${button} bg-teal-700 text-white`} disabled={busy || locked || !question.trim() || (!!reference.trim() && (!source.trim() || !reviewed))}
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
    </div>}
  </details>;
}
