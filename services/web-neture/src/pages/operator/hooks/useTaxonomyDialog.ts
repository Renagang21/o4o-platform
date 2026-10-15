import { useLayoutEffect, useRef, useCallback, type RefObject } from 'react';

/** Local lifecycle for the taxonomy dialogs; native modal focus handles nested dialogs. */
export function useTaxonomyDialog(open: boolean, fallback: RefObject<HTMLElement | null>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingReturn = useRef(false);
  const getFallback = useCallback(() => fallback.current, [fallback]);

  // A successful save can replace the invoking row while data reloads.
  useLayoutEffect(() => {
    if (pendingReturn.current && fallback.current?.isConnected) {
      pendingReturn.current = false;
      fallback.current.focus();
    }
    const dialog = dialogRef.current;
    const active = document.activeElement;
    if (open && dialog?.open && active instanceof HTMLElement &&
      (!dialog.contains(active) || active.matches(':disabled'))) {
      // Disabling the focused confirmation button must not leave focus on body.
      dialog.focus();
    }
  });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();

    // Native modality blocks background controls, but Tab can still reach browser chrome.
    // Recompute the boundary as controls become disabled during a request.
    const keepTabInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || (event.target as Element).closest('dialog') !== dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex]',
      )).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', keepTabInside);

    return () => {
      dialog.removeEventListener('keydown', keepTabInside);
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      requestAnimationFrame(() => {
        const target = trigger?.isConnected && !trigger.closest('dialog:not([open])')
          ? trigger : getFallback();
        if (target?.isConnected) target.focus();
        else pendingReturn.current = true;
      });
    };
  }, [open, getFallback]);

  return dialogRef;
}
