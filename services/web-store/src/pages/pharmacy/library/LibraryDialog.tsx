import { useNativeStoreDialog } from '../../../hooks/useNativeStoreDialog';
import { type CSSProperties, type ReactNode } from 'react';

export function LibraryDialog({ label, onClose, children, style }: Readonly<{
  label: string; onClose: () => void; children: ReactNode; style?: CSSProperties;
}>) {
  const ref = useNativeStoreDialog();
  return <dialog ref={ref} aria-modal="true" aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}
    className="backdrop:bg-slate-900/50"
    style={{ position: 'fixed', inset: 0, margin: 'auto', border: 0, padding: 0, width: 'calc(100% - 32px)', maxWidth: 460,
      maxHeight: '90vh', borderRadius: 12, ...style }}>{children}</dialog>;
}
