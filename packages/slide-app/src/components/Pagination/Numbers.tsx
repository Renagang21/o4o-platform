/**
 * Numbers Pagination Component
 * M2: Numeric slide counter
 */

import React from 'react';

export interface NumbersProps {
  total: number;
  active: number;
  onJump: (index: number) => void;
}

/**
 * Numeric pagination (e.g., "3 / 10")
 */
export const Numbers: React.FC<NumbersProps> = ({ total, active }) => {
  return (
    <div className="slide-app__pagination-numbers text-sm text-gray-600 font-medium">
      <span aria-current="true">{active + 1}</span>
      <span className="mx-1">/</span>
      <span>{total}</span>
    </div>
  );
};
