import { useRef, useState } from 'react';
import { previewProductFile, aiResearchRequest, type ProductFilePreview, type ProductFileRow } from '../../api/storeProductAi';
import { fileRowLabels, guessProductFileColumns, productFileMapping, registerProductFileSelection } from './storeProductExcelModel';
import { StoreProductDialog, useStoreProductScope, useStoreProductSession } from '../../components/store/StoreProductSession';
import { useLatestStoreRequest } from './hooks/useLatestStoreRequest';

interface Props { open: boolean; onClose: () => void; onRegistered: () => void }
const button = 'min-h-11 rounded border px-3 py-2 disabled:opacity-50';
export function StoreProductExcelDialog(props: Readonly<Props>) {
  const scope = useStoreProductScope();
  if (!props.open || !scope.ready) return null;
  return <ExcelSession key={scope.key} {...props} organizationId={scope.organizationId!} />;
}
function ExcelSession({ onClose, onRegistered, organizationId }: Readonly<Props & { organizationId: string }>) {
  const isCurrent = useStoreProductSession(organizationId), requests = useLatestStoreRequest(organizationId), lock = useRef(false);
  const [file, setFile] = useState<File | null>(null), [data, setData] = useState<ProductFilePreview | null>(null);
  const [headerRow, setHeaderRow] = useState(0);
  const [barcodeColumn, setBarcodeColumn] = useState(''), [nameColumn, setNameColumn] = useState(''), [language, setLanguage] = useState('ko');
  const [selected, setSelected] = useState<Record<number, string>>({}), [outcomes, setOutcomes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [page, setPage] = useState(0);
  const columns = data?.columns ?? [], rows = data?.rows ?? [], pageRows = rows.slice(page * 20, (page + 1) * 20);
  const read = async (next: File, mapped: boolean, requestedHeaderRow?: number) => {
    if (lock.current || !isCurrent()) return;
    lock.current = true; const current = requests.begin(); setBusy(true); setError(''); setSelected({}); setOutcomes({}); setPage(0);
    if (!mapped) { setData(null); setBarcodeColumn(''); setNameColumn(''); }
    try {
      const mapping = mapped ? productFileMapping(barcodeColumn, nameColumn, language) : undefined;
      const result = await previewProductFile(next, mapping, mapped ? headerRow : requestedHeaderRow);
      if (!current() || !isCurrent()) return;
      setData(result);
      setHeaderRow(result.headerRow);
      if (!mapped) {
        const guess = guessProductFileColumns(result.columns);
        setBarcodeColumn(guess.barcode); setNameColumn(guess.name);
      }
    } catch { if (current() && isCurrent()) { setData(null); setError('파일을 처리하지 못했습니다. 첫 시트·열 이름·최대 5,000행/10MB를 확인하세요.'); } }
    finally { lock.current = false; if (current() && isCurrent()) setBusy(false); }
  };
  const resetRows = () => { requests.cancel(); setData(previous => previous ? { ...previous, rows: [] } : null); setSelected({}); setOutcomes({}); setPage(0); };
  const register = async () => {
    if (lock.current || !isCurrent()) return;
    const choices = rows.filter(row => selected[row.row] && outcomes[row.row] !== 'registered');
    if (!choices.length || !window.confirm(`선택한 ${choices.length}행의 상품을 현재 매장에 등록하시겠습니까? 설명서·QR은 제작하지 않습니다.`)) return;
    lock.current = true; setBusy(true); setError(''); let changed = false;
    try {
      changed = await registerProductFileSelection(choices, selected, isCurrent,
        (row, outcome) => setOutcomes(previous => ({ ...previous, [row]: outcome })));
    } finally { lock.current = false; if (isCurrent()) { setBusy(false); if (changed) onRegistered(); } }
  };
  const exportRequest = () => {
    if (!isCurrent()) return;
    const pending = rows.filter(row => row.state !== 'invalid').filter(row => {
      const target = row.candidates.find(c => c.id === selected[row.row]);
      return !target?.hasAiDescription;
    }).map(row => { const target = row.candidates.find(c => c.id === selected[row.row]);
      return { name: target?.name ?? row.name, barcode: target?.barcode ?? row.barcode }; });
    const url = URL.createObjectURL(new Blob([aiResearchRequest(pending, language)], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'o4o-product-ai-research-request.txt'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <StoreProductDialog label="엑셀 상품 등록·AI 자료 준비" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.4)', padding: 12 }}
    onClose={() => { if (!lock.current) onClose(); }} preventBackdropClose={busy}>
    <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg bg-white p-4 text-slate-900">
      <div className="flex items-start justify-between gap-2"><h2 className="text-lg font-semibold">엑셀 상품 등록·AI 자료 준비</h2><button type="button" className={button} disabled={busy} onClick={onClose}>닫기</button></div>
      <p className="my-2 text-sm">첫 시트의 바코드·상품명 열만 사용합니다. POS 코드·가격·주문·재고는 저장하지 않습니다. 이름으로 찾은 후보는 직접 확인해 선택하세요.</p>
      <fieldset disabled={busy} className="min-w-0 space-y-3">
        <label className="block">상품 엑셀 파일 <input aria-label="상품 엑셀 파일" type="file" accept=".xlsx,.xls,.csv" onChange={e => {
          const next = e.target.files?.[0]; setFile(next ?? null); if (next) void read(next, false); else { requests.cancel(); setData(null); }
        }} /></label>
        {file && <label className="block">열 이름이 있는 행<select className="ml-2 min-h-11 rounded border" value={headerRow} onChange={e => { if (file) void read(file, false, Number(e.target.value)); }}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i}>{i + 1}행</option>)}</select></label>}
        {!!columns.length && <div className="flex flex-wrap items-end gap-3">
          <label>바코드 열<select className="block min-h-11 rounded border" value={barcodeColumn} onChange={e => { setBarcodeColumn(e.target.value); resetRows(); }}><option value="">선택 안 함</option>{columns.map(c => <option key={c.index} value={c.index}>{c.index + 1}. {c.label}</option>)}</select></label>
          <label>상품명 열<select className="block min-h-11 rounded border" value={nameColumn} onChange={e => { setNameColumn(e.target.value); resetRows(); }}><option value="">선택 안 함</option>{columns.map(c => <option key={c.index} value={c.index}>{c.index + 1}. {c.label}</option>)}</select></label>
          <label>AI 자료 언어<select className="block min-h-11 rounded border" value={language} onChange={e => { setLanguage(e.target.value); resetRows(); }}>{[['ko','한국어'],['en','영어'],['ja','일본어'],['zh','중국어']].map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label>
          <button type="button" className={button} disabled={!file || (barcodeColumn === '' && nameColumn === '') || barcodeColumn === nameColumn} onClick={() => file && void read(file, true)}>기존 상품·AI 자료 대조</button>
        </div>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {!!rows.length && <>
          <output className="block">대조 {rows.length}행 · 상품 미확인 {rows.filter(r => !r.candidates.length).length}행 · 선택 {Object.values(selected).filter(Boolean).length}행</output>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr><th>행</th><th>입력 상품</th><th>연결할 O4O 상품</th><th>AI 자료·등록 결과</th></tr></thead><tbody>
            {pageRows.map(row => <ProductPreviewRow key={row.row} row={row} selectedId={selected[row.row] ?? ''} outcome={outcomes[row.row] ?? ''}
              onSelect={id => { setSelected(previous => ({ ...previous, [row.row]: id })); setOutcomes(previous => ({ ...previous, [row.row]: '' })); }} />)}
          </tbody></table></div>
          <div className="flex flex-wrap items-center gap-2"><button type="button" className={button} disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</button><span>{page + 1} / {Math.ceil(rows.length / 20)}</span><button type="button" className={button} disabled={(page + 1) * 20 >= rows.length} onClick={() => setPage(p => p + 1)}>다음</button>
            <button type="button" className={button} disabled={!Object.values(selected).some(Boolean)} onClick={() => void register()}>선택 상품 매장 등록·실패 재시도</button>
            <button type="button" className={button} onClick={exportRequest}>미확보 자료 조사 요청문 받기</button>
          </div>
          <p className="text-xs">등록 후 내 매장 제품의 ‘안내 작성’에서 AI 상담자료를 확인합니다. 미확보 자료는 사용자 ChatGPT에서 근거를 준비하고 전체관리자가 검토·승인합니다. 공개 근거가 없으면 작성하지 않습니다. 공통 QR 설명서는 별도 관리자 제작입니다.</p>
        </>}
      </fieldset>
      {busy && <output className="block">처리 중입니다. 상품 등록 중에는 창을 닫거나 매장을 변경하지 마세요.</output>}
    </div>
  </StoreProductDialog>;
}

function ProductPreviewRow({ row, selectedId, outcome, onSelect }: Readonly<{
  row: ProductFileRow; selectedId: string; outcome: string; onSelect: (id: string) => void;
}>) {
  const target = row.candidates.find(c => c.id === selectedId), labels = fileRowLabels(row, target, outcome);
  return <tr className="border-t align-top">
    <td className="p-2">{row.row}</td><td className="max-w-48 break-words p-2">{row.name}<br />{row.barcode}</td>
    <td className="p-2">{row.candidates.length ? <select aria-label={`${row.row}행 상품 선택`} className="min-h-11 w-full max-w-72 rounded border" value={selectedId}
      disabled={outcome === 'registered'} onChange={e => onSelect(e.target.value)}>
      <option value="">확인 후 선택</option>{row.candidates.map(c => <option key={c.id} value={c.id}>{c.name} · {c.barcode ?? '바코드 없음'} · {c.manufacturer ?? ''} ({c.matchedBy === 'barcode' ? '바코드 일치' : '이름 후보'})</option>)}
    </select> : labels.missing}</td>
    <td className="p-2">{labels.material}<br />{labels.registration}</td>
  </tr>;
}
