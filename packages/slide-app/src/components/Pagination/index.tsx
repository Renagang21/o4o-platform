/**
 * Pagination Components Index
 * M2: Unified interface for all pagination types
 */

import React from 'react';
import { Dots, type DotsProps } from './Dots';
import { Numbers, type NumbersProps } from './Numbers';
import { Progress, type ProgressProps } from './Progress';
import type { PaginationType } from '../../types/slide.types';

export { Dots, Numbers, Progress };
export type { DotsProps, NumbersProps, ProgressProps };

export interface PaginationProps {
  type: PaginationType;
  total: number;
  active: number;
  onJump: (index: number) => void;
  className?: string;
}

/**
 * Unified Pagination component that renders the appropriate type
 */
export const Pagination: React.FC<PaginationProps> = ({ type, total, active, onJump, className }) => {
  if (type === 'none' || total <= 1) {
    return null;
  }

  return (
    <div className={`slide-app__pagination mt-4 flex justify-center ${className || ''}`}>
      {type === 'dots' && <Dots total={total} active={active} onJump={onJump} />}
      {type === 'numbers' && <Numbers total={total} active={active} onJump={onJump} />}
      {type === 'progress' && <Progress total={total} active={active} onJump={onJump} />}
    </div>
  );
};
