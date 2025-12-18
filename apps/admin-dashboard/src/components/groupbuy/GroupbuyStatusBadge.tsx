/**
 * Groupbuy Status Badge Component
 * Phase 3: UI Integration
 */

import { FC } from 'react';

/**
 * Campaign status (Phase 2 backend aligned)
 */
export type GroupbuyStatus =
  | 'draft'           // 초안
  | 'active'          // 진행 중
  | 'closed'          // 마감
  | 'completed'       // 완료
  | 'cancelled';      // 취소

interface GroupbuyStatusBadgeProps {
  status: GroupbuyStatus;
  size?: 'small' | 'default' | 'large';
}

export const GroupbuyStatusBadge: FC<GroupbuyStatusBadgeProps> = ({ status, size = 'default' }) => {
  const getStatusConfig = (status: GroupbuyStatus) => {
    switch (status) {
      case 'draft':
        return { label: '초안', color: 'bg-gray-100 text-gray-800' };
      case 'active':
        return { label: '진행 중', color: 'bg-green-100 text-green-800' };
      case 'closed':
        return { label: '마감', color: 'bg-yellow-100 text-yellow-800' };
      case 'completed':
        return { label: '완료', color: 'bg-blue-100 text-blue-800' };
      case 'cancelled':
        return { label: '취소', color: 'bg-red-100 text-red-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);
  const sizeClass = size === 'small' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-block rounded-full font-medium ${config.color} ${sizeClass}`}>
      {config.label}
    </span>
  );
};

export default GroupbuyStatusBadge;
