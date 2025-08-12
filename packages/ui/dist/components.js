import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { isValidElement, cloneElement } from 'react';
// Simple component implementations
export const Button = ({ variant = 'primary', size = 'md', className = '', children, ...props }) => {
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
    return (_jsx("button", { className: `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`, ...props, children: children }));
};
export const Input = ({ className = '', error, ...props }) => {
    return (_jsxs("div", { className: "space-y-1", children: [_jsx("input", { className: `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500' : ''} ${className}`, ...props }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] }));
};
export const Card = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `rounded-lg border bg-card text-card-foreground shadow-sm ${className}`, ...props, children: children }));
};
export const CardHeader = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `flex flex-col space-y-1.5 p-6 ${className}`, ...props, children: children }));
};
export const CardContent = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `p-6 pt-0 ${className}`, ...props, children: children }));
};
export const CardTitle = ({ className = '', children, ...props }) => {
    return (_jsx("h3", { className: `text-2xl font-semibold leading-none tracking-tight ${className}`, ...props, children: children }));
};
export const CardDescription = ({ className = '', children, ...props }) => {
    return (_jsx("p", { className: `text-sm text-muted-foreground ${className}`, ...props, children: children }));
};
export const CardFooter = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `flex items-center p-6 pt-0 ${className}`, ...props, children: children }));
};
export const Label = ({ className = '', children, ...props }) => {
    return (_jsx("label", { className: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`, ...props, children: children }));
};
export const Badge = ({ variant = 'default', className = '', children, ...props }) => {
    const variantClasses = {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border border-input hover:bg-accent hover:text-accent-foreground'
    };
    return (_jsx("span", { className: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses[variant]} ${className}`, ...props, children: children }));
};
export const Checkbox = ({ className = '', onCheckedChange, ...props }) => {
    return (_jsx("input", { type: "checkbox", className: `h-4 w-4 rounded border border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`, onChange: (e) => onCheckedChange?.(e.target.checked), ...props }));
};
export const Textarea = ({ className = '', ...props }) => {
    return (_jsx("textarea", { className: `flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`, ...props }));
};
export const Select = ({ className = '', children, ...props }) => {
    return (_jsx("select", { className: `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`, ...props, children: children }));
};
export const RadioGroup = ({ className = '', value, onValueChange, name, children, ...props }) => {
    // Simple implementation without complex cloning
    return (_jsx("div", { className: `grid gap-2 ${className}`, "data-value": value, "data-name": name, ...props, children: children }));
};
export const RadioGroupItem = ({ className = '', ...props }) => {
    return (_jsx("input", { type: "radio", className: `h-4 w-4 rounded-full border border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`, ...props }));
};
// Tabs components (simplified)
export const Tabs = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `${className}`, ...props, children: children }));
};
export const TabsList = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`, ...props, children: children }));
};
export const TabsTrigger = ({ className = '', children, ...props }) => {
    return (_jsx("button", { className: `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className}`, ...props, children: children }));
};
export const TabsContent = ({ className = '', children, value, ...props }) => {
    return (_jsx("div", { className: `mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`, "data-value": value, ...props, children: children }));
};
// Slider component (simplified)
export const Slider = ({ className = '', ...props }) => {
    return (_jsx("input", { type: "range", className: `w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${className}`, ...props }));
};
export const Progress = ({ className = '', value = 0, max = 100, ...props }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (_jsx("div", { className: `relative h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`, ...props, children: _jsx("div", { className: "h-full w-full flex-1 bg-primary transition-all", style: { transform: `translateX(-${100 - percentage}%)` } }) }));
};
// Skeleton component
export const Skeleton = ({ className = '', ...props }) => {
    return (_jsx("div", { className: `animate-pulse rounded-md bg-muted ${className}`, ...props }));
};
// Alert components
export const Alert = ({ className = '', children, ...props }) => {
    return (_jsx("div", { role: "alert", className: `relative w-full rounded-lg border p-4 ${className}`, ...props, children: children }));
};
export const AlertDescription = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `text-sm [&_p]:leading-relaxed ${className}`, ...props, children: children }));
};
// Dropdown Menu components (simplified)
export const DropdownMenu = ({ children, ...props }) => {
    return _jsx("div", { className: "relative inline-block text-left", ...props, children: children });
};
export const DropdownMenuTrigger = ({ children, asChild, ...props }) => {
    if (asChild && isValidElement(children)) {
        return cloneElement(children, props);
    }
    return _jsx("button", { ...props, children: children });
};
export const DropdownMenuContent = ({ className = '', align = 'center', children, ...props }) => {
    return (_jsx("div", { className: `z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${className}`, ...props, children: children }));
};
export const DropdownMenuItem = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${className}`, ...props, children: children }));
};
export const SelectTrigger = ({ className = '', children, ...props }) => {
    return (_jsx("button", { className: `flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`, ...props, children: children }));
};
export const SelectValue = ({ placeholder }) => {
    return _jsx("span", { children: placeholder || 'Select...' });
};
export const SelectContent = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ${className}`, ...props, children: children }));
};
export const SelectItem = ({ className = '', children, value, ...props }) => {
    return (_jsx("div", { className: `relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${className}`, "data-value": value, ...props, children: children }));
};
export const ToggleGroup = ({ className = '', type = 'single', children, ...props }) => {
    return (_jsx("div", { className: `inline-flex rounded-md shadow-sm ${className}`, role: "group", ...props, children: children }));
};
export const ToggleGroupItem = ({ className = '', value, children, ...props }) => {
    return (_jsx("button", { type: "button", className: `inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 ${className}`, "data-value": value, ...props, children: children }));
};
export const Dialog = ({ open = false, children, ...props }) => {
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50", ...props, children: [_jsx("div", { className: "fixed inset-0 bg-black/50" }), children] }));
};
export const DialogContent = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]", children: _jsx("div", { className: `max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-lg ${className}`, ...props, children: children }) }));
};
export const DialogHeader = ({ className = '', children, ...props }) => {
    return (_jsx("div", { className: `flex flex-col space-y-1.5 text-center sm:text-left ${className}`, ...props, children: children }));
};
export const DialogTitle = ({ className = '', children, ...props }) => {
    return (_jsx("h2", { className: `text-lg font-semibold leading-none tracking-tight ${className}`, ...props, children: children }));
};
// Add Dialog Trigger
export const DialogTrigger = ({ children, asChild, ...props }) => {
    if (asChild && isValidElement(children)) {
        return cloneElement(children, props);
    }
    return _jsx("button", { ...props, children: children });
};
