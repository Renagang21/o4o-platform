/**
 * Dots Pagination Component
 * M2: Dot indicators with accessibility
 */

import React from 'react';
import { clsx } from 'clsx';

export interface DotsProps {
  total: number;
  active: number;
  onJump: (index: number) => void;
}

/**
 * Dot pagination indicators
 */
export const Dots: React.FC<DotsProps> = ({ total, active, onJump }) => {
  return (
    <div className="slide-app__pagination-dots flex justify-center gap-2" role="tablist">
      {Array.from({ length: total }, (_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          aria-selected={index === active}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === active ? 'true' : 'false'}
          className={clsx(
            'h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500',
            index === active ? 'bg-blue-600 w-8' : 'bg-gray-300 w-2'
          )}
          onClick={() => onJump(index)}
        />
      ))}
    </div>
  );
};
