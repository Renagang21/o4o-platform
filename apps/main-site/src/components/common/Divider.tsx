import React from 'react';
import { twMerge } from 'tailwind-merge';

export type DividerVariant = 'solid' | 'dashed' | 'dotted';
export type DividerOrientation = 'horizontal' | 'vertical';

interface DividerProps {
  variant?: DividerVariant;
  orientation?: DividerOrientation;
  className?: string;
  text?: ReactNode;
  color?: string;
}

const Divider: FC<DividerProps> = ({
  variant = 'solid',
  orientation = 'horizontal',
  className,
  text,
  color = 'gray-200',
}) => {
  const variantStyles = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  };

  const orientationStyles = {
    horizontal: 'w-full border-t',
    vertical: 'h-full border-l',
  };

  if (text && orientation === 'horizontal') {
    return (
      <div className={twMerge('flex items-center', className)}>
        <div
          className={twMerge(
            'flex-grow',
            variantStyles[variant],
            `border-${color}`
          )}
        />
        <span className="px-4 text-sm text-gray-500">{text}</span>
        <div
          className={twMerge(
            'flex-grow',
            variantStyles[variant],
            `border-${color}`
          )}
        />
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        orientationStyles[orientation],
        variantStyles[variant],
        `border-${color}`,
        className
      )}
      role="separator"
      aria-orientation={orientation}
    />
  );
};

export default Divider; 