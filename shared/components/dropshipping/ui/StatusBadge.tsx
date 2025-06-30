import React from 'react';
import { Circle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

// 상태별 색상 매핑
const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  
  // 긍정적 상태 (녹색)
  if (['판매중', '활성', '완료', '성공', '승인', '정상', '배송완료', '결제완료'].some(s => statusLower.includes(s.toLowerCase()))) {
    return 'green';
  }
  
  // 경고 상태 (노란색)
  if (['대기', '보류', '검토중', '승인대기', '배송준비중', '처리중'].some(s => statusLower.includes(s.toLowerCase()))) {
    return 'yellow';
  }
  
  // 위험 상태 (빨간색)
  if (['품절', '중단', '실패', '거부', '취소', '오류', '만료'].some(s => statusLower.includes(s.toLowerCase()))) {
    return 'red';
  }
  
  // 정보 상태 (파란색)
  if (['신규', '예약', '임시저장', '초안'].some(s => statusLower.includes(s.toLowerCase()))) {
    return 'blue';
  }
  
  // 중성 상태 (보라색)
  if (['파트너', '프리미엄', '특별'].some(s => statusLower.includes(s.toLowerCase()))) {
    return 'purple';
  }
  
  // 기본값 (회색)
  return 'gray';
};

const colorClasses = {
  green: {
    default: 'bg-green-500 text-white',
    outline: 'border-green-500 text-green-700 bg-transparent',
    subtle: 'bg-green-50 text-green-700 border-green-200'
  },
  yellow: {
    default: 'bg-yellow-500 text-white',
    outline: 'border-yellow-500 text-yellow-700 bg-transparent',
    subtle: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  red: {
    default: 'bg-red-500 text-white',
    outline: 'border-red-500 text-red-700 bg-transparent',
    subtle: 'bg-red-50 text-red-700 border-red-200'
  },
  blue: {
    default: 'bg-blue-500 text-white',
    outline: 'border-blue-500 text-blue-700 bg-transparent',
    subtle: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  purple: {
    default: 'bg-purple-500 text-white',
    outline: 'border-purple-500 text-purple-700 bg-transparent',
    subtle: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  gray: {
    default: 'bg-gray-500 text-white',
    outline: 'border-gray-500 text-gray-700 bg-transparent',
    subtle: 'bg-gray-50 text-gray-700 border-gray-200'
  }
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'subtle',
  size = 'sm',
  showIcon = true
}) => {
  const color = getStatusColor(status);
  const colorClass = colorClasses[color][variant];
  const sizeClass = sizeClasses[size];
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-full border
      ${colorClass}
      ${sizeClass}
      ${variant === 'outline' ? 'border-2' : variant === 'subtle' ? 'border' : 'border-transparent'}
    `}>
      {showIcon && (
        <Circle className={`w-2 h-2 fill-current ${size === 'lg' ? 'w-2.5 h-2.5' : ''}`} />
      )}
      <span>{status}</span>
    </span>
  );
};