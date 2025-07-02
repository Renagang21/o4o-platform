import React, { useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

interface DropdownMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

interface DropdownMenuContentProps {
  align?: 'start' | 'center' | 'end';
  className?: string;
  children: React.ReactNode;
}

interface DropdownMenuItemProps {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

interface DropdownMenuLabelProps {
  className?: string;
  children: React.ReactNode;
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  open, 
  onOpenChange, 
  children 
}) => {
  const [isOpen, setIsOpen] = useState(open || false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onOpenChange]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: handleToggle,
              'aria-expanded': isOpen,
            });
          }
          if (child.type === DropdownMenuContent) {
            return isOpen ? child : null;
          }
        }
        return child;
      })}
    </div>
  );
};

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ 
  asChild, 
  children,
  ...props 
}) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }

  return <button {...props}>{children}</button>;
};

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ 
  align = 'start', 
  className, 
  children 
}) => {
  const alignClass = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  };

  return (
    <div
      className={twMerge(
        'absolute top-full mt-1 min-w-[8rem] bg-white border border-gray-200 rounded-md shadow-lg z-50',
        alignClass[align],
        className
      )}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  className, 
  onClick, 
  children 
}) => {
  return (
    <div
      className={twMerge(
        'px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 first:rounded-t-md last:rounded-b-md',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const DropdownMenuLabel: React.FC<DropdownMenuLabelProps> = ({ 
  className, 
  children 
}) => {
  return (
    <div
      className={twMerge(
        'px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100',
        className
      )}
    >
      {children}
    </div>
  );
};

export const DropdownMenuSeparator: React.FC<DropdownMenuSeparatorProps> = ({ 
  className 
}) => {
  return (
    <div
      className={twMerge(
        'my-1 border-t border-gray-100',
        className
      )}
    />
  );
};