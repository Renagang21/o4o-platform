import { FC } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Simple avatar component with image or initials
 */
export const Avatar: FC<AvatarProps> = ({ 
  name = '', 
  src, 
  size = 'md',
  className 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={cn(
      'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-200',
      sizeClasses[size],
      className
    )}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-medium text-gray-600">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
};