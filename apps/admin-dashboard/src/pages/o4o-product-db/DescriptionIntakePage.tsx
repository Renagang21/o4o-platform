import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Link } from 'react-router-dom';
import { descriptionIntakeApi as api, type DescriptionEntry, type IntakeDetail, type IntakeRow, type DescriptionTarget } from '@/api/product-description-intake.api';
import { readPublicDescriptionCatalog } from './description-intake/catalogAdapter';
import { useProductDbWriteAccess, ProductDbReadOnlyNotice } from './useProductDbWriteAccess';
const box = 'rounded border p-3 w-full';
const button = 'rounded border px-3 py-2 disabled:opacity-40';
const Html = ({ html }: { html: string }) => <div className="prose max-w-none break-words overflow-auto max-h-96" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;

export default function DescriptionIntakePage() {
  const writable = useProductDbWriteAccess();
  const [entries, setEntries] = useState<DescriptionEntry[]>([]), [preview, setPreview] = useState<Array<{ entry: DescriptionEntry; targets: DescriptionTarget[] }>>([]);
  const [rows, setRows] = useState<IntakeRow[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [status, setStatus] = useState('pending');
  const [detail, setDetail] = useState<IntakeDetail | null>(null), [body, setBody] = useState(''), [selected, setSelected] = useState<string[]>([]), [archived, setArchived] = useState(false), [note, setNote] = useState('');
  const [purpose, setPurpose] = useState<DescriptionEntry['descriptionType']>('B2B'), [language, setLanguage] = useState<DescriptionEntry['language']>('ko');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [progress, setProgress] = useState('');
  const generation = useRef(0), listGeneration = useRef(0);
  const list = async () => { const key = ++listGeneration.current; try { const result = await api.list(page, status); if (key === listGeneration.current) { setRows(result.items); setTotal(result.total); } } catch { if (key === listGeneration.current) setMessage('검토 목록을 불러오지 못했습니다.'); } };
  useEffect(() => { void list(); return () => { listGeneration.current++; }; }, [page, status]);
  useEffect(() => () => { generation.current++; }, []);
  const show = (d: IntakeDetail) => { setDetail(d); setBody(d.entry.content); setSelected([]); setArchived(false); setNote(''); };
  const run = async (task: () => Promise<void>) => { setBusy(true); setMessage(''); try { await task(); } catch { setMessage('처리하지 못했습니다. 최신 자료를 다시 열어 입력·선택·변경 여부를 확인하세요.'); } finally { setBusy(false); } };
  const open = (id: string) => { const key = ++generation.current; void run(async () => { const d = await api.detail(id); if (generation.current === key) show(d); }); };
  const loadFile = (file: File | undefined) => { if (!file) { return; }
    void run(async () => {
    setEntries([]); setPreview([]); setProgress('');
    if (file.size > 40 * 1024 * 1024) throw new Error('File too large');
    const result = readPublicDescriptionCatalog(JSON.parse(await file.text()), purpose, language);
    setEntries(result.entries); setMessage(`${result.entries.length}개 설명 준비 · 본문 없는 ${result.excludedEmpty}개 제외. 아래에서 기존 상품과 비교한 후 검토 대기로 등록하세요.`);
  }); };
  const compare = () => void run(async () => {
    const result: typeof preview = [];
    for (let i = 0; i < entries.length; i += 20) { const batch = await api.preview(entries.slice(i, i + 20)); result.push(...batch.items); setProgress(`비교 ${Math.min(i + 20, entries.length)}/${entries.length}`); }
    setPreview(result); setProgress('비교 완료 — 상품과 설명은 변경되지 않았습니다.');
  });
  const submit = () => void run(async () => {
    let replayed = 0;
    for (let i = 0; i < preview.length; i += 20) {
      const result = await api.submit(preview.slice(i, i + 20).map(item => item.entry)); replayed += result.items.filter(item => item.replayed).length;
      setProgress(`검토 등록 ${Math.min(i + 20, preview.length)}/${preview.length}`);
    }
    setMessage(`검토 대기 등록 완료 · 기존 접수 ${replayed}개 재사용. 공통 설명은 승인 전까지 변경되지 않습니다.`); await list();
  });
  const mutable = writable && detail && ['pending', 'reviewing'].includes(detail.status);
  return <div className="space-y-5">
    <h2 className="text-xl font-semibold">공개자료·매장 제안 설명서</h2>
    <p>정부 공개자료 → 제조사 공개 상세설명 순으로 근거를 확인합니다. 상품명은 기존 O4O 상품에서 확인하며, 포장별 상품을 선택해도 같은 상담 본문을 연결할 수 있습니다.</p>
    {!writable && <ProductDbReadOnlyNotice />}
    <section className="space-y-3 rounded border p-4">
      <h3 className="font-semibold">준비된 설명 JSON 가져오기</h3>
      <div className="flex flex-wrap gap-3">
        <label>목적 <select aria-label="가져올 설명 목적" value={purpose} disabled={busy} onChange={e => { setPurpose(e.target.value as typeof purpose); setEntries([]); setPreview([]); }} className={box}>{['B2B', 'B2C', 'STORE', 'SUPPLIER_STORE'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>언어 <select aria-label="가져올 설명 언어" value={language} disabled={busy} onChange={e => { setLanguage(e.target.value as typeof language); setEntries([]); setPreview([]); }} className={box}>{['ko', 'en', 'ja', 'zh'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>설명 파일 <input type="file" accept=".json,application/json" disabled={busy} onChange={e => loadFile(e.target.files?.[0])} className={box} /></label>
      </div>
      <p className="text-sm text-gray-600">descriptions.json 형식 · 최대 40MB. POS 원본·주문·가격은 가져오지 않습니다. 본문 없는 항목은 저장하지 않습니다.</p>
      <button className={button} disabled={busy || !entries.length} onClick={compare}>기존 상품·설명 비교 ({entries.length})</button>{' '}
      <button className={button} disabled={busy || !writable || !preview.length} onClick={submit}>비교한 설명을 검토 대기로 등록</button>
      <output className="block" aria-live="polite">{progress}</output>
      {preview.length > 0 && <div className="max-h-72 overflow-auto"><p>연결 후보 있음 {preview.filter(i => i.targets.length).length}개 · 미연결 {preview.filter(i => !i.targets.length).length}개</p>{preview.map((item, i) => <div key={`${item.entry.key}:${i}`} className="border-t py-2">{item.entry.name} · {item.targets.length}개 상품 후보 · 기존 설명 {item.targets.filter(t => t.canonical).length}개 · {item.entry.source.currentness === 'archived' ? '보관자료 / 현행성 미확인' : item.entry.source.kind}</div>)}</div>}
    </section>
    <output className="block text-blue-800">{message}</output>
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center"><h3 className="font-semibold">설명 검토 ({total})</h3><select aria-label="검토 상태" value={status} disabled={busy} onChange={e => { setStatus(e.target.value); setPage(1); }}>{[['pending', '대기'], ['reviewing', '검토 중'], ['matched', '반영 완료'], ['rejected', '제외'], ['all', '전체']].map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select><button className={button} disabled={busy} onClick={() => void list()}>새로고침</button></div>
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-2">{rows.map(row => <button disabled={busy} key={row.id} onClick={() => open(row.id)} className={`${box} text-left ${detail?.id === row.id ? 'bg-blue-50' : ''}`}>{row.name}<small className="block">{row.descriptionType} / {row.language} · {row.source.kind} {row.source.currentness === 'archived' ? '· 보관자료' : ''}</small></button>)}{!rows.length && <p>해당 상태의 설명이 없습니다.</p>}
          <div className="flex gap-3"><button className={button} disabled={busy || page === 1} onClick={() => setPage(p => p - 1)}>이전</button><span>{page}</span><button className={button} disabled={busy || page * 20 >= total} onClick={() => setPage(p => p + 1)}>다음</button></div>
        </div>
        {detail && <div className="min-w-0 space-y-3 rounded border p-4">
          <h3 className="font-semibold">{detail.entry.name} · {detail.entry.descriptionType} / {detail.entry.language}</h3>
          <p>{detail.entry.manufacturer} · {detail.entry.category} · {detail.status}</p>
          <p>근거: {detail.entry.source.kind} · 확인일 {detail.entry.source.checkedOn ?? '미확인'} · {detail.entry.source.currentness}</p>
          {detail.entry.source.references.map(ref => <a key={ref.url} href={ref.url} target="_blank" rel="noopener noreferrer" className="block text-blue-700 break-all">{ref.label || ref.url}</a>)}
          {detail.entry.source.currentness === 'archived' && <label className="block bg-amber-50 p-3"><input type="checkbox" checked={archived} disabled={busy || !mutable} onChange={e => setArchived(e.target.checked)} /> 현행성이 재확인되지 않은 보관자료임을 확인했습니다.</label>}
          {detail.authorContext && <div className="rounded border p-3 whitespace-pre-wrap"><h4>작성자가 입력한 근거 (별도 검토 필요)</h4><p>상품 사실: {detail.authorContext.facts}</p><p>출처: {detail.authorContext.factSource}</p><p>전문 참고: {detail.authorContext.reference}</p><p>출처: {detail.authorContext.referenceSource}</p></div>}
          {!!detail.entry.aiSections?.length && <details className="rounded border p-3"><summary>AI 구조화 항목·근거 ({detail.entry.aiSections.length})</summary>
            <p className="text-sm">자유 HTML 본문을 수정하면 이전 구조화 항목은 해제됩니다. 항목을 보완하려면 수정한 원천 JSON을 다시 접수하세요.</p>
            {detail.entry.aiSections.map(section => <section key={section.key} className="my-2 whitespace-pre-wrap break-words"><h4>{section.kind} · {section.title}</h4><p>{section.text}</p>{section.referenceUrls.map(url => <p key={url}>{url}</p>)}</section>)}
          </details>}
          <label className="block">검토 본문 (HTML)<textarea aria-label="검토 본문" className={`${box} h-48 font-mono text-sm`} value={body} disabled={!mutable || busy} onChange={e => setBody(e.target.value)} /></label>
          <button className={button} disabled={!mutable || busy || body === detail.entry.content} onClick={() => void run(async () => show(await api.edit(detail.id, detail.revision, body)))}>수정 본문 저장</button>
          <Html html={body} />
          <h4 className="font-semibold">반영할 기존 상품을 직접 선택</h4>
          {!detail.targets.length && <p>연결할 기존 상품이 없습니다. <Link className="text-blue-700" to="/admin/o4o-product-db/masters">기본 상품을 확인</Link>한 뒤 이 설명을 다시 여세요. 자동으로 상품을 만들지 않습니다.</p>}
          {detail.targets.map(target => <div key={target.id} className="rounded border p-3 space-y-2"><label><input type="checkbox" checked={selected.includes(target.id)} disabled={!mutable || busy} onChange={e => setSelected(ids => e.target.checked ? [...ids, target.id] : ids.filter(id => id !== target.id))} /> {target.name} · {target.manufacturer} · {target.barcode} · 연결 근거 {target.matchedBy}</label><p>현재 공통 설명</p>{target.canonical ? <Html html={target.canonical.content} /> : <p>이 목적·언어의 설명 없음</p>}</div>)}
          <p className="text-sm">승인하면 선택한 상품의 같은 목적·언어 설명을 교체합니다. 다른 목적·언어 설명은 유지합니다.</p>
          <button className={button} disabled={!mutable || busy || !selected.length || body !== detail.entry.content || (detail.entry.source.currentness === 'archived' && !archived)} onClick={() => void run(async () => { show(await api.approve(detail, detail.targets.filter(t => selected.includes(t.id)), archived)); setMessage('선택한 상품에 설명을 반영했습니다.'); await list(); })}>선택 상품에 승인·반영 ({selected.length})</button>
          <label className="block">제외 사유<input className={box} value={note} disabled={!mutable || busy} onChange={e => setNote(e.target.value)} /></label><button className={button} disabled={!mutable || busy || !note.trim()} onClick={() => void run(async () => { show(await api.reject(detail, note)); await list(); })}>검토에서 제외</button>
          {detail.reviewNote && <p>{detail.reviewNote}</p>}
        </div>}
      </div>
    </section>
  </div>;
}
