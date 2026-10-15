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
    };
  }, []);
  return ref;
}
