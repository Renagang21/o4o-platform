import React from 'react';
import { twMerge } from 'tailwind-merge';

export type ListVariant = 'default' | 'bordered' | 'striped';
export type ListSize = 'sm' | 'md' | 'lg';

interface ListItem {
  id: string;
  content: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

interface ListProps {
  items: ListItem[];
  variant?: ListVariant;
  size?: ListSize;
  className?: string;
  emptyText?: string;
}

const List: FC<ListProps> = ({
  items,
  variant = 'default',
  size = 'md',
  className,
  emptyText = '항목이 없습니다',
}) => {
  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const variantStyles = {
    default: 'divide-y divide-gray-200',
    bordered: 'divide-y divide-gray-200 border border-gray-200 rounded-lg',
    striped: 'divide-y divide-gray-200',
  };

  const itemSizeStyles = {
    sm: 'py-2',
    md: 'py-3',
    lg: 'py-4',
  };

  if (items.length === 0) {
    return (
      <div
        className={twMerge(
          'text-center py-8 text-gray-500',
          sizeStyles[size],
          className
        )}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <ul
      className={twMerge(
        'divide-y divide-gray-200',
        variantStyles[variant],
        className
      )}
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={twMerge(
            'flex items-center justify-between',
            itemSizeStyles[size],
            item.disabled && 'opacity-50 cursor-not-allowed',
            !item.disabled && item.onClick && 'cursor-pointer hover:bg-gray-50'
          )}
          onClick={!item.disabled && item.onClick ? item.onClick : undefined}
          role={item.onClick ? 'button' : undefined}
          tabIndex={item.onClick ? 0 : undefined}
        >
          <div className="flex items-center min-w-0">
            {item.icon && (
              <span className="flex-shrink-0 mr-3 text-gray-400">
                {item.icon}
              </span>
            )}
            <div className={twMerge('min-w-0 flex-1', sizeStyles[size])}>
              {item.content}
            </div>
          </div>
          {item.action && (
            <div className="flex-shrink-0 ml-4">{item.action}</div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default List; 