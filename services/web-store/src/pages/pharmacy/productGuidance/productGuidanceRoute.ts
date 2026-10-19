export interface ProductGuidanceReturn {
  path: string;
  scope: string;
  selectedKey: string;
}

/** Router state is a convenience only; never use it to authorize a product or another store. */
export function readProductGuidanceReturn(state: unknown, scope: string, base: string): ProductGuidanceReturn | null {
  if (!state || typeof state !== 'object' || !('productReturn' in state)) return null;
  const value = state.productReturn;
  if (!value || typeof value !== 'object' || !('path' in value) || !('scope' in value) || !('selectedKey' in value)) return null;
  if (value.scope !== scope || typeof value.path !== 'string' || typeof value.selectedKey !== 'string' ||
    value.path.length > 8192 || value.path.includes('#') || value.selectedKey.length > 200) return null;
  const pathname = value.path.split('?')[0];
  if (pathname !== `${base}/my-products` && pathname !== `${base}/workspace/commerce`) return null;
  return { path: value.path, scope, selectedKey: value.selectedKey };
}
