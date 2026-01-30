import { forwardRef, InputHTMLAttributes, useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, indeterminate, onCheckedChange, onChange, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const mergedRef = ref || inputRef;
    
    useEffect(() => {
      const checkbox = typeof mergedRef === 'function' ? null : mergedRef.current;
      if (checkbox) {
        checkbox.indeterminate = indeterminate || false;
      }
    }, [indeterminate, mergedRef]);
    
    return (
      <div className="relative inline-flex">
        <input
          type="checkbox"
          ref={mergedRef}
          checked={checked}
          onChange={(e: any) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "checked:bg-primary checked:text-primary-foreground",
            "appearance-none cursor-pointer",
            indeterminate && "bg-primary",
            className
          )}
          {...props}
        />
        {indeterminate ? (
          <Minus 
            className={cn(
              "h-4 w-4 absolute top-0 left-0 text-white pointer-events-none"
            )} 
          />
        ) : (
          <Check 
            className={cn(
              "h-4 w-4 absolute top-0 left-0 text-white pointer-events-none",
              "peer-checked:block hidden"
            )} 
          />
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };