import React from 'react';
import { twMerge } from 'tailwind-merge';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';
export type SkeletonSize = 'sm' | 'md' | 'lg';

interface SkeletonProps {
  variant?: SkeletonVariant;
  size?: SkeletonSize;
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: FC<SkeletonProps> = ({
  variant = 'text',
  size = 'md',
  width,
  height,
  className,
  animation = 'pulse',
}) => {
  const sizeStyles = {
    sm: {
      text: 'h-3',
      circular: 'w-8 h-8',
      rectangular: 'h-16',
    },
    md: {
      text: 'h-4',
      circular: 'w-12 h-12',
      rectangular: 'h-24',
    },
    lg: {
      text: 'h-6',
      circular: 'w-16 h-16',
      rectangular: 'h-32',
    },
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: '',
  };

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const baseStyles = 'bg-gray-200';

  return (
    <div
      className={twMerge(
        baseStyles,
        sizeStyles[size][variant],
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: width,
        height: height,
      }}
      role="status"
      aria-label="로딩 중..."
    />
  );
};

export default Skeleton; 