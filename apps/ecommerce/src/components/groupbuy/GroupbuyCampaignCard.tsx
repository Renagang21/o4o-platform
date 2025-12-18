/**
 * Groupbuy Campaign Card Component
 * Phase 3: UI Integration
 *
 * Displays campaign summary for member list view
 * Note: No price display per Work Order rules
 */

import { Link } from 'react-router-dom';
import { Card } from '@o4o/ui';
import { Calendar, Users, Package } from 'lucide-react';
import type { GroupbuyCampaign } from '@/lib/api/groupbuy';
import { GroupbuyStatusBadge } from './GroupbuyStatusBadge';
import { ProgressBar } from './ProgressBar';
import { useRemainingTime } from '@/hooks/useGroupbuy';

interface GroupbuyCampaignCardProps {
  campaign: GroupbuyCampaign;
}

export function GroupbuyCampaignCard({ campaign }: GroupbuyCampaignCardProps) {
  const { label: remainingLabel, isExpired } = useRemainingTime(campaign.endDate);

  // Calculate overall progress (using first product's threshold if available)
  const totalProgress = campaign.products && campaign.products.length > 0
    ? campaign.products.reduce((acc, p) => ({
        confirmed: acc.confirmed + p.confirmedQuantity,
        target: acc.target + p.minTotalQuantity
      }), { confirmed: 0, target: 0 })
    : { confirmed: campaign.totalConfirmedQuantity, target: 0 };

  return (
    <Link to={`/groupbuy/${campaign.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-1">{campaign.title}</h3>
            {campaign.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {campaign.description}
              </p>
            )}
          </div>
          <GroupbuyStatusBadge status={campaign.status} />
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span className={isExpired ? 'text-red-500' : ''}>
              {remainingLabel}
            </span>
          </div>
          {campaign.products && (
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              <span>{campaign.products.length}개 상품</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {totalProgress.target > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span>전체 달성률</span>
            </div>
            <ProgressBar
              current={totalProgress.confirmed}
              target={totalProgress.target}
              size="sm"
            />
          </div>
        )}

        {/* Period */}
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          {new Date(campaign.startDate).toLocaleDateString('ko-KR')} ~{' '}
          {new Date(campaign.endDate).toLocaleDateString('ko-KR')}
        </div>
      </Card>
    </Link>
  );
}
