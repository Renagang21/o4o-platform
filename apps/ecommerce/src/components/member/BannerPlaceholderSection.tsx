/**
 * BannerPlaceholderSection
 *
 * Phase 3: [5] 배너/안내 (Placeholder)
 *
 * 표시:
 * - 정적 메시지 또는 빈 상태
 * - "추후 제공 예정" 문구
 *
 * 주의:
 * - 광고/디지털사이니지 연계 ❌
 */

import { Info, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@o4o/ui';
import type { BannerSummary } from '@/lib/api/member';

interface BannerPlaceholderSectionProps {
  data: BannerSummary | null;
  isLoading?: boolean;
}

export function BannerPlaceholderSection({ data, isLoading }: BannerPlaceholderSectionProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            안내
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
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
            <Info className="h-5 w-5" />
            안내
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            정보를 불러올 수 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Placeholder state (Phase 2에서 정적 메시지 반환)
  return (
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-600">
          <Info className="h-5 w-5" />
          안내
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.banners.length > 0 ? (
          <ul className="space-y-2">
            {data.banners.map((banner) => (
              <li key={banner.bannerId} className="text-sm text-gray-600">
                {banner.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            {data.message || '추후 제공 예정입니다.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
