import { useEffect, useRef, useState } from 'react';
import { searchManuals, validateManual, MANUAL_LIMITS, type ManualDocument, type ManualReference } from './knowledge';
import { loadManuals, saveManuals } from './storage';
import { importManualPdf } from './pdf';

export function useManualLibrary(owner: string | null) {
  const [documents, setDocuments] = useState<ManualDocument[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const currentOwner = useRef(owner);
  const generation = useRef(0);
  if (currentOwner.current !== owner) { currentOwner.current = owner; generation.current += 1; }
  const snapshot = useRef<ManualDocument[]>([]);
  const locked = useRef<object | null>(null);
  useEffect(() => {
    let active = true;
    locked.current = null;
    setDocuments([]); snapshot.current = []; setSelected([]); setError(''); setLoadedOwner(null); setBusy(false);
    if (owner) void loadManuals(owner).then(data => {
      if (active) { snapshot.current = data; setDocuments(data); setLoadedOwner(owner); }
    }).catch(() => { if (active) setError('매뉴얼 자료함을 읽지 못했습니다. 브라우저 저장 설정을 확인해 주세요.'); });
    return () => { active = false; };
  }, [owner]);
  const ready = !!owner && loadedOwner === owner;
  const visible = ready ? documents : [];
  async function mutate(change: (old: ManualDocument[]) => Promise<ManualDocument[]> | ManualDocument[]) {
    if (!owner || !ready || locked.current) return;
    const account = owner;
    const epoch = generation.current;
    const ticket = {};
    locked.current = ticket; setBusy(true); setError('');
    try {
      const next = await change(snapshot.current);
      if (currentOwner.current !== account || generation.current !== epoch) return;
      await saveManuals(account, next);
      if (currentOwner.current !== account || generation.current !== epoch) return;
      snapshot.current = next; setDocuments(next);
      setSelected(prev => prev.filter(id => next.some(doc => doc.id === id)));
    } catch (e) { if (currentOwner.current === account && generation.current === epoch) setError(e instanceof Error ? e.message : '매뉴얼을 처리하지 못했습니다.'); }
    finally { if (locked.current === ticket) locked.current = null; if (currentOwner.current === account && generation.current === epoch) setBusy(false); }
  }
  async function importFile(file: File, program: string) {
    await mutate(async old => {
      let imported: ManualDocument[];
      if (/\.json$/i.test(file.name)) {
        if (file.size > MANUAL_LIMITS.bytes) throw Error('자료함 파일은 12MB 이하로 나누어 주세요.');
        const data = JSON.parse(await file.text()) as { format?: string; documents?: unknown[] };
        if (!data || data.format !== 'o4o-manual-library-v1' || !Array.isArray(data.documents)) throw Error('O4O 매뉴얼 자료함 파일이 아닙니다.');
        imported = data.documents.map(validateManual);
      } else imported = [await importManualPdf(file, program.trim() || file.name.replace(/\.pdf(?:\.crdownload)?$/i, '').slice(0, 80))];
      const next = new Map(old.map(doc => [doc.id, doc]));
      // Reimporting the same source must not erase corrections or usage history.
      for (const doc of imported) if (!next.has(doc.id)) next.set(doc.id, doc);
      return [...next.values()];
    });
  }
  return {
    documents: visible, selected: ready ? selected : [], error, busy, ready,
    toggle(id: string) {
      if (!ready || busy) return;
      const program = documents.find(doc => doc.id === id)?.program.trim().toLowerCase();
      setSelected(old => old.includes(id) ? old.filter(x => x !== id) : [...old.filter(x => documents.find(doc => doc.id === x)?.program.trim().toLowerCase() !== program), id]);
    },
    importFile,
    remove(id: string) { return mutate(old => old.filter(doc => doc.id !== id)); },
    references(query: string) { return searchManuals(visible, ready ? selected : [], query); },
    report(ref: ManualReference, state: 'matches' | 'differs', note: string) {
      return mutate(old => old.map(doc => doc.id === ref.manualId ? { ...doc, reports: { ...doc.reports, [ref.page]: { state, note: note.slice(0, 300) } } } : doc));
    },
    used(refs: ManualReference[]) {
      const ids = new Set(refs.map(ref => ref.manualId));
      return mutate(old => old.map(doc => ids.has(doc.id) ? { ...doc, uses: doc.uses + 1 } : doc));
    },
  };
}
export type ManualLibrary = ReturnType<typeof useManualLibrary>;
