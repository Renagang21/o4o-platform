/**
 * Design System - Table Component
 *
 * Data table components with consistent styling
 */

import { forwardRef } from 'react';
import { cn } from '../utils/classnames';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered';
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  (
    {
      children,
      variant = 'default',
      className,
      ...rest
    },
    ref
  ) => {
    const baseStyles = 'w-full text-sm text-left';

    const variantStyles = {
      default: '',
      striped: '[&_tbody_tr:nth-child(even)]:bg-neutral-50',
      bordered: 'border border-neutral-200',
    };

    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={cn(baseStyles, variantStyles[variant], className)}
          {...rest}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ children, className, ...rest }, ref) => {
  return (
    <thead
      ref={ref}
      className={cn('bg-neutral-50 border-b border-neutral-200', className)}
      {...rest}
    >
      {children}
    </thead>
  );
});

TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ children, className, ...rest }, ref) => {
  return (
    <tbody ref={ref} className={className} {...rest}>
      {children}
    </tbody>
  );
});

TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ children, className, ...rest }, ref) => {
  return (
    <tr
      ref={ref}
      className={cn('border-b border-neutral-200 hover:bg-neutral-50', className)}
      {...rest}
    >
      {children}
    </tr>
  );
});

TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ children, className, ...rest }, ref) => {
  return (
    <th
      ref={ref}
      className={cn('px-4 py-3 text-left font-semibold text-neutral-900', className)}
      {...rest}
    >
      {children}
    </th>
  );
});

TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ children, className, ...rest }, ref) => {
  return (
    <td
      ref={ref}
      className={cn('px-4 py-3 text-neutral-700', className)}
      {...rest}
    >
      {children}
    </td>
  );
});

TableCell.displayName = 'TableCell';
