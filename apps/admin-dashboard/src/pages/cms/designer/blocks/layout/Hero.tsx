/**
 * Hero Block - Hero section with title, subtitle, and CTA
 */

import React from 'react';

export interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  bgColor?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export default function Hero({
  title = 'Welcome to Our Site',
  subtitle = 'Discover amazing features and services',
  ctaText = 'Get Started',
  ctaHref = '#',
  bgColor = '#1a202c',
  textColor = '#ffffff',
  align = 'center',
  className = '',
}: HeroProps) {
  const alignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <div
      className={`py-20 px-6 flex flex-col ${alignClasses[align]} ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 max-w-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xl md:text-2xl mb-8 max-w-2xl opacity-90">
          {subtitle}
        </p>
      )}
      {ctaText && (
        <a
          href={ctaHref}
          className="inline-block px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          {ctaText}
        </a>
      )}
    </div>
  );
}
