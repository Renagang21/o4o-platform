import type { readStoreProductAiContext } from '../../neture/product-description-intake/ai-context.service.js';
import type { ConsultationSupportSource } from './consultation-support.extension.js';

const caution = /주의|금기|상호작용|부작용|임신|수유|알레르기|caution|contraindicat|interaction|warning/i;
const labels = { 'product-fact': '상품 사실', 'professional-reference': '전문 참고', 'counseling-support': '상담 보조', unclassified: '미분류' };
export function safeEvidenceUrls(urls: string[]): string[] {
  return [...new Set(urls)].filter(value => {
    try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
  });
}

export function evidenceExcerpt(text: string, limit: number, question = '') {
  const terms = question.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t => t.length > 1);
  const score = (value: string) => (caution.test(value) ? 30 : 0) + terms.reduce((n, t) => n + (value.toLowerCase().includes(t) ? 10 : 0), 0);
    const chunks = text.split(/\n+|(?<=[。!?])\s*|(?<=\.)\s+(?=\p{L})/u).filter(Boolean);
    const ordered = chunks.map((text, i) => ({ text, i })).sort((a, b) => score(b.text) - score(a.text) || a.i - b.i);
    let excerpt = '';
    for (const chunk of ordered) {
      if (excerpt.length >= limit) break;
      // Do not sever a decimal, negation or dose in the middle of a source sentence.
      if (chunk.text.length + (excerpt ? 1 : 0) > limit - excerpt.length) continue;
      excerpt += (excerpt ? '\n' : '') + chunk.text;
    }
    return excerpt.trim();
}

/** Prefer relevant passages and associated cautions; never promote an unclassified body. */
export function approvedAiSupportSources(
  ai: Awaited<ReturnType<typeof readStoreProductAiContext>>, question = '',
): ConsultationSupportSource[] {
  if (ai?.state !== 'structured' || !ai.description) return [];
  const description = ai.description;
  const terms = question.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t => t.length > 1);
  const score = (text: string) => (caution.test(text) ? 30 : 0) + terms.reduce((n, t) => n + (text.toLowerCase().includes(t) ? 10 : 0), 0);
  const sections = description.sections.map((section, index) => ({ section, index }))
    .filter(({ section }) => section.kind !== 'unclassified' && safeEvidenceUrls(section.referenceUrls).length > 0)
    .sort((a, b) => score(`${b.section.title} ${b.section.text}`) - score(`${a.section.title} ${a.section.text}`) || a.index - b.index);
  const sources: ConsultationSupportSource[] = [];
  let remaining = 18000;
  for (const { section, index } of sections.slice(0, 16)) {
    if (!remaining) break;
    const limit = Math.min(5000, remaining);
    const text = evidenceExcerpt(section.text, limit, question);
    if (!text) continue;
    remaining -= text.length;
    const omitted = text.length < section.text.length || sections.length > 16;
    sources.push({ id: section.kind === 'product-fact' ? `p${index + 11}` : `r${index + 2}`, kind: section.kind as ConsultationSupportSource['kind'],
      title: `O4O B2B · ${labels[section.kind]} · ${section.title}${omitted ? ' · 일부 근거 생략' : ''}`,
      text, urls: safeEvidenceUrls(section.referenceUrls), checkedOn: description.source?.checkedOn ?? null,
      revision: description.revision, currentness: description.source?.currentness ?? 'unknown' });
  }
  return sources;
}
