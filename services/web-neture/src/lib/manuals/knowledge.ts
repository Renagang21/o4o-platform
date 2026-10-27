/** Local, account-owned manual knowledge. Source text and user reports never become execution authority. */
export interface ManualPage { page: number; text: string }
export interface ManualDocument {
  id: string; title: string; program: string; importedAt: string;
  pages: ManualPage[];
  reports: Record<string, { state: 'matches' | 'differs'; note: string }>;
  uses: number;
}
export interface ManualReference {
  manualId: string; title: string; program: string; page: number; text: string;
  userReport?: { state: 'matches' | 'differs'; note: string };
}
export const MANUAL_LIMITS = { bytes: 12 * 1024 * 1024, pages: 400, characters: 800_000, documents: 10, references: 4, excerpt: 1400 } as const;
const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
function tokens(s: string): Set<string> {
  const words = normalize(s).match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(words.flatMap(w => w.length < 2 ? [] : [w, ...Array.from({ length: w.length - 1 }, (_, i) => w.slice(i, i + 2))]));
}
export function validateManual(value: unknown): ManualDocument {
  if (!value || typeof value !== 'object') throw Error('매뉴얼 자료 형식이 올바르지 않습니다.');
  const v = value as Partial<ManualDocument>;
  if (!/^[a-f0-9]{64}$/.test(v.id ?? '') || typeof v.title !== 'string' || !v.title.trim() || v.title.length > 120 || typeof v.program !== 'string' || !v.program.trim() || v.program.length > 80 || !Array.isArray(v.pages) || !v.pages.length || v.pages.length > MANUAL_LIMITS.pages) throw Error('매뉴얼 제목·프로그램·페이지 정보를 확인해 주세요.');
  let characters = 0;
  const seen = new Set<number>();
  const pages = v.pages.map(p => {
    if (!p || !Number.isSafeInteger(p.page) || p.page < 1 || p.page > MANUAL_LIMITS.pages || seen.has(p.page) || typeof p.text !== 'string') throw Error('매뉴얼 페이지 형식이 올바르지 않습니다.');
    seen.add(p.page); characters += p.text.length;
    return { page: p.page, text: p.text };
  });
  if (!pages.some(p => p.text.trim()) || characters > MANUAL_LIMITS.characters) throw Error('매뉴얼 글자가 없거나 저장 한도를 초과했습니다.');
  const reports: ManualDocument['reports'] = {};
  if (v.reports && typeof v.reports === 'object') for (const [key, report] of Object.entries(v.reports)) {
    if (seen.has(Number(key)) && report && ['matches', 'differs'].includes(report.state) && typeof report.note === 'string' && report.note.length <= 300) reports[key] = { state: report.state, note: report.note };
  }
  return { id: v.id!, title: v.title.trim(), program: v.program.trim(), pages, reports, importedAt: typeof v.importedAt === 'string' ? v.importedAt.slice(0, 40) : new Date().toISOString(), uses: Number.isSafeInteger(v.uses) && v.uses! >= 0 ? Math.min(v.uses!, 1_000_000) : 0 };
}
/** No model calls. Rank bounded page excerpts; do not send a whole PDF on every request. */
export function searchManuals(documents: readonly ManualDocument[], selected: readonly string[], query: string): ManualReference[] {
  const terms = tokens(query);
  if (!terms.size) return [];
  const candidates: { score: number; reference: ManualReference }[] = [];
  for (const doc of documents) {
    if (!selected.includes(doc.id)) continue;
    for (const page of doc.pages) {
      const text = page.text;
      for (let start = 0; start < text.length; start += 1100) {
        const excerpt = text.slice(start, start + MANUAL_LIMITS.excerpt);
        const body = tokens(excerpt + ' ' + (doc.reports[String(page.page)]?.note ?? ''));
        const score = [...terms].reduce((sum, term) => sum + (body.has(term) ? Math.min(term.length, 6) : 0), 0);
        if (score < 2) continue;
        candidates.push({ score, reference: { manualId: doc.id, title: doc.title, program: doc.program, page: page.page, text: excerpt, ...(doc.reports[String(page.page)] ? { userReport: doc.reports[String(page.page)] } : {}) } });
      }
    }
  }
  const seen = new Set<string>();
  return candidates.sort((a, b) => b.score - a.score).filter(c => {
    const key = `${c.reference.manualId}:${c.reference.page}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, MANUAL_LIMITS.references).map(c => c.reference);
}
