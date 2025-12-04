/**
 * Text Block - Simple paragraph text
 */

import React from 'react';

export interface TextProps {
  text: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export default function Text({
  text = 'Enter your text here',
  align = 'left',
  color = '#000000',
  size = 'base',
  className = '',
}: TextProps) {
  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  return (
    <p
      className={`${sizeClasses[size]} ${alignClasses[align]} ${className}`}
      style={{ color }}
    >
      {text}
    </p>
  );
}
