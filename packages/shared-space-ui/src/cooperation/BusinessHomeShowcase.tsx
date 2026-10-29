import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { businessStoreHandoffPath } from './storeHandoffPath';
import { ContentRenderer } from '@o4o/content-editor';

type Client = { get(path: string, config?: { headers?: Record<string, string> }): Promise<{ data: { data: any } }> };
type Item = { id: string; kind: 'product' | 'content'; title: string; summary: string | null; body: string | null; hidden?: boolean };
type Props = Readonly<{ client: Client; businessKey: string; accountId?: string; organizationId?: string; cooperative?: boolean; operator?: boolean; only?: 'content'; externalSelection?: boolean; onEnterStore?: (path: string) => Promise<string> }>;

/** Shared member presentation. No prices or purchase permission are inferred from these cards. */
export function BusinessHomeShowcase(props: Props) {
  return <Showcase key={`${props.accountId}:${props.businessKey}:${props.organizationId}:${props.cooperative}:${props.operator}`} {...props} />;
}
function Showcase({ client, businessKey, accountId, organizationId, cooperative, operator, only, externalSelection, onEnterStore }: Props) {
  const [selected, setSelected] = useState(organizationId ?? '');
  const [stores, setStores] = useState<{ organizationId: string; organizationName: string }[] | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [moving, setMoving] = useState(false);
  const [entryError, setEntryError] = useState('');
  const pending = useRef(false);
  const generation = useRef({ version: 0 });
  useLayoutEffect(() => { const scope = generation.current; scope.version++; pending.current = false; setMoving(false); setEntryError(''); return () => { scope.version++; }; }, [selected]);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const enter = async (item: Item) => {
    if (!onEnterStore || !selected || cooperative || operator || pending.current) return;
    pending.current = true; setMoving(true); setEntryError('');
    const current = ++generation.current.version;
    try {
      const href = await onEnterStore(businessStoreHandoffPath(businessKey, selected, item.id));
      const destination = new URL(href);
      if (destination.origin !== 'https://store.neture.co.kr' || destination.pathname !== '/handoff') throw new Error('Invalid Store destination');
      if (mounted.current && generation.current.version === current) window.location.assign(href);
    }
    catch { if (mounted.current && generation.current.version === current) setEntryError('내 약국으로 이동하지 못했습니다. 약국 소속과 승인 상태를 확인한 뒤 다시 시도해 주세요.'); }
    finally { if (mounted.current && generation.current.version === current) { pending.current = false; setMoving(false); } }
  };
  useEffect(() => {
    if (!accountId || cooperative || operator || organizationId || externalSelection) return;
    let alive = true;
    setError(''); setStores(null);
    client.get('/work-scope/accessible-stores').then(r => {
      const list = r.data.data.stores;
      if (!Array.isArray(list)) throw new Error();
      if (alive) { setStores(list); if (list.length === 1) setSelected(list[0].organizationId); }
    }).catch(() => { if (alive) setError('소속 약국을 확인하지 못했습니다.'); });
    return () => { alive = false; };
  }, [client, accountId, cooperative, operator, organizationId, retry, externalSelection]);
  useEffect(() => {
    let alive = true;
    setItems(null);
    if (!accountId || (!cooperative && !operator && !selected)) return;
    setError('');
    const path = operator ? `/neture/operator/semi-franchises/${encodeURIComponent(businessKey)}/showcase`
      : `/neture/pharmacy/businesses/${encodeURIComponent(businessKey)}/showcase`;
    client.get(path, selected ? { headers: { 'X-Store-Organization-Id': selected } } : undefined).then(r => {
      const data = r.data.data;
      if (data.businessKey !== businessKey || !Array.isArray(data.items) || data.items.some((i: Item) =>
        !i || typeof i.id !== 'string' || typeof i.title !== 'string' || !['product','content'].includes(i.kind))) throw new Error();
      if (alive) setItems(data.items.filter((i: Item) => !i.hidden && (!only || i.kind === only)));
    }).catch(() => { if (alive) setError('진열 자료를 조회하지 못했습니다. 이 협업체의 가입·운영 자격을 확인해 주세요.'); });
    return () => { alive = false; };
  }, [client, businessKey, accountId, cooperative, operator, selected, retry, only]);
  return <section className="rounded-xl border p-5 space-y-4" aria-label="협업체 제품·콘텐츠">
    <h2 className="text-xl font-semibold">승인 제품 · 콘텐츠</h2>
    {entryError && <p role="alert">{entryError}</p>}
    {!accountId ? <p>로그인과 협업체 가입 승인 후 이용할 수 있습니다.</p> : <>
      {!cooperative && !operator && !organizationId && !externalSelection && <label className="block">이용 약국 <select aria-label="진열을 조회할 약국" value={selected} onChange={e => { setSelected(e.target.value); setItems(null); setError(''); }}>
        <option value="">약국 선택</option>{stores?.map(s => <option key={s.organizationId} value={s.organizationId}>{s.organizationName}</option>)}
      </select></label>}
      {error ? <div><p role="alert">{error}</p><button type="button" onClick={() => setRetry(n => n + 1)}>진열 다시 조회</button></div> :
        !cooperative && !operator && !selected ? <p>{stores === null && !organizationId && !externalSelection ? '소속 약국을 확인하고 있습니다…' : '이용할 약국을 선택해 주세요.'}</p> :
        items === null ? <output>진열 자료를 불러오고 있습니다…</output> : !items.length ? <p>현재 진열된 제품·콘텐츠가 없습니다.</p> :
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <li key={item.id} className="min-w-0 rounded-lg border p-4 break-words">
            <p className="text-sm text-slate-500">{item.kind === 'product' ? '승인 제품' : '협업체 콘텐츠'}</p>
            <h3 className="font-semibold">{item.title}</h3>{item.summary && <p>{item.summary}</p>}
            {item.kind === 'content' && item.body && <details><summary>내용 보기</summary><ContentRenderer html={item.body} /></details>}
            {item.kind === 'product' && <p className="mt-3 text-sm">공급 조건 확인·주문은 가입한 약국의 내 매장에서 진행합니다.</p>}
            {onEnterStore && !cooperative && !operator && selected && <button type="button" disabled={moving} onClick={() => void enter(item)} className="mt-3 min-h-11 text-blue-700 underline">{moving ? '이동 중…' : item.kind === 'product' ? '내 약국에서 이 제안 확인' : '내 약국에서 이 자료 활용'}</button>}
          </li>)}</ul>}
    </>}
  </section>;
}
