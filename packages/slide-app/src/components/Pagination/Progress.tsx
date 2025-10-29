/**
 * Progress Pagination Component
 * M2: Progress bar indicator
 */

import React from 'react';

export interface ProgressProps {
  total: number;
  active: number;
  onJump: (index: number) => void;
}

/**
 * Progress bar pagination
 */
export const Progress: React.FC<ProgressProps> = ({ total, active }) => {
  const progressPercentage = ((active + 1) / total) * 100;

  return (
    <div
      className="slide-app__pagination-progress w-full max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={active + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Slide progress: ${active + 1} of ${total}`}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300"
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
  );
};
