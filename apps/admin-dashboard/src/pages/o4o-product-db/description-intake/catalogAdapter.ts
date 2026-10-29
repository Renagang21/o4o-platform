import type { DescriptionEntry } from '@/api/product-description-intake.api';
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const str = (v: unknown) => typeof v === 'string' ? v : '';
export const escapeDescriptionText = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** Whitelist only description/evidence fields. POS rows, prices and store identity never enter the request. */
export function readPublicDescriptionCatalog(raw: unknown, descriptionType: DescriptionEntry['descriptionType'], language: DescriptionEntry['language']) {
  const root = record(raw);
  if (root.format !== 'o4o-public-product-descriptions-v1' || !Array.isArray(root.descriptions) || !Array.isArray(root.evidence)) throw new Error('지원하는 상품 설명 JSON 파일이 아닙니다.');
  const evidence = new Map(root.evidence.map(v => { const e = record(v); return [str(e.id), e]; }));
  const entries: DescriptionEntry[] = [];
  let excludedEmpty = 0;
  for (const value of root.descriptions) {
    const d = record(value), sections = record(d.sections), html = record(d.section_html);
    // Plain section text establishes a real body; a title or image alone is not a description.
    const sectionNames = Object.keys(sections).filter(key => str(sections[key]).trim());
    const content = sectionNames.length ? sectionNames.map(key => `<section><h2>${escapeDescriptionText(key)}</h2>${str(html[key]).trim() || `<pre>${escapeDescriptionText(str(sections[key]))}</pre>`}</section>`).join('\n') : str(d.description).trim() ? `<pre>${escapeDescriptionText(str(d.description))}</pre>` : '';
    if (!content) { excludedEmpty++; continue; }
    const refs = (Array.isArray(d.source_evidence_ids) ? d.source_evidence_ids : []).map(id => evidence.get(str(id)));
    if (!refs.length || refs.some(e => !e || !str(e.source_url))) throw new Error('설명 본문의 근거 자료가 누락됐습니다.');
    const references = [...new Map(refs.map(e => [str(e!.source_url), { url: str(e!.source_url), label: str(e!.kind), ...(str(e!.sha256) ? { sha256: str(e!.sha256) } : {}) }])).values()];
    const archived = /archive|not_current/.test(str(d.source_currentness)) || refs.some(e => /archive/.test(str(e!.currentness)));
    const official = record(d.official_identifiers);
    entries.push({ key: str(d.description_key), name: str(d.name), manufacturer: str(d.manufacturer) || null, category: str(d.category) || null,
      content, descriptionType, language, barcodes: Array.isArray(d.verified_barcodes) ? d.verified_barcodes.map(str) : [],
      aiSections: Array.isArray(d.aiSections) ? d.aiSections.map(raw => {
        const section = record(raw), kind = str(section.kind);
        if (!['product-fact','professional-reference','counseling-support','unclassified'].includes(kind)) throw new Error('AI 항목의 정보 구분을 확인해 주세요.');
        return { key: str(section.key), title: str(section.title), kind: kind as NonNullable<DescriptionEntry['aiSections']>[number]['kind'],
          text: str(section.text), referenceUrls: Array.isArray(section.referenceUrls) ? section.referenceUrls.map(str) : [] };
      }) : sectionNames.map(key => ({ key: key.slice(0, 100), title: key.slice(0, 300), kind: 'unclassified', text: str(sections[key]), referenceUrls: references.map(r => r.url) })),
      identifiers: { ...(str(official.mfds_item_seq) ? { mfdsItemSeq: str(official.mfds_item_seq) } : {}), ...(str(official.statement_no) ? { statementNo: str(official.statement_no) } : {}) },
      source: { kind: references.every(r => { try { return new URL(r.url).hostname.endsWith('.go.kr'); } catch { return false; } }) ? 'government' : 'manufacturer',
        currentness: archived ? 'archived' : 'retrieved', checkedOn: archived ? null : str(root.generated_on) || null, references } });
  }
  return { entries, excludedEmpty };
}
