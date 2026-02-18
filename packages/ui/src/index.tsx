/**
 * ═══════════════════════════════════════════════════════════════════════════
 * O4O Platform - Design Core v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @status OFFICIAL - Design Core Phase 1 공식 UI 라이브러리
 * @version 1.0.0
 * @date 2025-12-15
 * @package @o4o/ui
 *
 * 이 패키지는 O4O Platform의 **공식 UI/Design 라이브러리**입니다.
 *
 * ⚠️ 중요:
 * - 모든 신규 앱은 이 패키지의 컴포넌트만 사용
 * - 앱별 커스텀 UI 컴포넌트 생성 ❌
 * - 기존 앱 UI 수정 ❌
 *
 * 구성:
 * - Primitive Components: Card, Button, Input, Badge 등 (shadcn 스타일)
 * - AG Components: AGButton, AGCard, AGTable 등 (View-Level)
 * - Layout System: AGAppLayout, AGSidebar, AGHeader 등
 * - Design Tokens: colors, spacing, typography 등
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { HTMLAttributes, forwardRef, ButtonHTMLAttributes } from 'react';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// Card Components
const Card = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Button Component
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary' | 'success';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  // Allow shadcn-style API seen in apps; ignored at runtime
  asChild?: boolean;
}

const getVariantClasses = (variant: ButtonVariant = 'default'): string => {
  const variants: Record<ButtonVariant, string> = {
    default: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg focus-visible:ring-blue-500",
    destructive: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md hover:from-red-700 hover:to-red-800 hover:shadow-lg focus-visible:ring-red-500",
    outline: "border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-500",
    secondary: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 shadow-sm hover:from-gray-200 hover:to-gray-300 focus-visible:ring-gray-500",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
    link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-800 focus-visible:ring-blue-500",
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transform hover:-translate-y-0.5 focus-visible:ring-blue-500",
    success: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:from-green-700 hover:to-green-800 hover:shadow-lg focus-visible:ring-green-500",
  };
  return variants[variant];
};

const getSizeClasses = (size: ButtonSize = 'default'): string => {
  const sizes: Record<ButtonSize, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-md px-8 text-base",
    icon: "h-10 w-10",
  };
  return sizes[size];
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform active:scale-95",
          getVariantClasses(variant),
          getSizeClasses(size),
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// Alert Components
const Alert = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative w-full rounded-lg border p-4",
      variant === 'default' && "bg-background text-foreground",
      variant === 'destructive' && "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      className
    )}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

// Input Component
const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

// Label Component
const Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

// Badge Component
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground"
}

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export {
  Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent,
  Button,
  Alert, AlertTitle, AlertDescription,
  Input,
  Label,
  Badge,
  cn
};

// ---------------------------------------------------------------------------
// Minimal additional primitives to satisfy app imports
// These are intentionally lightweight and can be replaced with full-featured
// components later without changing import sites.

// Textarea
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

// Select (native)
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

// Skeleton
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-gray-200 dark:bg-gray-800',
      className
    )}
    {...props}
  />
);

// Tabs (very light placeholder API)
type TabsProps = React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string };
export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props} />
  )
);
Tabs.displayName = 'Tabs';

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex gap-2', className)} {...props} />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md border px-3 py-1 text-sm',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string }
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(className)} {...props} />
));
TabsContent.displayName = 'TabsContent';

// Additional components for ecommerce app

// Checkbox Component
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={cn(
      "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500",
      className
    )}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';

// Radio Group Components
export const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
));
RadioGroup.displayName = 'RadioGroup';

export const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="radio"
    ref={ref}
    className={cn(
      "h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500",
      className
    )}
    {...props}
  />
));
RadioGroupItem.displayName = 'RadioGroupItem';

// Slider Component
export const Slider = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="range"
    ref={ref}
    className={cn(
      "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
      className
    )}
    {...props}
  />
));
Slider.displayName = 'Slider';

// Dialog Components
export const Dialog: React.FC<React.HTMLAttributes<HTMLDivElement> & { open?: boolean }> = ({ 
  children, open, className, ...props 
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={cn("bg-white rounded-lg shadow-lg", className)} {...props}>
        {children}
      </div>
    </div>
  );
};

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mb-4", className)} {...props} />
));
DialogHeader.displayName = 'DialogHeader';

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

// Select Components (Radix-style API)
export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("bg-white border rounded-md shadow-lg", className)} {...props}>
    {children}
  </div>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string }
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-3 py-2 hover:bg-gray-100 cursor-pointer", className)} {...props} />
));
SelectItem.displayName = 'SelectItem';

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
      className
    )}
    {...props}
  />
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn(className)} {...props} />
));
SelectValue.displayName = 'SelectValue';

// Toggle Group Components
interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple';
  value?: string;
  onValueChange?: (value: string) => void;
}

export const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  ToggleGroupProps
>(({ className, type, value, onValueChange, ...props }, ref) => (
  <div ref={ref} className={cn("flex space-x-1", className)} {...props} />
));
ToggleGroup.displayName = 'ToggleGroup';

interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;
}

export const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  ToggleGroupItemProps
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "px-3 py-2 text-sm border rounded-md hover:bg-gray-100",
      className
    )}
    {...props}
  />
));
ToggleGroupItem.displayName = 'ToggleGroupItem';

// Dropdown Menu Components
export const DropdownMenu: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div className="relative inline-block" {...props}>{children}</div>
);

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ className, asChild, ...props }, ref) => (
  <button ref={ref} className={cn(className)} {...props} />
));
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ className, align, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute mt-2 w-48 bg-white border rounded-md shadow-lg z-50",
      align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2',
      className
    )}
    {...props}
  />
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer", className)}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

// Progress Component
export const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number }
>(({ className, value = 0, max = 100, ...props }, ref) => (
  <div ref={ref} className={cn("w-full bg-gray-200 rounded-full h-2", className)} {...props}>
    <div
      className="bg-blue-600 h-2 rounded-full transition-all"
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
    />
  </div>
));
Progress.displayName = 'Progress';

// ===========================================================================
// Phase 7-A: Antigravity Design System Components
// ===========================================================================

// AG Components
export * from './ag-components';

// Layout Components
export * from './layout';

// Theme Tokens
export * from './theme';

// Corner Display Components (Phase 1)
export * from './corner-display';

// Content Discovery Components (Phase 1)
export * from './content-discovery';

// Store Block Engine (WO-STORE-BLOCK-REGISTRY-V1)
export * from './store-blocks';
