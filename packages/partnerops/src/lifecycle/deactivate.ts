/**
 * PartnerOps Deactivate Hook
 *
 * Called when the app is deactivated
 */

export interface DeactivateContext {
  tenantId: string;
  config?: Record<string, any>;
}

export async function onDeactivate(context: DeactivateContext): Promise<void> {
  const { tenantId } = context;

  console.log(`[PartnerOps] Deactivating for tenant: ${tenantId}`);

  // Unregister event handlers, stop background jobs, etc.

  console.log(`[PartnerOps] Deactivation completed for tenant: ${tenantId}`);
}

export default onDeactivate;
