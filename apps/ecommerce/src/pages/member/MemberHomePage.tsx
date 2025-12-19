/**
 * MemberHomePage
 *
 * Phase 3: Member Home UI Integration
 *
 * 약사가 로그인 즉시 "지금 중요한 것"을 직관적으로 확인하는 화면
 *
 * UX Priority 순서 (변경 금지):
 * 1. Organization Notice (지부/분회 공지)
 * 2. Groupbuy Summary (공동구매 요약)
 * 3. Education Summary (교육/LMS 현황)
 * 4. Forum Summary (커뮤니티 최신 글)
 * 5. Banner Placeholder (안내)
 *
 * 원칙:
 * - Phase 2 API 응답 그대로 사용
 * - UX 우선순위 변경 없음
 * - 데이터 가공/변경 없음
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button, Card, CardContent } from '@o4o/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMemberHome } from '@/hooks/useMemberHome';
import {
  OrganizationNoticeSection,
  GroupbuySummarySection,
  EducationSummarySection,
  ForumSummarySection,
  BannerPlaceholderSection,
} from '@/components/member';

export function MemberHomePage() {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { data, isLoading, error, refetch } = useMemberHome();

  // 로그인 필수 가드
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isLoggedIn, navigate]);

  // Auth loading
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Not logged in (redirect in progress)
  if (!isLoggedIn) {
    return null;
  }

  // API Error
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  데이터를 불러올 수 없습니다
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  잠시 후 다시 시도해 주세요.
                </p>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const homeData = data?.data;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">내 홈</h1>
        <p className="text-sm text-gray-500 mt-1">
          지금 나에게 중요한 것을 한눈에 확인하세요.
        </p>
      </div>

      {/* Sections - UX Priority 순서 (변경 금지) */}
      <div className="space-y-4">
        {/* [1] Organization Notice */}
        <OrganizationNoticeSection
          data={homeData?.organizationNotice ?? null}
          isLoading={isLoading}
        />

        {/* [2] Groupbuy Summary */}
        <GroupbuySummarySection
          data={homeData?.groupbuySummary ?? null}
          isLoading={isLoading}
        />

        {/* [3] Education Summary */}
        <EducationSummarySection
          data={homeData?.educationSummary ?? null}
          isLoading={isLoading}
        />

        {/* [4] Forum Summary */}
        <ForumSummarySection
          data={homeData?.forumSummary ?? null}
          isLoading={isLoading}
        />

        {/* [5] Banner Placeholder */}
        <BannerPlaceholderSection
          data={homeData?.bannerSummary ?? null}
          isLoading={isLoading}
        />
      </div>

      {/* Section Status (dev용, 필요시 제거) */}
      {data?.sectionStatus && process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
          <p className="font-medium mb-2">Section Status (dev only):</p>
          <ul className="space-y-1 text-gray-600">
            {Object.entries(data.sectionStatus).map(([key, value]) => (
              <li key={key}>
                {key}: {value ? '✓' : '✗'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MemberHomePage;
