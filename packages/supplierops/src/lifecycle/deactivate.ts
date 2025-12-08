/**
 * SupplierOps Deactivate Hook
 *
 * Called when the app is deactivated
 */

/**
 * Deactivate hook - disables routes and event handlers
 */
export async function onDeactivate(): Promise<void> {
  console.log('[SupplierOps] Running deactivate hook...');
  console.log('[SupplierOps] Routes and event handlers disabled');
  console.log('[SupplierOps] Deactivation completed');
}

export default onDeactivate;
