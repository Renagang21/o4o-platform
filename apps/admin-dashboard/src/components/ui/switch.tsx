import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2",
            "peer-focus:ring-blue-500 peer-focus:ring-offset-2 rounded-full",
            "peer peer-checked:after:translate-x-full peer-checked:after:border-white",
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
            "after:bg-white after:border-gray-300 after:border after:rounded-full",
            "after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600",
            "peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
            className
          )}
        />
      </label>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };