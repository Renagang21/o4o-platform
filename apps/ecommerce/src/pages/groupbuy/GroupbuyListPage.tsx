/**
 * Groupbuy List Page (Member View)
 * Phase 3: UI Integration
 *
 * Work Order: WO-GROUPBUY-YAKSA-PHASE3-UI-INTEGRATION
 * Displays active campaigns for member's organization
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Select } from '@o4o/ui';
import { ShoppingBag, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useGroupbuyCampaigns } from '@/hooks/useGroupbuy';
import { GroupbuyCampaignCard } from '@/components/groupbuy';
import type { CampaignStatus } from '@/lib/api/groupbuy';

// TODO: Get from auth context
const MOCK_ORGANIZATION_ID = 'org-yaksa-sample';

const statusFilters: { value: CampaignStatus | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'active', label: '진행중' },
  { value: 'closed', label: '마감' },
  { value: 'completed', label: '완료' }
];

export function GroupbuyListPage() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');

  const { data: campaigns, isLoading, error } = useGroupbuyCampaigns(
    MOCK_ORGANIZATION_ID,
    {
      status: statusFilter || undefined,
      includeProducts: true
    }
  );

  // Separate active and other campaigns
  const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];
  const otherCampaigns = campaigns?.filter(c => c.status !== 'active') || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">공동구매</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-3" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-2 bg-gray-200 rounded mt-4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">공동구매</h1>
        <Card className="p-8 text-center">
          <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="font-medium text-lg mb-2">데이터를 불러올 수 없습니다</h3>
          <p className="text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">공동구매</h1>
          <p className="text-muted-foreground mt-1">
            지부/분회에서 진행하는 공동구매에 참여하세요
          </p>
        </div>
        <Link to="/groupbuy/history">
          <Button variant="outline">
            <Clock className="w-4 h-4 mr-2" />
            참여 이력
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(e.target.value as CampaignStatus | '')
          }
          className="w-32"
        >
          {statusFilters.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">
          총 {campaigns?.length || 0}개 캠페인
        </span>
      </div>

      {/* Active Campaigns */}
      {activeCampaigns.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">진행중인 공동구매</h2>
            <span className="text-sm text-muted-foreground">
              ({activeCampaigns.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCampaigns.map(campaign => (
              <GroupbuyCampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      {/* Other Campaigns */}
      {otherCampaigns.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">지난 공동구매</h2>
            <span className="text-sm text-muted-foreground">
              ({otherCampaigns.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherCampaigns.map(campaign => (
              <GroupbuyCampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {(!campaigns || campaigns.length === 0) && (
        <Card className="p-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-lg mb-2">진행중인 공동구매가 없습니다</h3>
          <p className="text-muted-foreground">
            지부/분회에서 새로운 공동구매를 시작하면 여기에 표시됩니다.
          </p>
        </Card>
      )}
    </div>
  );
}
