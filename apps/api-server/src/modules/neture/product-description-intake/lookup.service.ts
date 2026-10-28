import type { DataSource, EntityManager } from 'typeorm';
import { barcodeForms, canonicalRevision, descriptionNameKey, normalizeProductBarcode, type DescriptionEntry } from './contracts.js';
import { hasProductDescriptionText, sanitizeDescriptionHtml } from '../utils/sanitize-description-html.util.js';

type Db = Pick<DataSource | EntityManager, 'query'>;
type LookupEntry = Pick<DescriptionEntry, 'barcodes' | 'identifiers' | 'name' | 'descriptionType' | 'language'>;
interface MasterRow {
  id: string; name: string; barcode: string | null; manufacturer_name: string | null;
  regulatory_name: string | null; mfds_product_id: string | null; mfds_permit_number: string | null;
  identifier_value?: string | null; normalized_value?: string | null;
}
export interface DescriptionTarget {
  id: string; name: string; barcode: string | null; manufacturer: string | null;
  matchedBy: 'barcode' | 'official_id' | 'name';
  canonical: { source?: DescriptionEntry['source'] | null; id: string; content: string; summary: string | null; revision: string } | null;
}
const MASTER_COLUMNS = 'pm.id,pm.name,pm.barcode,pm.manufacturer_name,pm.regulatory_name,pm.mfds_product_id,pm.mfds_permit_number';
const CODE_TYPES = ['GTIN', 'EAN13', 'UPC', 'JAN', 'KOREA_DRUG_CODE', 'UDI_DI'];

/** Bounded batch reads. Name matches are candidates, never an automatic product assignment. */
export async function findDescriptionTargets(db: Db, entries: LookupEntry[]): Promise<DescriptionTarget[][]> {
  if (!entries.length) return [];
  const codes = [...new Set(entries.flatMap(e => e.barcodes.flatMap(barcodeForms)))];
  const official = [...new Set(entries.flatMap(e => Object.values(e.identifiers)))];
  const names = [...new Set(entries.map(e => descriptionNameKey(e.name)).filter(Boolean))];
  const masters = new Map<string, MasterRow>();
  const masterCodes = new Map<string, Set<string>>();
  const add = (row: MasterRow) => {
    masters.set(row.id, row);
    const set = masterCodes.get(row.id) ?? new Set<string>();
    for (const raw of [row.barcode, row.identifier_value, row.normalized_value]) {
      const code = raw && normalizeProductBarcode(raw);
      if (code) set.add(code.padStart(14, '0'));
    }
    masterCodes.set(row.id, set);
  };
  if (codes.length) {
    const primary: MasterRow[] = await db.query(`SELECT ${MASTER_COLUMNS} FROM product_masters pm WHERE pm.status='ACTIVE' AND pm.barcode=ANY($1::text[]) ORDER BY pm.id LIMIT 1001`, [codes]);
    primary.forEach(add);
    const identifiers: MasterRow[] = await db.query(
      `SELECT DISTINCT ${MASTER_COLUMNS},pi.identifier_value,pi.normalized_value FROM product_identifiers pi JOIN product_masters pm ON pm.id=pi.product_master_id
       WHERE pm.status='ACTIVE' AND pi.deleted_at IS NULL AND pi.identifier_type=ANY($2::text[])
       AND (pi.verification_status IS NULL OR pi.verification_status NOT IN ('conflict','deprecated','system_generated'))
       AND (pi.identifier_value=ANY($1::text[]) OR pi.normalized_value=ANY($1::text[])) ORDER BY pm.id LIMIT 1001`, [codes, CODE_TYPES]);
    identifiers.forEach(add);
  }
  if (official.length) {
    const rows: MasterRow[] = await db.query(`SELECT ${MASTER_COLUMNS} FROM product_masters pm WHERE pm.status='ACTIVE' AND (pm.mfds_product_id=ANY($1::text[]) OR pm.mfds_permit_number=ANY($1::text[])) ORDER BY pm.id LIMIT 1001`, [official]);
    rows.forEach(add);
  }
  if (names.length) {
    const rows: MasterRow[] = await db.query(`SELECT ${MASTER_COLUMNS} FROM product_masters pm WHERE pm.status='ACTIVE'
      AND (lower(regexp_replace(pm.name,'\\s+','','g'))=ANY($1::text[]) OR lower(regexp_replace(COALESCE(pm.regulatory_name,''),'\\s+','','g'))=ANY($1::text[])) ORDER BY pm.id LIMIT 1001`, [names]);
    rows.forEach(add);
  }
  const candidates = entries.map(e => {
    const exact = [...masters.values()].filter(m => e.barcodes.some(b => masterCodes.get(m.id)?.has(b.padStart(14, '0'))));
    const ids = Object.values(e.identifiers);
    const byOfficial = [...masters.values()].filter(m => ids.some(id => id === m.mfds_product_id || id === m.mfds_permit_number));
    const byName = [...masters.values()].filter(m => !!e.name.trim() && [m.name, m.regulatory_name ?? ''].some(n => descriptionNameKey(n) === descriptionNameKey(e.name)));
    const matchedBy = exact.length ? 'barcode' as const : byOfficial.length ? 'official_id' as const : 'name' as const;
    return (exact.length ? exact : byOfficial.length ? byOfficial : byName).slice(0, 50).map(master => ({ master, matchedBy }));
  });
  const selected = [...new Set(candidates.flatMap(rows => rows.map(r => r.master.id)))];
  const descriptions: Array<{ id: string; master_id: string; description_type: string; language: string; content: string; summary: string | null; updated_at: Date; source: DescriptionEntry['source'] | null }> = selected.length ? await db.query(
    `SELECT d.id,d.master_id,d.description_type,COALESCE(d.language,'ko') AS language,d.content,d.summary,d.updated_at,
       c.raw_payload->'descriptionResource'->'entry'->'source' AS source FROM shared_product_descriptions d
       LEFT JOIN product_candidates c ON c.id=d.source_ref_id AND c.source_label='PRODUCT_DESCRIPTION_RESOURCE_V1' AND c.deleted_at IS NULL
     WHERE d.master_id=ANY($1::uuid[]) AND d.description_type=ANY($2::text[]) AND COALESCE(d.language,'ko')=ANY($3::text[]) AND d.status='canonical' AND d.deleted_at IS NULL`,
    [selected, [...new Set(entries.map(e => e.descriptionType))], [...new Set(entries.map(e => e.language))]],
  ) : [];
  return candidates.map((rows, i) => rows.map(({ master, matchedBy }) => {
    const d = descriptions.find(d => d.master_id === master.id && d.description_type === entries[i].descriptionType && d.language === entries[i].language);
    const canonical = d && hasProductDescriptionText(sanitizeDescriptionHtml(d.content)) ? {
      id: d.id, source: d.source ?? null, content: sanitizeDescriptionHtml(d.content), summary: d.summary ? sanitizeDescriptionHtml(d.summary) : null,
      revision: canonicalRevision({ id: d.id, content: d.content, summary: d.summary, updatedAt: d.updated_at })!,
    } : null;
    return { id: master.id, name: master.name, barcode: master.barcode, manufacturer: master.manufacturer_name, matchedBy, canonical };
  }));
}
