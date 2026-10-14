import { useLayoutEffect, useRef, type ReactNode } from "react";

export function AuthoringDialog({
  labelId,
  onClose,
  children,
  className = "max-w-lg",
}: Readonly<{
  labelId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      if (typeof dialog.close === "function") dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={labelId}
      onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`m-auto w-[calc(100%_-_2rem)] max-h-[90vh] rounded-xl border-0 p-0 backdrop:bg-slate-900/50 ${className}`}
    >
      {children}
    </dialog>
  );
}
