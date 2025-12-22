/**
 * Risk Badge Component
 *
 * 위험 수준 표시 뱃지
 */

import React from 'react';
import type { RiskLevel } from '../../backend/dto/index.js';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const riskConfig: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  high: { label: '고위험', color: 'text-red-700', bgColor: 'bg-red-100' },
  medium: { label: '주의', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { label: '경미', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  normal: { label: '정상', color: 'text-green-700', bgColor: 'bg-green-100' },
};

const sizeConfig = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showLabel = true,
}) => {
  const config = riskConfig[level];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bgColor} ${config.color} ${sizeConfig[size]}`}
    >
      {showLabel && config.label}
    </span>
  );
};

export default RiskBadge;
