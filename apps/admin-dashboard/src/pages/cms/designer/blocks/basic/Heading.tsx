/**
 * Heading Block - H1-H6 headings
 */

import React from 'react';

export interface HeadingProps {
  text: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  align?: 'left' | 'center' | 'right';
  color?: string;
  className?: string;
}

export default function Heading({
  text = 'Heading Text',
  level = 2,
  align = 'left',
  color = '#000000',
  className = '',
}: HeadingProps) {
  const Tag = `h${level}` as React.ElementType;

  const sizeClasses = {
    1: 'text-4xl font-bold',
    2: 'text-3xl font-bold',
    3: 'text-2xl font-semibold',
    4: 'text-xl font-semibold',
    5: 'text-lg font-medium',
    6: 'text-base font-medium',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <Tag
      className={`${sizeClasses[level]} ${alignClasses[align]} ${className}`}
      style={{ color }}
    >
      {text}
    </Tag>
  );
}
