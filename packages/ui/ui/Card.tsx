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

// Card 하위 컴포넌트들
interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={twMerge('mb-4 pb-2 border-b border-gray-200', className)}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => {
  return (
    <h3 className={twMerge('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h3>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return (
    <div className={twMerge('', className)}>
      {children}
    </div>
  );
};

export { Card };
export default Card; 