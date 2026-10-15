import { useLayoutEffect, useRef } from 'react';

/** Native store dialogs share modal focus and return-focus behavior; commands stay with each screen. */
export function useNativeStoreDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    return () => {
      if (typeof dialog.close === 'function') dialog.close();
      if (trigger?.isConnected) trigger.focus();
      // Backdrop pointerdown can remove the dialog before the browser's default focus action.
      // Repair only an otherwise unfocused document, never a newly opened dialog or another control.
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => {
        if (trigger?.isConnected && document.activeElement === document.body && !document.querySelector('dialog[open]')) trigger.focus();
      });
    };
  }, []);
  return ref;
}
