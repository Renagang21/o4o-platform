/**
 * PartnerOps Activate Hook
 *
 * Called when the app is activated
 */

export interface ActivateContext {
  tenantId: string;
  config?: Record<string, any>;
}

export async function onActivate(context: ActivateContext): Promise<void> {
  const { tenantId } = context;

  console.log(`[PartnerOps] Activating for tenant: ${tenantId}`);

  // Register event handlers, start background jobs, etc.

  console.log(`[PartnerOps] Activation completed for tenant: ${tenantId}`);
}

export default onActivate;
