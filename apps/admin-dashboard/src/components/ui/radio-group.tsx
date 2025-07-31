import { forwardRef, HTMLAttributes, InputHTMLAttributes, createContext, useContext, useState } from 'react';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value: controlledValue, defaultValue = '', onValueChange, name = `radio-group-${Math.random()}`, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const value = controlledValue ?? uncontrolledValue;
    
    const handleValueChange = (newValue: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <RadioGroupContext.Provider value={{ value, onValueChange: handleValueChange, name }}>
        <div
          ref={ref}
          role="radiogroup"
          className={cn("grid gap-2", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);

export interface RadioGroupItemProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'name'> {
  value: string;
}

const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, ...props }, ref) => {
    const context = useContext(RadioGroupContext);
    if (!context) throw new Error('RadioGroupItem must be used within RadioGroup');
    
    const isChecked = context.value === value;
    const inputId = id || `${context.name}-${value}`;
    
    return (
      <div className="relative">
        <input
          ref={ref}
          type="radio"
          id={inputId}
          name={context.name}
          value={value}
          checked={isChecked}
          onChange={(e) => {
            if (e.target.checked) {
              context.onValueChange(value);
            }
          }}
          className="sr-only peer"
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "aspect-square h-4 w-4 rounded-full border border-wp-border",
            "ring-offset-white focus:outline-none peer-focus-visible:ring-2",
            "peer-focus-visible:ring-wp-primary peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "peer-checked:border-wp-primary cursor-pointer",
            "flex items-center justify-center",
            className
          )}
        >
          {isChecked && (
            <Circle className="h-2.5 w-2.5 fill-wp-primary text-wp-primary" />
          )}
        </label>
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };