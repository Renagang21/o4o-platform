import type { DataSource, EntityManager } from 'typeorm';
import { JSDOM } from 'jsdom';
import { z } from 'zod';
import { canonicalRevision } from './contracts.js';
import { consultationEntry, readConsultationDescriptions } from './consultation-resource.js';
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

/** Consultation facts only; legacy structured intake is read without moving B2B rows. */
export async function readApprovedProductAiContext(db: Db, masterId: string, language: string) {
  const row = (await readConsultationDescriptions(db, [masterId], language)).get(masterId);
  if (!row) return { state: 'missing' as const, masterId, language, description: null };
  // A later generic canonical edit invalidates the old structured payload and evidence association.
  const entry = consultationEntry(row, language);
  if (!entry) return { state: 'missing' as const, masterId, language, description: null };
  const text = descriptionPlainText(row.content);
  if (!text) return { state: 'missing' as const, masterId, language, description: null };
  return { state: 'structured' as const, masterId, language,
    description: { id: row.id, revision: canonicalRevision({ id: row.id, content: row.content, summary: row.summary, updatedAt: row.updated_at }),
      source: entry.source, sections: entry.aiSections!, truncated: false } };
}

/** Ownership is resolved in the selected store, not from a client supplied master id. */
export async function readStoreProductAiContext(db: Db, organizationId: string, listingId: string, language: string) {
  const [listing] = await db.query(
    `SELECT p.master_id,p.id,m.name FROM organization_product_listings p JOIN product_masters m ON m.id=p.master_id
     WHERE p.id=$1 AND p.organization_id=$2 AND p.is_active=true AND m.status='ACTIVE'`, [listingId, organizationId]);
  if (!listing) return null;
  return { ...(await readApprovedProductAiContext(db, listing.master_id, language)), listingId, name: listing.name };
}
