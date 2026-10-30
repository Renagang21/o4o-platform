import { useCallback, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

interface Props {
  label: string;
  busy?: boolean;
  dismissOnBackdrop?: boolean;
  onCancel: () => void;
  fallbackFocus: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

/** Shared modal lifecycle. Request state and permission checks stay with the caller. */
export function OperatorDialog({ label, busy = false, dismissOnBackdrop = false, onCancel, fallbackFocus, className = '', children }: Readonly<Props>) {
  const ref = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const origin = useRef<{ trigger: HTMLElement | null; parent: Element | null } | null>(null);
  const restoreFocus = useCallback((version: number, trigger: HTMLElement | null, parent: Element | null) => {
    if (generation.current !== version) return; // StrictMode remount must keep its new initial focus.
    const activeModal = document.activeElement?.closest('dialog[open]');
    if (activeModal && activeModal !== parent) return;
    const target = trigger?.isConnected && !trigger.matches(':disabled') &&
      !trigger.closest('dialog:not([open])') ? trigger :
      (parent?.matches('dialog[open]') ? parent : null)?.querySelector<HTMLElement>('[data-dialog-initial-focus]:not(:disabled), button:not(:disabled), input:not(:disabled)') ?? fallbackFocus.current;
    if (target?.isConnected) target.focus();
  }, [fallbackFocus]);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const version = ++generation.current;
    if (!origin.current) {
      const trigger = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      origin.current = { trigger, parent: trigger?.closest('dialog[open]') ?? null };
    }
    const { trigger, parent } = origin.current;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
    return () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      requestAnimationFrame(() => restoreFocus(version, trigger, parent));
    };
  }, [restoreFocus]);

  useLayoutEffect(() => {
    const dialog = ref.current;
    const active = document.activeElement;
    if (!dialog || (active instanceof Element && active.closest('dialog[open]') !== dialog && active.closest('dialog[open]'))) return;
    if (active instanceof HTMLElement && (!dialog.contains(active) || active.matches(':disabled'))) dialog.focus();
  });

  return <dialog ref={ref} aria-label={label} aria-busy={busy || undefined} tabIndex={-1}
    onPointerUp={event => {
      if (!dismissOnBackdrop || busy || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onCancel();
    }}
    onCancel={event => { event.stopPropagation(); event.preventDefault(); if (!busy) onCancel(); }}
    onKeyDown={event => {
      if (event.key === 'Escape') event.stopPropagation(); // Keep a legacy parent drawer open.
      if (event.key !== 'Tab' || (event.target as Element).closest('dialog') !== ref.current) return;
      const controls = Array.from(ref.current!.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'))
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); ref.current!.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) {
        event.preventDefault(); first.focus();
      }
    }}
    className={`!m-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto border-0 text-inherit backdrop:bg-black/50 ${className}`}>
    {children}
  </dialog>;
}
