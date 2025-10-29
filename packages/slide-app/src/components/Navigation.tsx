/**
 * Navigation Component
 * M2: Previous/Next buttons with accessibility
 */

import React from 'react';
import { clsx } from 'clsx';

export interface NavigationProps {
  onPrev: () => void;
  onNext: () => void;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
}

/**
 * Navigation buttons for carousel
 */
export const Navigation: React.FC<NavigationProps> = ({
  onPrev,
  onNext,
  prevLabel = 'Previous slide',
  nextLabel = 'Next slide',
  className,
}) => {
  return (
    <div
      className={clsx(
        'slide-app__navigation',
        'absolute inset-0 flex items-center justify-between px-4 pointer-events-none',
        className
      )}
    >
      <PrevButton onClick={onPrev} label={prevLabel} />
      <NextButton onClick={onNext} label={nextLabel} />
    </div>
  );
};

/**
 * Previous button component
 */
export const PrevButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => {
  return (
    <button
      type="button"
      className="slide-app__nav-button slide-app__nav-button--prev pointer-events-auto bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={onClick}
      aria-label={label}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
};

/**
 * Next button component
 */
export const NextButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => {
  return (
    <button
      type="button"
      className="slide-app__nav-button slide-app__nav-button--next pointer-events-auto bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={onClick}
      aria-label={label}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};
