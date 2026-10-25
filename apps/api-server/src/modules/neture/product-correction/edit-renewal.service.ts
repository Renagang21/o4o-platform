import { randomUUID } from 'node:crypto';
import type { ProductDescriptionRenewal, ProductDescriptionRenewalField } from '@o4o/types';
import { RENEWAL, renewalKey } from './periodic.contracts.js';
import { insert, type Db } from './records.js';
import { notice } from './renewal.service.js';

export interface ProductEditChange {
  field: ProductDescriptionRenewalField;
  before: unknown;
  after: unknown;
}
/** Compare persisted values, not submitted keys; never relax the actual edit whitelist. */
export function changedProductValues(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: ProductDescriptionRenewalField[],
): ProductEditChange[] {
  return fields.flatMap((field) =>
    JSON.stringify(before[field] ?? null) === JSON.stringify(after[field] ?? null)
      ? []
      : [{ field, before: before[field] ?? null, after: after[field] ?? null }],
  );
}
export interface ProductEditEvent {
  id: string;
  productId: string;
  productName: string;
  origin: 'catalog-edit' | 'admin-description';
  actorId: string | null;
  at: string;
  changes: ProductEditChange[];
}
/** Must run inside the original edit transaction. The event identity also fences repeated delivery. */
export async function enqueueProductEditRenewals(
  db: Db,
  input: Omit<ProductEditEvent, 'id' | 'at'> & {
    id?: string;
    fallback?: { type: string; language: string };
  },
) {
  if (!input.changes.length) return null;
  const event: ProductEditEvent = {
    id: input.id ?? randomUUID(),
    productId: input.productId,
    productName: input.productName,
    origin: input.origin,
    actorId: input.actorId,
    at: new Date().toISOString(),
    changes: input.changes,
  };
  const claimed = await db.query(
    `INSERT INTO settings(key,type,value,description) VALUES($1,'product_correction_edit_event',$2::jsonb,'일반 상품·설명서 실변경') ON CONFLICT(key) DO NOTHING RETURNING key`,
    [`product-correction:edit-event:${event.id}`, JSON.stringify(event)],
  );
  if (!claimed.length) return null;
  const targets = await db.query(
    `SELECT id,description_type AS type,COALESCE(language,'ko') AS language FROM shared_product_descriptions
    WHERE master_id=$1 AND status='canonical' AND deleted_at IS NULL ORDER BY description_type,COALESCE(language,'ko'),id`,
    [event.productId],
  );
  if (!targets.length)
    targets.push({
      id: null,
      type: input.fallback?.type ?? 'STORE',
      language: input.fallback?.language ?? 'ko',
    });
  for (const target of targets) {
    const record: ProductDescriptionRenewal = {
      id: `${event.id}:${target.type}:${target.language}`,
      productId: event.productId,
      productName: event.productName,
      origin: event.origin,
      changeEventId: event.id,
      changeActorId: event.actorId,
      sourceChanges: event.changes,
      descriptionType: target.type,
      language: target.language,
      descriptionId: target.id,
      changedFields: event.changes.map((change) => change.field),
      purposes: [],
      state: 'pending',
      revision: 1,
      createdAt: event.at,
      updatedAt: event.at,
      notes: '',
    };
    await insert(db, renewalKey(record.id), RENEWAL, record);
  }
  await notice(
    db,
    `edit-renewal:${event.id}`,
    'renewal',
    event.id,
    '일반 상품·설명서 변경에 따른 설명서 갱신·이용 목적 검토가 필요합니다.',
  );
  return event;
}
