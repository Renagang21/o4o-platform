import type { Location } from 'react-router-dom';

export interface StoreOperationEntry {
  scope: string;
  kind: 'tablet' | 'qr';
  id: string;
  returnPath: string;
  returnState: unknown;
}

export function hasStoreOperationEntry(state: unknown) {
  return !!state && typeof state === 'object' && 'storeOperationEntry' in state;
}

export function storeOperationState(location: Location, scope: string, kind: StoreOperationEntry['kind'], id: string) {
  return {
    storeOperationEntry: {
      scope, kind, id,
      returnPath: `${location.pathname}${location.search}${location.hash}`,
      returnState: location.state,
    },
  };
}

/** A navigation hint only; destination data and existing server guards still confirm the target. */
export function readStoreOperationEntry(state: unknown, scope: string, base: string, kind: StoreOperationEntry['kind']): StoreOperationEntry | null {
  const value = (state as { storeOperationEntry?: StoreOperationEntry } | null)?.storeOperationEntry;
  const path = `${base}/execution`;
  if (!value || value.scope !== scope || value.kind !== kind || typeof value.id !== 'string' || !value.id ||
    typeof value.returnPath !== 'string' || !(value.returnPath === path || value.returnPath.startsWith(`${path}?`) || value.returnPath.startsWith(`${path}#`))) return null;
  return value;
}
