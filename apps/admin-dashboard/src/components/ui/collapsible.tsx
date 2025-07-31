import { forwardRef, HTMLAttributes, ButtonHTMLAttributes, createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export interface CollapsibleProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open: controlledOpen, defaultOpen = false, onOpenChange, children, className, ...props }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const open = controlledOpen ?? uncontrolledOpen;
    
    const handleOpenChange = (newOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    };

    return (
      <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    );
  }
);

const CollapsibleTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ onClick, ...props }, ref) => {
    const context = useContext(CollapsibleContext);
    if (!context) throw new Error('CollapsibleTrigger must be used within Collapsible');
    
    return (
      <button
        ref={ref}
        onClick={(e) => {
          onClick?.(e);
          context.onOpenChange(!context.open);
        }}
        aria-expanded={context.open}
        {...props}
      />
    );
  }
);

const CollapsibleContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, style, children, ...props }, ref) => {
    const context = useContext(CollapsibleContext);
    if (!context) throw new Error('CollapsibleContent must be used within Collapsible');
    
    if (!context.open) {
      return null;
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden",
          "data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up",
          className
        )}
        data-state={context.open ? 'open' : 'closed'}
        style={{
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Collapsible.displayName = 'Collapsible';
CollapsibleTrigger.displayName = 'CollapsibleTrigger';
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleTrigger, CollapsibleContent };