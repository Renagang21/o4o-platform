import { useNativeStoreDialog } from '../../../hooks/useNativeStoreDialog';
import { type ReactNode } from "react";

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
  const dialogRef = useNativeStoreDialog();
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
