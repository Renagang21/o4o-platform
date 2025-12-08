/**
 * PartnerOps Uninstall Hook
 *
 * Called when the app is uninstalled
 */

import { DataSource } from 'typeorm';

export interface UninstallContext {
  tenantId: string;
  dataSource: DataSource;
  purgeData?: boolean;
}

export async function onUninstall(context: UninstallContext): Promise<void> {
  const { tenantId, dataSource, purgeData } = context;

  console.log(`[PartnerOps] Uninstalling for tenant: ${tenantId}, purgeData: ${purgeData}`);

  if (purgeData) {
    // Drop tables in correct order (respecting foreign keys)
    await dataSource.query(`DROP TABLE IF EXISTS partnerops_conversions CASCADE`);
    await dataSource.query(`DROP TABLE IF EXISTS partnerops_clicks CASCADE`);
    await dataSource.query(`DROP TABLE IF EXISTS partnerops_links CASCADE`);
    await dataSource.query(`DROP TABLE IF EXISTS partnerops_routines CASCADE`);
    await dataSource.query(`DROP TABLE IF EXISTS partnerops_partners CASCADE`);
    await dataSource.query(`DROP TABLE IF EXISTS partnerops_settings CASCADE`);

    console.log(`[PartnerOps] All data purged for tenant: ${tenantId}`);
  }

  console.log(`[PartnerOps] Uninstallation completed for tenant: ${tenantId}`);
}

export default onUninstall;
