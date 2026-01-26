import { FC, ReactNode } from 'react';
import { clsx } from 'clsx';

export interface WordPressFilterProps {
  children: ReactNode;
  className?: string;
}

/**
 * WordPress-style Filter Component
 * Standardized filter container to prevent duplicate rendering issues
 * and ensure consistent styling across all list pages
 */
export const WordPressFilter: FC<WordPressFilterProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={clsx('o4o-filter', className)}>
      <div className="filter-items">
        {children}
      </div>
    </div>
  );
};

export default WordPressFilter;