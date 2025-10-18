/**
 * PostTitle Component
 * Input field for editing the post title in the editor header
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PostTitleProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const PostTitle: React.FC<PostTitleProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Add title"
      className={cn(
        'w-full px-2 py-1 text-sm font-medium text-gray-900',
        'bg-transparent border border-transparent rounded',
        'hover:border-gray-300 focus:border-blue-500 focus:outline-none',
        'transition-colors',
        className
      )}
    />
  );
};
