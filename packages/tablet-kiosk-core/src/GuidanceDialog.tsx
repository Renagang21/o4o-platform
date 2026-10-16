import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/** Shared detail surface: native focus containment, Escape and focus restoration. */
export function GuidanceDialog({ label, onClose, style, children }: {
  label: string;
  onClose: () => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      style={{ ...style, padding: style?.padding ?? 0, boxSizing: 'border-box', border: 0, margin: 'auto', maxWidth: `min(${typeof style?.maxWidth === 'string' ? style.maxWidth : '720px'}, calc(100vw - 32px))`, maxHeight: 'calc(100dvh - 32px)' }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
