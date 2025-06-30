/**
 * Refresh Button Component
 * 수동 새로고침 버튼 컴포넌트
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ 
  onRefresh, 
  isRefreshing, 
  className = '',
  size = 'md',
  showText = true
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={`
        wp-button-secondary
        ${sizeClasses[size]}
        ${className}
        disabled:opacity-50 
        disabled:cursor-not-allowed
        transition-all 
        duration-200
        hover:shadow-sm
        active:scale-95
      `}
      title={isRefreshing ? '새로고침 중...' : '데이터 새로고침'}
    >
      <RefreshCw 
        className={`
          ${iconSizes[size]} 
          ${showText ? 'mr-2' : ''} 
          ${isRefreshing ? 'animate-spin' : ''}
          transition-transform
          duration-200
        `} 
      />
      {showText && (
        <span>
          {isRefreshing ? '새로고침 중...' : '새로고침'}
        </span>
      )}
    </button>
  );
};

export default RefreshButton;