import { FC } from 'react';

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
        return { label: '초안', color: 'bg-gray-100 text-gray-800' };
      case 'upcoming':
        return { label: '시작 예정', color: 'bg-blue-100 text-blue-800' };
      case 'active':
        return { label: '진행 중', color: 'bg-green-100 text-green-800' };
      case 'success':
        return { label: '성공', color: 'bg-cyan-100 text-cyan-800' };
      case 'failed':
        return { label: '실패', color: 'bg-red-100 text-red-800' };
      case 'closed':
        return { label: '종료', color: 'bg-gray-100 text-gray-800' };
      case 'cancelled':
        return { label: '취소', color: 'bg-orange-100 text-orange-800' };
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
