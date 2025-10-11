import { forwardRef, HTMLAttributes, createContext, useContext, useState, useEffect, ReactNode, ButtonHTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { cn } from '@o4o/utils';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

const Dialog = ({ open: controlledOpen, defaultOpen = false, onOpenChange, children }: DialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ onClick, ...props }, ref) => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('DialogTrigger must be used within Dialog');

    return (
      <button
        ref={ref}
        onClick={(e: any) => {
          onClick?.(e);
          context.onOpenChange(true);
        }}
        {...props}
      />
    );
  }
);

const DialogPortal = ({ children }: { children: ReactNode }) => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogPortal must be used within Dialog');

  if (!context.open) return null;

  return (
    <>
      {children}
    </>
  );
};

const DialogClose = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ onClick, ...props }, ref) => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('DialogClose must be used within Dialog');

    return (
      <button
        ref={ref}
        onClick={(e: any) => {
          onClick?.(e);
          context.onOpenChange(false);
        }}
        {...props}
      />
    );
  }
);

const DialogOverlay = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, onClick, ...props }, ref) => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('DialogOverlay must be used within Dialog');

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-[100000] bg-black/80",
          className
        )}
        onClick={(e: any) => {
          onClick?.(e);
          if (e.target === e.currentTarget) {
            context.onOpenChange(false);
          }
        }}
        {...props}
      />
    );
  }
);

const DialogContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('DialogContent must be used within Dialog');

    useEffect(() => {
      if (context.open) {
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            context.onOpenChange(false);
          }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [context]);

    return (
      <DialogPortal>
        <DialogOverlay />
        <div
          ref={ref}
          className={cn(
            "fixed left-[50%] top-[50%] z-[100001] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
            className
          )}
          {...props}
        >
          {children}
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </DialogPortal>
    );
  }
);

const DialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);

const DialogFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);

const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
);

const DialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);

Dialog.displayName = 'Dialog';
DialogTrigger.displayName = 'DialogTrigger';
DialogPortal.displayName = 'DialogPortal';
DialogClose.displayName = 'DialogClose';
DialogOverlay.displayName = 'DialogOverlay';
DialogContent.displayName = 'DialogContent';
DialogHeader.displayName = 'DialogHeader';
DialogFooter.displayName = 'DialogFooter';
DialogTitle.displayName = 'DialogTitle';
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
