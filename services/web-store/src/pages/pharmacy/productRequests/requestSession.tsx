import { useCallback, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useNativeStoreDialog } from '../hooks/useNativeStoreDialog';
import { useUnifiedStore } from '../../../contexts/StoreContext';
import { getActiveStoreOrganizationId } from '../../../lib/storeOrganizationHeader';

export function useProductRequestScope() {
  const { status, organizationId, effectiveServiceKey } = useUnifiedStore();
  return { organizationId, key: `${organizationId ?? ''}:${effectiveServiceKey ?? ''}`,
    ready: status === 'ready' && !!organizationId && !!effectiveServiceKey };
}

export function useRequestSession(organizationId: string) {
  const mounted = useRef(true);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return useCallback(() => mounted.current && getActiveStoreOrganizationId() === organizationId, [organizationId]);
}

/** Native top layer supplies focus containment, Escape and focus restoration. */
export function ProductRequestDialog({ children, onClose, label, style, focusKey, preventBackdropClose }: Readonly<{
  children: ReactNode; onClose: () => void; label: string; style: CSSProperties; focusKey?: string; preventBackdropClose?: boolean;
}>) {
  const dialog = useNativeStoreDialog();
  useLayoutEffect(() => {
    dialog.current?.querySelector<HTMLElement>('[data-request-autofocus]')?.focus();
  }, [dialog, focusKey]);
  return <dialog ref={dialog} aria-label={label}
    style={{ ...style, margin: 0, border: 0, width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', boxSizing: 'border-box' }}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onPointerDown={event => { if (!preventBackdropClose && event.target === event.currentTarget) onClose(); }}>
    {children}
  </dialog>;
}
