import React, { FC } from 'react';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'unknown' | 'active' | 'development' | 'maintenance' | 'passing' | 'failing' | 'not-tested';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'passing':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          dot: 'bg-green-500',
          text: status === 'online' ? '온라인' : status === 'active' ? '활성' : '통과'
        };
      case 'offline':
      case 'failing':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          dot: 'bg-red-500',
          text: status === 'offline' ? '오프라인' : '실패'
        };
      case 'warning':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dot: 'bg-yellow-500',
          text: '경고'
        };
      case 'development':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          text: '개발중'
        };
      case 'maintenance':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          dot: 'bg-orange-500',
          text: '점검중'
        };
      case 'not-tested':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          dot: 'bg-gray-500',
          text: '미테스트'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          dot: 'bg-gray-500',
          text: '알수없음'
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          badge: 'px-2 py-1 text-xs',
          dot: 'w-1.5 h-1.5'
        };
      case 'lg':
        return {
          badge: 'px-3 py-2 text-sm',
          dot: 'w-3 h-3'
        };
      default:
        return {
          badge: 'px-2.5 py-1.5 text-xs',
          dot: 'w-2 h-2'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.color} ${sizeClasses.badge}`}>
      <span className={`rounded-full ${config.dot} ${sizeClasses.dot}`}></span>
      {config.text}
    </span>
  );
};