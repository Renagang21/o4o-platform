import { FC, ReactNode } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
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
export declare const Button: FC<ButtonProps>;
export declare const Input: FC<InputProps>;
export declare const Card: FC<CardProps>;
export declare const CardHeader: FC<CardProps>;
export declare const CardContent: FC<CardProps>;
export declare const CardTitle: FC<HTMLAttributes<HTMLHeadingElement>>;
export declare const CardDescription: FC<HTMLAttributes<HTMLParagraphElement>>;
export declare const CardFooter: FC<CardProps>;
export declare const Label: FC<LabelProps>;
export declare const Badge: FC<BadgeProps>;
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    onCheckedChange?: (checked: boolean) => void;
}
export declare const Checkbox: FC<CheckboxProps>;
export declare const Textarea: FC<TextareaHTMLAttributes<HTMLTextAreaElement>>;
export declare const Select: FC<SelectHTMLAttributes<HTMLSelectElement>>;
export interface RadioGroupProps extends HTMLAttributes<HTMLDivElement> {
    value?: string;
    onValueChange?: (value: string) => void;
    name?: string;
}
export declare const RadioGroup: FC<RadioGroupProps>;
export declare const RadioGroupItem: FC<InputHTMLAttributes<HTMLInputElement> & {
    id: string;
}>;
export declare const Tabs: FC<HTMLAttributes<HTMLDivElement>>;
export declare const TabsList: FC<HTMLAttributes<HTMLDivElement>>;
export declare const TabsTrigger: FC<ButtonHTMLAttributes<HTMLButtonElement>>;
export declare const TabsContent: FC<HTMLAttributes<HTMLDivElement> & {
    value?: string;
}>;
export declare const Slider: FC<InputHTMLAttributes<HTMLInputElement>>;
export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
    value?: number;
    max?: number;
}
export declare const Progress: FC<ProgressProps>;
export declare const Skeleton: FC<HTMLAttributes<HTMLDivElement>>;
export declare const Alert: FC<HTMLAttributes<HTMLDivElement>>;
export declare const AlertDescription: FC<HTMLAttributes<HTMLDivElement>>;
export declare const DropdownMenu: FC<HTMLAttributes<HTMLDivElement>>;
export declare const DropdownMenuTrigger: FC<HTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
}>;
export declare const DropdownMenuContent: FC<HTMLAttributes<HTMLDivElement> & {
    align?: 'start' | 'center' | 'end';
}>;
export declare const DropdownMenuItem: FC<HTMLAttributes<HTMLDivElement>>;
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    onValueChange?: (value: string) => void;
}
export declare const SelectTrigger: FC<HTMLAttributes<HTMLButtonElement>>;
export declare const SelectValue: FC<{
    placeholder?: string;
}>;
export declare const SelectContent: FC<HTMLAttributes<HTMLDivElement>>;
export declare const SelectItem: FC<HTMLAttributes<HTMLDivElement> & {
    value: string;
}>;
export interface ToggleGroupProps extends HTMLAttributes<HTMLDivElement> {
    type?: 'single' | 'multiple';
    value?: string | string[];
    onValueChange?: (value: string | string[]) => void;
}
export declare const ToggleGroup: FC<ToggleGroupProps>;
export declare const ToggleGroupItem: FC<ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
}>;
export interface DialogProps extends HTMLAttributes<HTMLDivElement> {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}
export declare const Dialog: FC<DialogProps>;
export declare const DialogContent: FC<HTMLAttributes<HTMLDivElement>>;
export declare const DialogHeader: FC<HTMLAttributes<HTMLDivElement>>;
export declare const DialogTitle: FC<HTMLAttributes<HTMLHeadingElement>>;
export declare const DialogTrigger: FC<HTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
}>;
//# sourceMappingURL=components.d.ts.map