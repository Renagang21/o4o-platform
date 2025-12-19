/**
 * GroupbuySummarySection
 *
 * Phase 3: [2] 공동구매 요약
 *
 * 표시:
 * - 진행 중 공동구매 수
 * - 참여 중 공동구매 수
 * - 마감 임박 캠페인
 *
 * 상태:
 * - 데이터 없음 → "진행 중인 공동구매 없음"
 * - 실패 → 섹션 비활성
 */

import { Link } from 'react-router-dom';
import { ShoppingCart, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@o4o/ui';
import type { GroupbuySummary } from '@/lib/api/member';

interface GroupbuySummarySectionProps {
  data: GroupbuySummary | null;
  isLoading?: boolean;
}

export function GroupbuySummarySection({ data, isLoading }: GroupbuySummarySectionProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            공동구매
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error/disabled state
  if (data === null) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-400">
            <ShoppingCart className="h-5 w-5" />
            공동구매
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            공동구매 정보를 불러올 수 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.activeCampaignCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            공동구매
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">진행 중인 공동구매 없음</p>
        </CardContent>
      </Card>
    );
  }

  // Normal state
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-green-600" />
          공동구매
        </CardTitle>
        <Link to="/groupbuy">
          <Button variant="ghost" size="sm" className="text-xs">
            전체보기 <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {data.activeCampaignCount}
            </p>
            <p className="text-xs text-gray-600">진행 중</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {data.participatingCampaignCount}
            </p>
            <p className="text-xs text-gray-600">참여 중</p>
          </div>
        </div>

        {data.mostUrgentCampaign && (
          <Link
            to={`/groupbuy/${data.mostUrgentCampaign.campaignId}`}
            className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {data.mostUrgentCampaign.title}
              </p>
              <p className="text-xs text-orange-600">
                마감 {data.mostUrgentCampaign.remainingDays}일 남음
              </p>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
