/**
 * Groupbuy Status Badge Component
 * Phase 3: UI Integration
 */

import { cn } from '@o4o/ui';
import type { CampaignStatus, CampaignProductStatus, GroupbuyOrderStatus } from '@/lib/api/groupbuy';

interface StatusBadgeProps {
  status: CampaignStatus | CampaignProductStatus | GroupbuyOrderStatus;
  type?: 'campaign' | 'product' | 'order';
  className?: string;
}

const campaignStatusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  draft: { label: '준비중', className: 'bg-gray-100 text-gray-700' },
  active: { label: '진행중', className: 'bg-blue-100 text-blue-700' },
  closed: { label: '마감', className: 'bg-orange-100 text-orange-700' },
  completed: { label: '완료', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소됨', className: 'bg-red-100 text-red-700' }
};

const productStatusConfig: Record<CampaignProductStatus, { label: string; className: string }> = {
  active: { label: '참여가능', className: 'bg-blue-100 text-blue-700' },
  threshold_met: { label: '목표달성', className: 'bg-green-100 text-green-700' },
  closed: { label: '마감', className: 'bg-gray-100 text-gray-700' }
};

const orderStatusConfig: Record<GroupbuyOrderStatus, { label: string; className: string }> = {
  pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '확정', className: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소됨', className: 'bg-red-100 text-red-700' }
};

export function GroupbuyStatusBadge({ status, type = 'campaign', className }: StatusBadgeProps) {
  let config: { label: string; className: string };

  switch (type) {
    case 'product':
      config = productStatusConfig[status as CampaignProductStatus] ||
        { label: status, className: 'bg-gray-100 text-gray-700' };
      break;
    case 'order':
      config = orderStatusConfig[status as GroupbuyOrderStatus] ||
        { label: status, className: 'bg-gray-100 text-gray-700' };
      break;
    default:
      config = campaignStatusConfig[status as CampaignStatus] ||
        { label: status, className: 'bg-gray-100 text-gray-700' };
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
