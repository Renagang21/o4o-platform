import type { DataSource, EntityManager } from 'typeorm';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import { canonicalRevision, descriptionEntrySchema, type DescriptionEntry } from './contracts.js';
import { sanitizeDescriptionHtml } from '../utils/sanitize-description-html.util.js';

type Db = Pick<DataSource | EntityManager, 'query'>;
const document = new JSDOM('').window.document;
export const aiContextLanguage = z.enum(['ko', 'en', 'ja', 'zh']);
export function descriptionPlainText(html: string) {
  const root = document.createElement('div');
  root.innerHTML = sanitizeDescriptionHtml(html);
  root.querySelectorAll('br').forEach(e => e.replaceWith('\n'));
  root.querySelectorAll('p,section,h1,h2,h3,li').forEach(e => e.append('\n'));
  return (root.textContent ?? '').trim();
}

/** Exact B2B/language only. STORE/QR is never a fallback knowledge source. */
export async function readApprovedProductAiContext(db: Db, masterId: string, language: string) {
  const rows: Array<{ id: string; content: string; summary: string | null; updated_at: Date; entry: unknown }> = await db.query(
    `SELECT d.id,d.content,d.summary,d.updated_at,c.raw_payload->'descriptionResource'->'entry' AS entry
     FROM shared_product_descriptions d LEFT JOIN product_candidates c
       ON c.id=d.source_ref_id AND c.source_label='PRODUCT_DESCRIPTION_RESOURCE_V1' AND c.deleted_at IS NULL
     WHERE d.master_id=$1 AND d.description_type='B2B' AND COALESCE(d.language,'ko')=$2
       AND d.status='canonical' AND d.deleted_at IS NULL`, [masterId, language]);
  const row = rows[0];
  if (!row) return { state: 'missing' as const, masterId, language, description: null };
  const parsed = descriptionEntrySchema.safeParse(row.entry);
  // A later generic canonical edit invalidates the old structured payload and evidence association.
  const entry: DescriptionEntry | null = parsed.success && parsed.data.descriptionType === 'B2B' &&
    parsed.data.language === language && parsed.data.content === row.content ? parsed.data : null;
  const text = descriptionPlainText(row.content);
  if (!text) return { state: 'missing' as const, masterId, language, description: null };
  const sections = entry?.aiSections?.length ? entry.aiSections : [
    { key: 'legacy', title: '기존 미분류 설명', kind: 'unclassified' as const, text: text.slice(0, 20000), referenceUrls: [] },
  ];
  return { state: entry?.aiSections?.length ? 'structured' as const : 'legacy' as const, masterId, language,
    description: { id: row.id, revision: canonicalRevision({ id: row.id, content: row.content, summary: row.summary, updatedAt: row.updated_at }),
      source: entry?.source ?? null, sections, truncated: !entry?.aiSections?.length && text.length > 20000 } };
}

/** Ownership is resolved in the selected store, not from a client supplied master id. */
export async function readStoreProductAiContext(db: Db, organizationId: string, listingId: string, language: string) {
  const [listing] = await db.query(
    `SELECT p.master_id,p.id,m.name FROM organization_product_listings p JOIN product_masters m ON m.id=p.master_id
     WHERE p.id=$1 AND p.organization_id=$2 AND p.is_active=true AND m.status='ACTIVE'`, [listingId, organizationId]);
  if (!listing) return null;
  return { ...(await readApprovedProductAiContext(db, listing.master_id, language)), listingId, name: listing.name };
}
