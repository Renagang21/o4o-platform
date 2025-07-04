import React from 'react';
import { twMerge } from 'tailwind-merge';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className,
  onClick,
  hoverable = false,
}) => {
  const baseStyles = 'rounded-lg p-4 transition-all duration-200';
  
  const variantStyles = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-md',
    outlined: 'border-2 border-primary',
    filled: 'bg-primary-light'
  };

  const hoverStyles = hoverable ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : '';

  const cardStyles = twMerge(
    baseStyles,
    variantStyles[variant],
    hoverStyles,
    className
  );

  return (
    <div className={cardStyles} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card; 