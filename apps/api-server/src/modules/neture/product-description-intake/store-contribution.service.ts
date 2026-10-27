import type { DataSource } from 'typeorm';
import { z } from 'zod';
import { KpaStoreContent } from '../../../routes/kpa/entities/kpa-store-content.entity.js';
import { consultationSchema, directContentRevision } from '../../../services/store/consultation-content.js';
import { DescriptionIntakeError, normalizeProductBarcode, prepareDescriptionEntries } from './contracts.js';
import { insertDescriptionResource } from './intake.service.js';

/** Owner authorization stays at the existing controller; stored org/link/revision are rechecked here. */
export async function submitStoreDescriptionContribution(db: DataSource, organizationId: string, actor: string, id: string, raw: unknown) {
  const parsed = z.object({ expectedRevision: z.string().regex(/^[a-f0-9]{64}$/) }).strict().safeParse(raw);
  if (!parsed.success) throw new DescriptionIntakeError('INVALID_CONTRIBUTION');
  return db.transaction(async manager => {
    const row = await manager.getRepository(KpaStoreContent).findOne({ where: { id, organization_id: organizationId, source_type: 'direct' }, lock: { mode: 'pessimistic_read' } });
    if (!row) throw new DescriptionIntakeError('CONTENT_NOT_FOUND', 404);
    if (directContentRevision(row) !== parsed.data.expectedRevision) throw new DescriptionIntakeError('CONTENT_CHANGED', 409);
    const context = consultationSchema.safeParse(row.content_json?.productConsultation);
    if (!context.success) throw new DescriptionIntakeError('SAVED_CONSULTATION_REQUIRED');
    const product = context.data.product;
    const active: Array<{ id: string; name: string; barcode: string | null }> = product.sourceType === 'listing'
      ? await manager.query(`SELECT p.id,pm.name,pm.barcode FROM organization_product_listings p JOIN product_masters pm ON pm.id=p.master_id
          WHERE p.id=$1 AND p.organization_id=$2 AND p.is_active=true AND pm.status='ACTIVE' FOR SHARE OF p,pm`, [product.sourceId, organizationId])
      : await manager.query('SELECT id,name,barcode FROM store_local_products WHERE id=$1 AND organization_id=$2 AND is_active=true FOR SHARE', [product.sourceId, organizationId]);
    if (!active.length) throw new DescriptionIntakeError('INVALID_PRODUCT_REF', 403);
    const links = await manager.query(`SELECT id FROM kpa_store_content_product_links WHERE organization_id=$1 AND content_id=$2 AND product_source_type=$3 AND product_source_id=$4 AND link_type='product_description' FOR SHARE`, [organizationId, id, product.sourceType, product.sourceId]);
    if (!links.length) throw new DescriptionIntakeError('PRODUCT_LINK_CHANGED', 409);
    const barcode = active[0].barcode ? normalizeProductBarcode(active[0].barcode) : null;
    const prepared = prepareDescriptionEntries({ entries: [{ key: id, name: active[0].name, barcodes: barcode ? [barcode] : [],
      content: typeof row.content_json?.html === 'string' ? row.content_json.html : '',
      descriptionType: context.data.assist.purpose === 'consumer-qr' ? 'STORE' : 'B2B', language: context.data.language,
      source: { kind: 'user_contribution', currentness: 'user', checkedOn: null, references: [] } }] });
    if (!prepared.entries.length) throw new DescriptionIntakeError('DESCRIPTION_CONTENT_EMPTY');
    const result = await insertDescriptionResource(manager, prepared.entries[0], actor,
      { organizationId, contentId: id, revision: parsed.data.expectedRevision, actor });
    // Contribution reference text is retained as authored context, never as verified government evidence.
    if (!result.replayed) await manager.query(`UPDATE product_candidates SET raw_payload=jsonb_set(raw_payload,'{descriptionResource,authorContext}',$2::jsonb) WHERE id=$1`, [result.id, JSON.stringify(context.data.assist)]);
    return result;
  });
}
