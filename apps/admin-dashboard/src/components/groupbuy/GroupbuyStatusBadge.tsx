import { FC } from 'react';
import { Tag } from 'antd';

export type GroupbuyStatus =
  | 'draft'           // 초안
  | 'upcoming'        // 시작 예정
  | 'active'          // 진행 중
  | 'success'         // 성공 (목표 달성)
  | 'failed'          // 실패 (미달성)
  | 'closed'          // 종료
  | 'cancelled';      // 취소

interface GroupbuyStatusBadgeProps {
  status: GroupbuyStatus;
  size?: 'small' | 'default' | 'large';
}

export const GroupbuyStatusBadge: FC<GroupbuyStatusBadgeProps> = ({ status, size = 'default' }) => {
  const getStatusConfig = (status: GroupbuyStatus) => {
    switch (status) {
      case 'draft':
        return { label: '초안', color: 'default' };
      case 'upcoming':
        return { label: '시작 예정', color: 'blue' };
      case 'active':
        return { label: '진행 중', color: 'green' };
      case 'success':
        return { label: '성공', color: 'cyan' };
      case 'failed':
        return { label: '실패', color: 'red' };
      case 'closed':
        return { label: '종료', color: 'default' };
      case 'cancelled':
        return { label: '취소', color: 'volcano' };
      default:
        return { label: status, color: 'default' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Tag color={config.color} className={size === 'small' ? 'text-xs' : ''}>
      {config.label}
    </Tag>
  );
};

export default GroupbuyStatusBadge;
