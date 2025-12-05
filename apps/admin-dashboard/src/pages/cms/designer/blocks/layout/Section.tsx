/**
 * Section Block - Full-width container with background
 */

import React from 'react';

export interface SectionProps {
  bgColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  maxWidth?: 'full' | 'screen-xl' | 'screen-lg' | '7xl' | '6xl' | '5xl';
  children?: React.ReactNode;
  className?: string;
}

export default function Section({
  bgColor = 'transparent',
  padding = 'lg',
  maxWidth = 'screen-xl',
  children,
  className = '',
}: SectionProps) {
  const paddingClasses = {
    none: 'py-0',
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
    xl: 'py-24',
  };

  const maxWidthClasses = {
    full: 'max-w-full',
    'screen-xl': 'max-w-screen-xl',
    'screen-lg': 'max-w-screen-lg',
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <section
      className={`w-full ${paddingClasses[padding]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8`}>
        {children}
      </div>
    </section>
  );
}
