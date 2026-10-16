import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Shared detail surface: Escape, close and focus restoration.
 * Standalone tablet / public QR: native modal (top layer, focus containment).
 * contained (embedded preview): non-modal dialog inside the nearest positioned
 * preview box, so a small authoring preview never covers or blocks the page around it.
 */
export function GuidanceDialog({ label, onClose, style, contained = false, children }: Readonly<{
  label: string;
  onClose: () => void;
  style?: CSSProperties;
  contained?: boolean;
  children: ReactNode;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    if (contained) {
      (dialog.querySelector<HTMLElement>(FOCUSABLE) ?? dialog).focus();
    } else {
      dialog.showModal();
    }
    return () => {
      if (!contained) dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [contained]);

  // 배경 클릭의 키보드 대응 — 두 모드 모두 Escape 로 닫고, 바깥(제작 화면 편집기)으로 전파하지 않는다.
  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  const maxWidth = typeof style?.maxWidth === 'string' ? style.maxWidth : '720px';
  const dialogStyle: CSSProperties = {
    ...style,
    padding: style?.padding ?? 0,
    boxSizing: 'border-box',
    border: 0,
    margin: 'auto',
    maxWidth: contained ? `min(${maxWidth}, 100%)` : `min(${maxWidth}, calc(100vw - 32px))`,
    maxHeight: contained ? '100%' : 'calc(100dvh - 32px)',
    ...(contained ? { position: 'relative' as const, inset: 'auto', overflow: 'auto' } : {}),
  };

  if (contained) {
    return (
      <div
        role="presentation"
        data-guidance-contained=""
        style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', boxSizing: 'border-box', background: 'rgba(15, 23, 42, 0.55)', overflow: 'hidden' }}
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <dialog
          ref={ref}
          open
          tabIndex={-1}
          aria-label={label}
          style={dialogStyle}
          onKeyDown={handleKeyDown}
        >
          {children}
        </dialog>
      </div>
    );
  }

  return (
    <dialog
      ref={ref}
      aria-label={label}
      style={dialogStyle}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={handleKeyDown}
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
