import React from 'react';
import { twMerge } from 'tailwind-merge';

interface ScrollAreaProps {
  className?: string;
  children: React.ReactNode;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ 
  className, 
  children 
}) => {
  return (
    <div
      className={twMerge(
        'overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
        className
      )}
    >
      {children}
    </div>
  );
};