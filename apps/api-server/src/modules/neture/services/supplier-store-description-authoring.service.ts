import type { DataSource } from 'typeorm';
import type { SharedProductDescriptionService } from './shared-product-description.service.js';

/** Supplier offer ownership and existing STORE draft persistence; review/sanitization stays in the shared service. */
export class SupplierStoreDescriptionAuthoringService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly descriptions: Pick<
      SharedProductDescriptionService,
      'upsertSupplierStoreDraft'
    >,
  ) {}
  async save(
    input: Omit<
      Parameters<SharedProductDescriptionService['upsertSupplierStoreDraft']>[0],
      'masterId' | 'createdBy' | 'summary'
    > & { userId: string; summaryRaw: string },
  ) {
    const { offerId, supplierId, userId, content, summaryRaw, language, submit } = input;
    const offerRows: Array<{ master_id: string | null }> = await this.dataSource.query(
      `SELECT master_id FROM supplier_product_offers WHERE id = $1 AND supplier_id = $2 LIMIT 1`,
      [offerId, supplierId],
    );
    const masterId = offerRows[0]?.master_id ?? null;
    if (!offerRows[0]) {
      return { kind: 'offer_not_found' } as const;
    }
    if (!masterId) {
      return { kind: 'master_not_linked' } as const;
    }

    const saved = await this.descriptions.upsertSupplierStoreDraft({
      masterId,
      supplierId,
      createdBy: userId,
      offerId,
      content,
      summary: summaryRaw || null,
      language,
      submit,
    });
    return { kind: 'saved', saved } as const;
  }
}
