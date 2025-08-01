import { FC, ReactNode, isValidElement, cloneElement, ReactElement } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

// Basic component interfaces for type safety
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  asChild?: boolean;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

// Simple component implementations
export const Button: FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    default: 'bg-primary text-primary-foreground hover:bg-primary/90'
  };
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 py-2 px-4',
    lg: 'h-11 px-8',
    icon: 'h-10 w-10 p-0'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant as keyof typeof variantClasses]} ${sizeClasses[size as keyof typeof sizeClasses]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input: FC<InputProps> = ({ 
  className = '', 
  error,
  ...props 
}) => {
  return (
    <div className="space-y-1">
      <input
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export const Card: FC<CardProps> = ({ className = '', children, ...props }) => {
  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: FC<CardProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardContent: FC<CardProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: FC<HTMLAttributes<HTMLHeadingElement>> = ({ className = '', children, ...props }) => {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: FC<HTMLAttributes<HTMLParagraphElement>> = ({ className = '', children, ...props }) => {
  return (
    <p className={`text-sm text-muted-foreground ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardFooter: FC<CardProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const Label: FC<LabelProps> = ({ className = '', children, ...props }) => {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};

export const Badge: FC<BadgeProps> = ({ 
  variant = 'default', 
  className = '', 
  children, 
  ...props 
}) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground border border-input hover:bg-accent hover:text-accent-foreground'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses[variant as keyof typeof variantClasses]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox: FC<CheckboxProps> = ({ 
  className = '', 
  onCheckedChange,
  ...props 
}) => {
  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded border border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  );
};

export const Textarea: FC<TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ 
  className = '', 
  ...props 
}) => {
  return (
    <textarea
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

export const Select: FC<SelectHTMLAttributes<HTMLSelectElement>> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <select
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

// Radio Group components (simplified)
export interface RadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

export const RadioGroup: FC<RadioGroupProps> = ({ 
  className = '', 
  value,
  onValueChange,
  name,
  children, 
  ...props 
}) => {
  // Simple implementation without complex cloning
  return (
    <div className={`grid gap-2 ${className}`} data-value={value} data-name={name} {...props}>
      {children}
    </div>
  );
};

export const RadioGroupItem: FC<InputHTMLAttributes<HTMLInputElement> & { id: string }> = ({ 
  className = '', 
  ...props 
}) => {
  return (
    <input
      type="radio"
      className={`h-4 w-4 rounded-full border border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
      {...props}
    />
  );
};

// Tabs components (simplified)
export const Tabs: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  children, 
  ...props 
}) => {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
};

export const TabsList: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  children, 
  ...props 
}) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`} {...props}>
      {children}
    </div>
  );
};

export const TabsTrigger: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({ 
  className = '', 
  children, 
  ...props 
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent: FC<HTMLAttributes<HTMLDivElement> & { value?: string }> = ({ 
  className = '', 
  children, 
  value,
  ...props 
}) => {
  return (
    <div 
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`} 
      data-value={value}
      {...props}
    >
      {children}
    </div>
  );
};

// Slider component (simplified)
export const Slider: FC<InputHTMLAttributes<HTMLInputElement>> = ({ 
  className = '', 
  ...props 
}) => {
  return (
    <input
      type="range"
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${className}`}
      {...props}
    />
  );
};

// Progress component
export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export const Progress: FC<ProgressProps> = ({ 
  className = '', 
  value = 0,
  max = 100,
  ...props 
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div 
      className={`relative h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
};

// Skeleton component
export const Skeleton: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  ...props 
}) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
      {...props}
    />
  );
};

// Alert components
export const Alert: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const AlertDescription: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <div
      className={`text-sm [&_p]:leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Dropdown Menu components (simplified)
export const DropdownMenu: FC<HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => {
  return <div className="relative inline-block text-left" {...props}>{children}</div>;
};

export const DropdownMenuTrigger: FC<HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }> = ({ 
  children, 
  asChild, 
  ...props 
}) => {
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<HTMLAttributes<HTMLElement>>, props);
  }
  return <button {...props}>{children}</button>;
};

export const DropdownMenuContent: FC<HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end' }> = ({ 
  className = '', 
  align = 'center',
  children, 
  ...props 
}) => {
  return (
    <div
      className={`z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  children, 
  ...props 
}) => {
  return (
    <div
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Select components (enhanced)
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

export const SelectTrigger: FC<HTMLAttributes<HTMLButtonElement>> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <button
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const SelectValue: FC<{ placeholder?: string }> = ({ placeholder }) => {
  return <span>{placeholder || 'Select...'}</span>;
};

export const SelectContent: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <div
      className={`relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const SelectItem: FC<HTMLAttributes<HTMLDivElement> & { value: string }> = ({ 
  className = '', 
  children,
  value,
  ...props 
}) => {
  return (
    <div
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${className}`}
      data-value={value}
      {...props}
    >
      {children}
    </div>
  );
};

// Toggle Group components
export interface ToggleGroupProps extends HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
}

export const ToggleGroup: FC<ToggleGroupProps> = ({ 
  className = '', 
  type = 'single',
  children,
  ...props 
}) => {
  return (
    <div
      className={`inline-flex rounded-md shadow-sm ${className}`}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
};

export const ToggleGroupItem: FC<ButtonHTMLAttributes<HTMLButtonElement> & { value: string }> = ({ 
  className = '', 
  value,
  children,
  ...props 
}) => {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 ${className}`}
      data-value={value}
      {...props}
    >
      {children}
    </button>
  );
};

// Dialog components
export interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dialog: FC<DialogProps> = ({ 
  open = false,
  children,
  ...props 
}) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50" {...props}>
      <div className="fixed inset-0 bg-black/50" />
      {children}
    </div>
  );
};

export const DialogContent: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
      <div
        className={`max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-lg ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: FC<HTMLAttributes<HTMLDivElement>> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const DialogTitle: FC<HTMLAttributes<HTMLHeadingElement>> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <h2
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
};

// Add Dialog Trigger
export const DialogTrigger: FC<HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }> = ({ 
  children, 
  asChild, 
  ...props 
}) => {
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<HTMLAttributes<HTMLElement>>, props);
  }
  return <button {...props}>{children}</button>;
};