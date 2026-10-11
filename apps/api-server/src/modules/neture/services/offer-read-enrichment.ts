import { AppDataSource } from '../../../database/connection.js';
import type { NetureSupplier, SupplierProductOffer } from '../entities/index.js';

/** Organization name enrichment for the existing offer read DTOs; failures remain non-fatal. */
export async function getOfferOrganizationNames(suppliers: NetureSupplier[]): Promise<Map<string, string>> {
    const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
    const map = new Map<string, string>();
    if (orgIds.length === 0) return map;
    try {
      const rows: Array<{ id: string; name: string }> = await AppDataSource.query(
        `SELECT id, name FROM organizations WHERE id = ANY($1)`,
        [orgIds],
      );
      for (const r of rows) map.set(r.id, r.name);
    } catch { /* non-fatal */ }
    return map;
  }

/** Shared fields of the two existing admin list responses. */
export function mapAdminOffer(o: SupplierProductOffer, orgNameMap: Map<string, string>) {
  return {
        id: o.id,
        masterId: o.masterId,
        masterName: o.master?.name || '',
        supplierName: (o.supplier?.organizationId ? orgNameMap.get(o.supplier.organizationId) : '') || '',
        supplierId: o.supplierId,
        isPublic: o.isPublic,
        distributionType: o.distributionType,
        isActive: o.isActive,
        approvalStatus: o.approvalStatus,
        priceGeneral: o.priceGeneral,
        priceGold: o.priceGold,
        pricePlatinum: o.pricePlatinum,
        consumerReferencePrice: o.consumerReferencePrice,
        consumerShortDescription: o.consumerShortDescription,
        consumerDetailDescription: o.consumerDetailDescription,
        businessShortDescription: o.businessShortDescription,
        businessDetailDescription: o.businessDetailDescription,
        createdAt: o.createdAt,
      };
}
