/**
 * Text Block Component
 * Renders text content with customizable styling
 */

import React from 'react';

export interface TextBlockProps {
  text?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
  context?: any;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

const weightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

export const TextBlock: React.FC<TextBlockProps> = ({
  text = '',
  size = 'base',
  align = 'left',
  color,
  weight = 'normal',
  className = '',
}) => {
  const sizeClass = sizeClasses[size] || sizeClasses.base;
  const alignClass = alignClasses[align] || alignClasses.left;
  const weightClass = weightClasses[weight] || weightClasses.normal;

  const style: React.CSSProperties = {};
  if (color) {
    style.color = color;
  }

  return (
    <p
      className={`${sizeClass} ${alignClass} ${weightClass} ${className}`.trim()}
      style={style}
    >
      {text}
    </p>
  );
};

export default TextBlock;
