import { useState, FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type MenuVariant = 'default' | 'bordered' | 'filled';
export type MenuSize = 'sm' | 'md' | 'lg';

interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
  children?: MenuItem[];
}

interface MenuProps {
  items: MenuItem[];
  variant?: MenuVariant;
  size?: MenuSize;
  className?: string;
  mode?: 'horizontal' | 'vertical';
  defaultSelectedKeys?: string[];
  selectedKeys?: string[];
  onSelect?: (key: string) => void;
}

const Menu: FC<MenuProps> = ({
  items,
  variant = 'default',
  size = 'md',
  className,
  mode = 'horizontal',
  defaultSelectedKeys = [],
  selectedKeys,
  onSelect,
}) => {
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>(defaultSelectedKeys);
  const currentSelectedKeys = selectedKeys || internalSelectedKeys;

  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const variantStyles = {
    default: 'bg-white',
    bordered: 'bg-white border border-gray-200 rounded-lg',
    filled: 'bg-gray-50 rounded-lg',
  };

  const modeStyles = {
    horizontal: 'flex space-x-1',
    vertical: 'flex flex-col space-y-1',
  };

  const itemSizeStyles = {
    sm: 'px-2 py-1',
    md: 'px-3 py-2',
    lg: 'px-4 py-3',
  };

  const handleSelect = (key: string) => {
    if (selectedKeys === undefined) {
      setInternalSelectedKeys([key]);
    }
    onSelect?.(key);
  };

  const renderMenuItem = (item: MenuItem) => {
    const isSelected = currentSelectedKeys.includes(item.key);
    const isDisabled = item.disabled;

    return (
      <div
        key={item.key}
        className={twMerge(
          'flex items-center',
          sizeStyles[size],
          itemSizeStyles[size],
          variantStyles[variant],
          mode === 'horizontal' ? 'rounded-md' : 'rounded-md',
          isSelected && 'bg-primary-50 text-primary-600',
          !isSelected && !isDisabled && 'hover:bg-gray-100',
          isDisabled && 'opacity-50 cursor-not-allowed',
          !isDisabled && 'cursor-pointer',
          item.danger && 'text-red-600',
          className
        )}
        onClick={!isDisabled ? () => handleSelect(item.key) : undefined}
        role="menuitem"
        tabIndex={!isDisabled ? 0 : undefined}
      >
        {item.icon && (
          <span className={twMerge('mr-2', isSelected && 'text-primary-600')}>
            {item.icon}
          </span>
        )}
        <span>{item.label}</span>
      </div>
    );
  };

  return (
    <nav
      className={twMerge(
        'flex',
        modeStyles[mode],
        variantStyles[variant],
        className
      )}
      role="menu"
    >
      {items.map(renderMenuItem)}
    </nav>
  );
};

export default Menu; 