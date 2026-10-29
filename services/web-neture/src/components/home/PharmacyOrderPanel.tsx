import { useCallback, useEffect, useRef, useState } from 'react';
import { HOME_CHAT_MAX_MESSAGE_LENGTH } from '../../lib/ai/home-chat';
import {
  PHARMACY_FORMAT, PHARMACY_LIMITS, parsePharmacyBundle, validatePharmacyBundle, groupOrderLines, sheetReceipts, orderPreparationRequest, packTotal,
  type PharmacyBundle, type PharmacyEntry, type OrderSheet, type OrderLine, type Supplier,
} from '../../lib/pharmacy/order';

import type { WorkScope } from '../../lib/work-scope';
import { loadWorkingData, workDataRequest, type WorkDataSnapshot, type WorkDataConsent } from '../../lib/pharmacy/work-data';

const uid = () => crypto.randomUUID();
const initial = (): PharmacyBundle => ({ format: PHARMACY_FORMAT, records: [{ kind: 'sheet', data: { id: uid(), title: '주문 준비', lines: [], status: 'draft' } }] });
const errorText = (e: unknown) => e instanceof Error ? e.message : '자료를 확인해 주세요.';
const download = (value: unknown, filename: string) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function mergeHistory(old:PharmacyBundle,records:PharmacyEntry[],edited:PharmacyEntry[]):PharmacyBundle {
  const key=(entry:PharmacyEntry)=>entry.kind+':'+entry.data.id;
  const rows=new Map(old.records.map(entry=>[key(entry),entry]));
  const dirty=new Set(edited.map(key));
  for(const entry of records)if(!dirty.has(key(entry)))rows.set(key(entry),entry);
  return {format:PHARMACY_FORMAT,records:[...rows.values()]};
}
/** Existing PC SQLite work data, with an explicitly consented server mirror. */
export default function PharmacyOrderPanel({ disabled, resuming, draft = '', onApply, onPcSetup, workScope }: Readonly<{ disabled: boolean; resuming: boolean; draft?: string; onApply: (text: string) => void; onPcSetup?: () => void; workScope?: WorkScope }>) {
  const [bundle, setBundle] = useState(initial);
  const [edited, setEdited] = useState<PharmacyEntry[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [storage, setStorage] = useState<WorkDataSnapshot | null>(null);
  const [sharing,setSharing]=useState(false);
  const [consent, setConsent] = useState<WorkDataConsent | null>(null);
  const saving = useRef(false);
  const [persisting,setPersisting]=useState(false);
  const [saveFailed,setSaveFailed]=useState(false);
  const dataGeneration=useRef(0);
  const [historyLoaded,setHistoryLoaded]=useState(false);
  const [historyPages,setHistoryPages]=useState<Record<string,string|null>>({});
  const [historyLoading,setHistoryLoading]=useState(false);
  const historyBusy=useRef(false);
  const editedRef=useRef(edited);editedRef.current=edited;
  const alive = useRef(true);
  async function loadHistory(reset=false) {
    if(!workScope || !storage || historyBusy.current)return;
    historyBusy.current=true;setHistoryLoading(true);setError('');
    const generation=dataGeneration.current;
    try{
      const records:PharmacyEntry[]=[],versions:NonNullable<WorkDataSnapshot['versions']>={},next={...historyPages};
      for(const kind of ['stock','availability']){
        if(!reset && historyLoaded && historyPages[kind]===null)continue;
        const page=await workDataRequest<WorkDataSnapshot>('read',workScope,{kind,limit:100,after:reset?null:historyPages[kind],deviceId:storage.deviceId,location:storage.location});
        if(!alive.current || generation!==dataGeneration.current)return;
        if(page.location!==storage.location || page.deviceId!==storage.deviceId || page.consent.owner!==storage.consent.owner || page.consent.epoch!==storage.consent.epoch)throw Error('자료 연결이 바뀌었어요. 다시 불러와 주세요.');
        records.push(...page.records);Object.assign(versions,page.versions);next[kind]=page.next;
      }
      if(!alive.current || generation!==dataGeneration.current)return;
      setBundle(old=>mergeHistory(old,records,editedRef.current));
      setStorage(old=>old?{...old,versions:{...old.versions,...versions}}:old);
      setHistoryPages(next);setHistoryLoaded(true);
    }catch(error){if(alive.current && generation===dataGeneration.current)setError(errorText(error));}
    finally{historyBusy.current=false;if(alive.current)setHistoryLoading(false);}
  }
  async function load(discardEdits=false) {
    if(!workScope || (edited.length && !discardEdits))return;
    dataGeneration.current++;setHistoryLoaded(false);setHistoryPages({});
    setBusy(true);setError('');
    try { const loaded=await loadWorkingData(workScope, count=>{if(!alive.current)throw Error('중단');setNotice(`${count.toLocaleString()}개 자료를 불러왔어요…`);});if(!alive.current)return;
      setStorage(loaded);setConsent(loaded.consent);
      if(discardEdits){setEdited([]);setSaveFailed(false);}
      setBundle({format:PHARMACY_FORMAT,records:loaded.records.some(r=>r.kind==='sheet')?loaded.records:[...loaded.records,...initial().records]});
      setNotice(loaded.location==='server'?'서버 자료를 불러왔어요. PC가 꺼져 있어도 이용할 수 있어요.':'PC 자료를 불러왔어요. 수정 내용은 PC에 저장해요.');
    }catch(e){if(alive.current)setError(errorText(e));}
    finally{if(alive.current)setBusy(false);}
  }
  const persist=useCallback(async()=>{
    if(!workScope || !storage || !edited.length || saving.current)return;
    saving.current=true;setSaveFailed(false);setPersisting(true);setError('');
    const pending=edited.slice(0,100);
    try {
      const result=await workDataRequest<any>('save',workScope,storage.location==='server'?{
        location:'server',epoch:storage.consent.epoch,changes:pending.map(entry=>({lane:'user',entry,expectedVersion:storage.versions?.[entry.kind+':'+entry.data.id]?.lane==='user'?storage.versions[entry.kind+':'+entry.data.id].version:0,mutationId:crypto.randomUUID()})),
      }:{mode:'user',records:pending,expectedRevision:storage.revision,deviceId:storage.deviceId,expectedOwner:storage.consent.owner});
      if(!alive.current)return;
      setStorage(old=>{if(!old)return old;const versions={...old.versions};for(const row of result.accepted??[])versions[row.kind+':'+row.id]={lane:row.lane,version:row.version};return {...old,revision:result.revision??old.revision,versions};});
      setEdited(old=>old.filter(entry=>!pending.includes(entry)));setNotice('저장했어요.');
    }catch(e){if(alive.current){setSaveFailed(true);setError(errorText(e)+( /CONFLICT|충돌|revision/i.test(errorText(e))?' 자료가 바뀌었어요. 수정 내용을 내보내거나 취소한 뒤 최신 자료를 불러와 주세요.':' 다시 저장할 수 있어요.')+' 입력한 내용은 유지했어요.');}}
    finally{saving.current=false;if(alive.current)setPersisting(false);}
  },[workScope,storage,edited]);
  async function importToPc() {
    if(!workScope || !bundle.records.length)return;
    dataGeneration.current++;setHistoryLoaded(false);setHistoryPages({});
    setBusy(true);setError('');let saved=0;
    try {
      let current=await workDataRequest<{revision:number;deviceId:string;owner:string}>('pc-read',workScope);
      current=await workDataRequest<{revision:number;deviceId:string;owner:string}>('save',workScope,{mode:'restore',records:bundle.records,expectedRevision:current.revision,deviceId:current.deviceId,expectedOwner:current.owner});
      saved=bundle.records.length;if(!alive.current)return;
      const permission=await workDataRequest<WorkDataConsent>('status',workScope);
      if(!alive.current)return;if(permission.owner!==current.owner)throw Error('업무 범위가 바뀌었어요. 자료를 다시 확인해 주세요.');setEdited([]);setStorage({location:'pc',deviceId:current.deviceId,revision:current.revision,consent:permission,records:bundle.records,next:null,counts:{}});
      setNotice('PC에 저장했어요. 서버 보관을 허용했다면 연결 중에 함께 동기화해요.');
    }catch(error){if(alive.current)setError((saved?`${saved}건을 PC에 반영했어요. 나머지 자료를 확인해 주세요. `:'')+errorText(error)+' 현재 화면과 파일은 유지돼요.');}
    finally{if(alive.current)setBusy(false);}
  }
  async function changeConsent(enabled:boolean) {
    if(!workScope || edited.length)return;
    dataGeneration.current++;setHistoryLoaded(false);setHistoryPages({});
    setBusy(true);setError('');
    try {const next=await workDataRequest<WorkDataConsent>('consent',workScope,{enabled});if(!alive.current)return;setConsent(next);setStorage(old=>enabled && old?.location==='pc'?{...old,consent:next}:null);setNotice(enabled?'서버 보관을 허용했어요. PC가 연결되면 자료가 동기화돼요.':'서버 보관을 해제하고 서버 업무 자료를 삭제했어요. PC 자료는 유지돼요.');}
    catch(e){if(alive.current)setError(errorText(e));}finally{if(alive.current)setBusy(false);}
  }
  useEffect(()=>{
    let active=true;
    if(workScope)void Promise.all([workDataRequest<WorkDataConsent>('status',workScope),workDataRequest<{enabled:boolean}>('method-sharing',workScope)]).then(([permission,sharing])=>{if(active){setConsent(permission);setSharing(sharing.enabled);}}).catch(()=>{});
    return()=>{active=false;};
  },[workScope]);
  const lastPrepared = useRef({ text: '', base: '' });
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(()=>{
    if(!storage || !edited.length || busy || persisting || saveFailed)return;
    const timer=setTimeout(()=>void persist(),600);
    return()=>clearTimeout(timer);
  },[storage,edited,busy,persisting,saveFailed,persist]);
  useEffect(()=>{
    if(!edited.length)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[edited.length]);
  const sheets = bundle.records.filter((r): r is Extract<PharmacyEntry, {kind: 'sheet'}> => r.kind === 'sheet');
  const sheet = sheets.find(r => r.data.id === selected)?.data ?? sheets[0]?.data;
  const suppliers = bundle.records.filter((r): r is Extract<PharmacyEntry, {kind: 'supplier'}> => r.kind === 'supplier');
  const products = bundle.records.filter((r): r is Extract<PharmacyEntry, {kind: 'product'}> => r.kind === 'product');
  const packs = bundle.records.filter((r): r is Extract<PharmacyEntry, {kind: 'pack'}> => r.kind === 'pack');
  const [supplierName, setSupplierName] = useState('');
  const [site, setSite] = useState('');
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [packId, setPackId] = useState('');
  const [packLabel, setPackLabel] = useState('');
  const [count, setCount] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [receipt, setReceipt] = useState('');
  const [receiptSupplier, setReceiptSupplier] = useState('');
  const receipts = sheet ? sheetReceipts(sheet) : [];
  const pendingSuppliers = sheet ? groupOrderLines(sheet).filter(g => g.supplierId && !receipts.some(r => r.supplier_id === g.supplierId)).map(g => g.supplierId) : [];
  const nextReceiptSupplier = pendingSuppliers.includes(receiptSupplier) ? receiptSupplier : pendingSuppliers[0] ?? '';
  const [stockProduct, setStockProduct] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockUnit, setStockUnit] = useState('');
  const [stockConfirmed, setStockConfirmed] = useState(false);
  const blocked = disabled || busy;
  function save(entry: PharmacyEntry) {
    const matches = (r: PharmacyEntry) => r.kind === entry.kind && r.data.id === entry.data.id;
    const records = bundle.records.some(matches) ? bundle.records.map(r => matches(r) ? entry : r) : [...bundle.records, entry];
    const next = validatePharmacyBundle({ format: PHARMACY_FORMAT, records },{batch:false});
    setBundle(next); setEdited(old => [...old.filter(r => r.kind !== entry.kind || r.data.id !== entry.data.id), entry]);
    setSaveFailed(false);
    setNotice(storage?'수정 내용을 저장하고 있어요.':'현재 화면에 반영했어요. PC·서버 자료를 연결하거나 파일로 보관해 주세요.');
  }
  function attempt(action: () => void) { setError(''); setNotice(''); try { action(); } catch (e) { setError(errorText(e)); } }
  function updateSheet(next: OrderSheet) { save({ kind: 'sheet', data: next }); }
  function editLine(lineId: string) {
    const line = sheet?.lines.find(l => l.id === lineId); if (!line || !sheet) return;
    setName(line.product_name); setProductId(line.product_id ?? ''); setPackId(line.pack_id ?? ''); setPackLabel(line.pack_label); setCount(line.pack_count === null ? '' : String(line.pack_count)); setSupplierId(line.supplier_id ?? '');
    // Keep the original until replacement succeeds; the editor carries its id.
    setEditingLine(lineId);
  }
  const [editingLine, setEditingLine] = useState('');
  function addLine() {
    if (!sheet) return;
    if (editingLine && !sheet.lines.some(l => l.id === editingLine)) throw Error('편집하던 행이 삭제됐습니다. 입력을 확인하고 새 행으로 추가하세요.');
    const line: OrderLine = { id: editingLine || uid(), product_name: name.trim(), pack_label: packLabel.trim(), pack_count: count === '' ? null : Number(count), ...(supplierId ? { supplier_id: supplierId } : {}), ...(productId ? { product_id: productId } : {}), ...(packId ? { pack_id: packId } : {}) };
    updateSheet({ id: sheet.id, title: sheet.title, status: 'draft', lines: editingLine ? sheet.lines.map(l => l.id === editingLine ? line : l) : [...sheet.lines, line] });
    setName(''); setProductId(''); setPackId(''); setPackLabel(''); setCount(''); setEditingLine('');
  }
  function deleteLine(lineId: string) {
    if (!sheet) return;
    updateSheet({ id: sheet.id, title: sheet.title, status: 'draft', lines: sheet.lines.filter(l => l.id !== lineId) });
    if (editingLine === lineId) { setEditingLine(''); setName(''); setProductId(''); setPackId(''); setPackLabel(''); setCount(''); }
  }
  function prepare(supplier: string, mode: 'prepare'|'availability') {
    if (!sheet || resuming) throw Error('진행 중인 질문에 먼저 답하거나 업무를 마친 뒤 새 주문 요청을 준비하세요.');
    const request = orderPreparationRequest(bundle, sheet.id, supplier, mode);
    const base = draft === lastPrepared.current.text ? lastPrepared.current.base : draft.trim();
    const text = base ? `${base}\n${request}` : request;
    if (text.length > HOME_CHAT_MAX_MESSAGE_LENGTH) throw Error('기존 입력을 유지했습니다. 입력창 내용을 먼저 정리한 뒤 주문 요청을 준비하세요.');
    lastPrepared.current = { text, base }; onApply(text);
    setNotice('입력창에만 반영했습니다. 요청 내용을 확인하고 실행하세요.');
  }
  return <details className="mt-3 w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700">
    <summary className="cursor-pointer font-semibold">약국 주문 준비</summary>
    <div className="mt-3 space-y-3">
      <p>{onPcSetup ? <button type="button" disabled={blocked} onClick={onPcSetup} className="underline">PC 설치·연결 준비</button> : <a href="/mypage" target="_blank" rel="noopener noreferrer" className="underline">이 PC 연결·프로그램 업데이트 (새 탭)</a>}</p>
      <p>빈 시트에서 시작할 수 있습니다. 구매·주문 내역은 약국 프로그램에서 내보낸 자료를 PC 연결 프로그램으로 가져옵니다. 전표 촬영·OCR은 사용하지 않습니다.</p>
      <p className="text-xs">연결한 자료의 수정은 자동 저장해요. 저장 실패 안내가 있으면 다시 시도해 주세요. 연결 전 작업은 파일로 보관할 수 있어요. 로그인·최종 주문·결제는 직접 진행합니다.</p>
      {workScope && <section className="space-y-2 rounded border p-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={blocked || edited.length>0} onClick={()=>void load()} className="rounded bg-blue-700 px-3 py-2 text-white">PC·서버 자료 불러오기</button>
          {saveFailed && <button type="button" disabled={blocked || persisting} onClick={()=>void load(true)} className="rounded border border-red-600 px-3 py-2 text-red-700">수정 취소하고 최신 자료 불러오기</button>}
          <button type="button" disabled={blocked || persisting || !storage || !edited.length} onClick={()=>void persist()} className="rounded bg-blue-700 px-3 py-2 text-white">자료 저장</button>
        </div>
        <p>{storage?`보관 위치: ${storage.location==='server'?'서버 · PC와 동기화':'이 PC'}`:'PC 자료는 기본적으로 PC에 보관해요.'}</p>
        {storage?.sync && <p className="text-xs">동기화 대기 {storage.sync.pending}건 · 충돌 {storage.sync.conflicts}건{storage.sync.lastSyncedAt?` · 마지막 확인 ${new Date(storage.sync.lastSyncedAt).toLocaleString()}`:''}</p>}
        {storage?.sync?.conflicts ? <p role="alert">PC 수정과 서버 수정이 달라 자동 반영을 멈췄어요. 양쪽 내용은 보존돼요. 사용할 내용을 확인하고 수정해 주세요.</p>:null}
        {storage?.updatedAt && <p className="text-xs">자료 수정 시각: {new Date(storage.updatedAt).toLocaleString()}</p>}
        <label className="flex items-start gap-2"><input type="checkbox" checked={consent?.enabled??false} disabled={blocked || edited.length>0} onChange={e=>void changeConsent(e.target.checked)} />어디서나 이용하도록 업무 자료를 서버에도 보관</label>
        <p className="text-xs">상품·거래처·주문·집계 자료를 보관해요. 해제하면 서버 사본은 삭제되고 PC 자료는 유지돼요. 로그인 정보와 환자 자료는 보내지 않아요.</p>
        {busy && <p role="status">자료를 확인하고 있어요…</p>}{persisting && <p role="status">수정 내용을 저장하고 있어요…</p>}
      </section>}
      {workScope && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={sharing} disabled={blocked} onChange={async e=>{const enabled=e.target.checked;setBusy(true);try{const next=await workDataRequest<{enabled:boolean}>('method-sharing',workScope,{enabled});if(alive.current)setSharing(next.enabled);}catch(error){if(alive.current)setError(errorText(error));}finally{if(alive.current)setBusy(false);}}} />검증된 동작 순서를 다른 사용자의 추천에 활용하도록 허용 (문장·거래 값·화면 글 제외)</label>}
      <label className="block">PC 자료함 JSON 가져오기
        <input type="file" accept=".json,application/json" disabled={blocked} onChange={async e => {
          const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!file) return;
          setError(''); setBusy(true);
          try {
            if (file.size > PHARMACY_LIMITS.fileBytes) throw Error('자료 파일은 8MB 이내로 준비하세요.');
            const parsed = parsePharmacyBundle(await file.text()); if (!alive.current) return;
            if ((!storage && bundle.records.some(r => r.kind !== 'sheet' || r.data.lines.length)) || edited.length) throw Error('현재 자료를 먼저 내보내고 새로고침한 뒤 가져오세요. 기존 작업을 덮어쓰지 않습니다.');
            dataGeneration.current++;setStorage(null);setHistoryLoaded(false);setHistoryPages({});
            setBundle(parsed.records.some(r => r.kind === 'sheet') ? parsed : { ...parsed, records: [...parsed.records, ...initial().records] });
            setSelected(''); setNotice('파일을 미리 보고 있어요. PC에 보관을 눌러야 저장돼요. 프로그램 출처와 상품·포장 연결을 확인하세요.');
          } catch (e) { if (alive.current) setError(errorText(e)); }
          finally { if (alive.current) setBusy(false); }
        }} className="mt-1 block w-full" />
      </label>
      {workScope && <button type="button" disabled={blocked || !!storage} onClick={()=>void importToPc()} className="rounded bg-blue-700 px-3 py-2 text-white">현재 자료를 PC에 보관</button>}
      <p className="text-xs">화면에 불러온 상품·거래처·포장·주문 시트와 조회한 이력만 파일에 담아요. 구매·사용량·판매·거래장 원본은 연결된 PC·서버에 보관돼요.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={blocked} onClick={() => attempt(() => download(validatePharmacyBundle(bundle), 'o4o-pharmacy-work.private.json'))} className="rounded border px-2 py-1">화면 자료 내보내기</button>
        <button type="button" disabled={blocked || !edited.length} onClick={() => attempt(() => download({ format: PHARMACY_FORMAT, records: edited }, 'o4o-pharmacy-user-edits.private.json'))} className="rounded border px-2 py-1">PC 반영용 수정 내보내기</button>
      </div>
      <p className="text-xs">내보낸 파일에는 약국 업무 자료가 포함됩니다. 본인의 PC·계정에서만 사용하세요. 수정 파일은 기존 SQLite 자료에 병합하며 원본 프로그램 내역을 대체하지 않습니다.</p>
      <fieldset disabled={blocked} className="space-y-2 rounded border p-3">
        <legend>거래처 추가</legend>
        <label className="block">거래처명<input aria-label="새 거래처명" value={supplierName} maxLength={200} onChange={e => setSupplierName(e.target.value)} className="block w-full rounded border p-2" /></label>
        <label className="block">주문 사이트 주소<input aria-label="새 주문 사이트" value={site} maxLength={500} placeholder="https://order.geoweb.kr/Member/Login" onChange={e => setSite(e.target.value)} className="block w-full rounded border p-2" /></label>
        <button type="button" disabled={!supplierName.trim()} onClick={() => attempt(() => {
          const supplier: Supplier = { id: uid(), name: supplierName.trim(), enabled: true, payment_timing: 'unknown', payment_required: null, ...(site.trim() ? { order_site_url: site.trim() } : {}) };
          save({ kind: 'supplier', data: supplier }); setSupplierId(supplier.id); setSupplierName(''); setSite('');
        })} className="rounded border px-2 py-1">거래처 추가</button>
      </fieldset>
      {suppliers.map(({ data: s }) => <fieldset key={s.id} disabled={blocked} className="space-y-2 rounded border p-3">
        <legend>{s.name}</legend>
        <p className="break-all">{s.order_site_url ?? '주문 사이트 미확인'} — 사이트 주소 등록은 자동화 지원·로그인 확인이 아닙니다.</p>
        <label className="block">결제 시점<select aria-label={`${s.name} 결제 시점`} value={s.payment_timing} onChange={e => attempt(() => save({ kind: 'supplier', data: { ...s, payment_timing: e.target.value as Supplier['payment_timing'], terms_checked_at: new Date().toISOString() } }))} className="ml-2 rounded border p-1"><option value="unknown">미확인</option><option value="deferred">후불</option><option value="at_order">주문 시</option></select></label>
        <label className="block">주문 접수에 결제 필요<select aria-label={`${s.name} 결제 필요`} value={s.payment_required === null ? 'unknown' : String(s.payment_required)} onChange={e => attempt(() => save({ kind: 'supplier', data: { ...s, payment_required: e.target.value === 'unknown' ? null : e.target.value === 'true', terms_checked_at: new Date().toISOString() } }))} className="ml-2 rounded border p-1"><option value="unknown">미확인</option><option value="true">예</option><option value="false">아니오</option></select></label>
      </fieldset>)}
      {products.length > 0 && <fieldset disabled={blocked} className="space-y-2 rounded border p-3">
        <legend>필요한 상품만 실물 재고 확인</legend>
        <label className="block">재고 확인 상품<select value={stockProduct} onChange={e => { setStockProduct(e.target.value); setStockConfirmed(false); }} className="block w-full rounded border p-2"><option value="">선택</option>{products.map(r => <option key={r.data.id} value={r.data.id}>{r.data.name}</option>)}</select></label>
        <label className="block">실물 확인 수량<input type="number" min="0" value={stockQuantity} onChange={e => { setStockQuantity(e.target.value); setStockConfirmed(false); }} className="block w-full rounded border p-2" /></label>
        <label className="block">실물 수량 단위<input maxLength={200} value={stockUnit} onChange={e => { setStockUnit(e.target.value); setStockConfirmed(false); }} className="block w-full rounded border p-2" /></label>
        <label className="flex gap-2"><input type="checkbox" checked={stockConfirmed} onChange={e => setStockConfirmed(e.target.checked)} />실물을 직접 확인했습니다</label>
        <button type="button" disabled={!stockProduct || stockQuantity === '' || !stockUnit.trim() || !stockConfirmed} onClick={() => attempt(() => {
          save({ kind: 'stock', data: { id: uid(), product_id: stockProduct, quantity: Number(stockQuantity), unit: stockUnit.trim(), confidence: 'confirmed', observed_at: new Date().toISOString() } });
          setStockConfirmed(false);
        })} className="rounded border px-2 py-1">현재 확인 재고 기록</button>
        <p className="text-xs">프로그램 재고·추정 재고와 별도로 보관합니다. 전체 상품 재고조사는 필요하지 않습니다.</p>
      </fieldset>}
      {sheets.length > 1 && <label className="block">주문 시트<select value={sheet?.id ?? ''} onChange={e => { setSelected(e.target.value); setEditingLine(''); setReceipt(''); setName(''); setProductId(''); setPackId(''); setPackLabel(''); setCount(''); }} disabled={blocked} className="ml-2 rounded border p-1">{sheets.map(r => <option key={r.data.id} value={r.data.id}>{r.data.title}</option>)}</select></label>}
      <button type="button" disabled={blocked} onClick={() => attempt(() => {
        const next: OrderSheet = { id: uid(), title: `주문 준비 ${sheets.length + 1}`, lines: [], status: 'draft' };
        save({ kind: 'sheet', data: next }); setSelected(next.id); setEditingLine(''); setReceipt(''); setName(''); setProductId(''); setPackId(''); setPackLabel(''); setCount('');
      })} className="rounded border px-2 py-1">새 주문 시트</button>
      {sheet && <>
        {receipts.map(r => <p key={r.supplier_id} className="break-words">직접 확인한 접수: {suppliers.find(s => s.data.id === r.supplier_id)?.data.name} / {r.reference} / {r.confirmed_at}</p>)}
        <p>상태: {{draft: '작성 중', prepared: '준비 확인', handed_over: '사용자에게 인계', receipt_recorded: '외부 접수 직접 확인'}[sheet.status]}</p>
        <fieldset disabled={blocked || receipts.length > 0} className="space-y-2 rounded border p-3">
          <legend>{editingLine ? '주문 행 수정' : '주문 상품 추가'}</legend>
          {products.length > 0 && <label className="block">가져온 상품<select aria-label="가져온 상품" value={productId} onChange={e => { setProductId(e.target.value); setPackId(''); setPackLabel(''); setName(products.find(r => r.data.id === e.target.value)?.data.name ?? ''); }} className="block w-full rounded border p-2"><option value="">직접 입력</option>{products.map(r => <option key={r.data.id} value={r.data.id}>{r.data.name} ({r.data.program_code})</option>)}</select></label>}
          <label className="block">상품명<input value={name} maxLength={200} onChange={e => { setName(e.target.value); setProductId(''); setPackId(''); }} className="block w-full rounded border p-2" /></label>
          {productId && <label className="block">등록된 포장<select value={packId} onChange={e => { setPackId(e.target.value); setPackLabel(packs.find(r => r.data.id === e.target.value)?.data.label ?? ''); }} className="block w-full rounded border p-2"><option value="">직접 확인</option>{packs.filter(r => r.data.product_id === productId).map(r => <option key={r.data.id} value={r.data.id}>{r.data.label}</option>)}</select></label>}
          <label className="block">포장규격<input value={packLabel} maxLength={200} onChange={e => { setPackLabel(e.target.value); setPackId(''); }} className="block w-full rounded border p-2" /></label>
          <label className="block">포장 개수<input type="number" min="1" max="1000000" step="1" value={count} onChange={e => setCount(e.target.value)} className="block w-full rounded border p-2" /></label>
          <label className="block">거래처<select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="block w-full rounded border p-2"><option value="">미정</option>{suppliers.filter(r => r.data.enabled).map(r => <option key={r.data.id} value={r.data.id}>{r.data.name}</option>)}</select></label>
          <button type="button" disabled={!name.trim()} onClick={() => attempt(addLine)} className="rounded border px-2 py-1">{editingLine ? '수정 반영' : '주문 행 추가'}</button>
        </fieldset>
        {groupOrderLines(sheet).map(g => <section key={g.supplierId} className="space-y-2 rounded border p-3">
          <h3 className="font-semibold">{suppliers.find(r => r.data.id === g.supplierId)?.data.name ?? '거래처 미정'}</h3>
          <ul className="space-y-2">{g.lines.map(l => { const pack = packs.find(r => r.data.id === l.pack_id)?.data; return <li key={l.id} className="break-words">
            {l.product_name} / {l.pack_label || '포장 미확인'} / {l.pack_count ?? '수량 미확인'}포장
            {pack && l.pack_count !== null && <span> = {packTotal(pack, l.pack_count)}{pack.base_unit}</span>}
            {l.product_id && l.pack_id && l.supplier_id && <label className="mt-1 block">직접 확인한 주문 가능 여부
              <select aria-label={`${l.product_name} 주문 가능 여부`} value="" disabled={blocked} onChange={e => {
                const state = e.target.value as 'available'|'out_of_stock'|'unconfirmed';
                if (!state) return;
                attempt(() => save({ kind: 'availability', data: { id: uid(), product_id: l.product_id!, pack_id: l.pack_id!, supplier_id: l.supplier_id!, state, source: 'user_observed', observed_at: new Date().toISOString() } }));
              }} className="ml-2 rounded border p-1"><option value="">조회 화면을 확인한 뒤 선택</option><option value="available">주문 가능 표시 확인</option><option value="out_of_stock">품절 표시 확인</option><option value="unconfirmed">확인 불가·검색 결과 없음</option></select>
            </label>}
            <div className="mt-1 flex gap-2"><button type="button" disabled={blocked || receipts.length > 0} onClick={() => editLine(l.id)} className="rounded border px-2 py-1">행 수정</button><button type="button" disabled={blocked || receipts.length > 0} onClick={() => attempt(() => deleteLine(l.id))} className="rounded border px-2 py-1">행 삭제</button></div>
          </li>; })}</ul>
          {g.supplierId && <div className="flex flex-wrap gap-2"><button type="button" disabled={blocked || resuming || receipts.some(r => r.supplier_id === g.supplierId)} onClick={() => attempt(() => prepare(g.supplierId, 'availability'))} className="rounded border px-2 py-1">품절 확인 요청 준비</button><button type="button" disabled={blocked || resuming || receipts.some(r => r.supplier_id === g.supplierId)} onClick={() => attempt(() => prepare(g.supplierId, 'prepare'))} className="rounded border px-2 py-1">주문 요청 준비</button></div>}
        </section>)}
        <p className="text-xs">검색 결과가 없으면 ‘확인 불가’입니다. 조회 시점의 정보이며 실시간 재고가 아닙니다. 미지원 사이트는 사용자가 진행하면서 기존 질문·교정 흐름으로 절차를 보완합니다.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={blocked || sheet.status !== 'draft'} onClick={() => attempt(() => updateSheet({ ...sheet, status: 'prepared' }))} className="rounded border px-2 py-1">상품·규격·수량 준비 확인</button>
          <button type="button" disabled={blocked || sheet.status !== 'prepared'} onClick={() => attempt(() => updateSheet({ ...sheet, status: 'handed_over' }))} className="rounded border px-2 py-1">직접 주문하도록 인계</button>
        </div>
        {sheet.status === 'handed_over' && <div><label className="block">접수 확인 거래처<select value={nextReceiptSupplier} disabled={blocked} onChange={e => { setReceiptSupplier(e.target.value); setReceipt(''); }} className="block w-full rounded border p-2">{pendingSuppliers.map(id => <option key={id} value={id}>{suppliers.find(s => s.data.id === id)?.data.name}</option>)}</select></label><label className="block">직접 확인한 외부 접수번호<input value={receipt} maxLength={200} disabled={blocked} onChange={e => setReceipt(e.target.value)} className="block w-full rounded border p-2" /><button type="button" disabled={blocked || !receipt.trim()} onClick={() => attempt(() => {
            if (!nextReceiptSupplier) throw Error('접수 확인 거래처를 선택하세요.');
            const nextReceipts = [...receipts, { supplier_id: nextReceiptSupplier, reference: receipt.trim(), confirmed_at: new Date().toISOString() }];
            updateSheet({ id: sheet.id, title: sheet.title, lines: sheet.lines, status: nextReceipts.length === groupOrderLines(sheet).length ? 'receipt_recorded' : 'handed_over', receipts: nextReceipts });
            setReceipt(''); setReceiptSupplier('');
          })} className="mt-2 rounded border px-2 py-1">외부 주문 접수 직접 확인</button></label></div>}
      </>}
      {(storage || bundle.records.some(r => r.kind === 'stock' || r.kind === 'availability')) && <details onToggle={event=>{if(event.currentTarget.open && !historyLoaded)void loadHistory();}}><summary>수량·품절 확인 이력</summary>{storage && <div className="my-2 flex gap-2"><button type="button" disabled={historyLoading} onClick={()=>void loadHistory(true)} className="rounded border px-2 py-1">이력 다시 조회</button>{historyLoaded && Object.values(historyPages).some(Boolean) && <button type="button" disabled={historyLoading} onClick={()=>void loadHistory()} className="rounded border px-2 py-1">이력 더 보기</button>}{historyLoading && <span role="status">확인 이력을 불러오고 있어요…</span>}</div>}<ul className="mt-2 space-y-2">{bundle.records.filter(r => r.kind === 'stock' || r.kind === 'availability').map(r => <li key={`${r.kind}:${r.data.id}`} className="break-words">
        {r.kind === 'stock' ? `${products.find(p => p.data.id === r.data.product_id)?.data.name}: ${{confirmed:'실물 확인',program:'프로그램 재고',estimated:'추정 재고',unknown:'미확인'}[r.data.confidence]} / ${r.data.quantity ?? '미확인'}${r.data.unit ?? ''} / ${r.data.observed_at}` : r.kind === 'availability' ? `${products.find(p => p.data.id === r.data.product_id)?.data.name}: ${{available:'주문 가능',out_of_stock:'품절',unconfirmed:'확인 불가'}[r.data.state]} / ${suppliers.find(v => v.data.id === r.data.supplier_id)?.data.name} / ${r.data.observed_at}` : ''}
      </li>)}</ul></details>}
      {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    </div>
  </details>;
}
