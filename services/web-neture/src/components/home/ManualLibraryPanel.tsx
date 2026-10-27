import { useState } from 'react';
import type { ManualLibrary } from '../../lib/manuals/useManualLibrary';
import type { ManualReference } from '../../lib/manuals/knowledge';

export function ManualLibraryPanel({ library, disabled }: { library: ManualLibrary; disabled: boolean }) {
  const [program, setProgram] = useState('');
  function exportLibrary() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'o4o-manual-library-v1', documents: library.documents })], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'o4o-manual-library.private.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <details className="mt-3 w-full max-w-xl rounded-xl border border-slate-200 p-3 text-left" data-testid="manual-library">
    <summary className="cursor-pointer text-sm font-medium">업무 매뉴얼 {library.selected.length ? `(${library.selected.length}개 선택)` : ''}</summary>
    <p className="text-xs text-slate-600">이 브라우저의 현재 계정 자료함입니다. 프로그램마다 기준 매뉴얼 하나를 선택하며, 관련 부분만 요청할 때 AI에 전송합니다. 다른 기기에서는 자료함을 내보내 가져올 수 있습니다.</p>
    <p className="text-xs text-slate-600">매뉴얼은 참고자료입니다. 현재 화면과 다를 수 있으며 저장·보고·결제의 확정은 사용자가 합니다. 환자·고객 정보가 없는 매뉴얼만 등록해 주세요.</p>
    {library.error && <p role="alert" className="text-sm text-red-700">{library.error}</p>}
    <fieldset disabled={disabled || library.busy || !library.ready} className="min-w-0 space-y-3">
      <label className="block text-sm">프로그램 이름 (생략하면 파일명 사용)<input className="mt-1 w-full rounded border p-2" maxLength={80} value={program} onChange={e => setProgram(e.target.value)} /></label>
      <label className="block text-sm">매뉴얼 PDF 또는 내보낸 자료함 가져오기<input className="mt-1 block w-full max-w-full text-xs" type="file" accept="application/pdf,.pdf,.crdownload,application/json,.json" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void library.importFile(file, program); }} /></label>
      <p className="text-xs text-slate-500">PDF 최대 12MB·400쪽, 최대 10개. 원본 PDF는 서버에 업로드하지 않습니다. 암호 PDF·글자 없는 스캔본은 지원하지 않습니다.</p>
      {library.documents.length === 0 && <p className="text-sm text-slate-600">등록된 매뉴얼이 없습니다. 파일을 가져온 뒤 사용할 매뉴얼을 선택해 주세요.</p>}
      <ul className="space-y-2">{library.documents.map(doc => <li key={doc.id} className="rounded border p-2 text-sm">
        <label className="flex items-start gap-2"><input type="checkbox" checked={library.selected.includes(doc.id)} onChange={() => library.toggle(doc.id)} /><span className="min-w-0 break-words">{doc.title} · {doc.program}<span className="block text-xs text-slate-500">{doc.pages.length}쪽 · 참조 응답 {doc.uses}회</span></span></label>
        <button type="button" className="mt-1 text-xs underline" onClick={() => { if (window.confirm('이 브라우저의 매뉴얼과 보완 기록을 삭제할까요? 원본 파일은 삭제되지 않습니다.')) void library.remove(doc.id); }}>삭제: {doc.title}</button>
      </li>)}</ul>
      <button type="button" className="rounded border px-2 py-1 text-sm" disabled={!library.documents.length} onClick={exportLibrary}>자료함 내보내기</button>
    </fieldset>
    {library.busy && <p role="status" className="text-sm">매뉴얼을 처리하고 있습니다…</p>}
  </details>;
}
export function ManualReferences({ references, library, disabled }: { references: readonly ManualReference[]; library: ManualLibrary; disabled: boolean }) {
  if (!references.length) return null;
  return <section aria-label="참조한 매뉴얼" className="mt-4 text-left text-sm">
    <p className="font-medium">참조한 매뉴얼 · 현재 화면 확인 필요</p>
    {references.map(ref => <ManualReferenceItem key={`${ref.manualId}:${ref.page}`} reference={ref} library={library} disabled={disabled} />)}
  </section>;
}
function ManualReferenceItem({ reference: ref, library, disabled }: { reference: ManualReference; library: ManualLibrary; disabled: boolean }) {
  const report = library.documents.find(doc => doc.id === ref.manualId)?.reports[String(ref.page)];
  const [note, setNote] = useState(report?.note ?? '');
  return <details className="mb-2 rounded border p-2">
    <summary className="cursor-pointer break-words">{ref.title} · {ref.program} · {ref.page}쪽 {report ? (report.state === 'matches' ? '(사용자 화면 일치 보고)' : '(차이 보고)') : ''}</summary>
    <p className="whitespace-pre-wrap break-words text-xs">{ref.text}</p>
    <p className="text-xs text-slate-500">확인은 이 페이지의 사용자 보고로만 저장됩니다. 실제 실행 검증이나 공통 절차 승격이 아닙니다.</p>
    <label className="block text-xs">현재 화면의 차이·보완 (개인정보 제외)<textarea maxLength={300} className="mt-1 w-full rounded border p-1" value={note} disabled={disabled || library.busy} onChange={e => setNote(e.target.value)} /></label>
    <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={disabled || library.busy} className="rounded border p-1 text-xs" onClick={() => void library.report(ref, 'matches', note)}>현재 화면과 맞음</button><button type="button" disabled={disabled || library.busy} className="rounded border p-1 text-xs" onClick={() => void library.report(ref, 'differs', note)}>차이·보완 저장</button></div>
  </details>;
}
