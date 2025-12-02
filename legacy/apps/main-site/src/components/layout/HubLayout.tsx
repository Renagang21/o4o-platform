/**
 * 역할별 허브 레이아웃 컴포넌트
 *
 * 사용자의 currentRole에 따라 메뉴, 배너, 콘텐츠를 동적으로 표시합니다.
 * M4: 개인화 슬롯 통합 (TopNotice, PersonalizedFeed, SideSuggestions, BottomBanners)
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMenuForRole, getBannersForRole, getDashboardForRole } from '../../config/roles';
import { UserRole } from '../../types/user';
import { trackRoleMenuLoaded, trackRoleBannerShown, trackRoleDashboardLoaded } from '../../utils/analytics';
import { generatePersonalizedFeed } from '../../services/personalizationService';
import { PersonalizedFeed as PersonalizedFeedType } from '../../types/personalization';
import TopNotice from '../personalization/TopNotice';
import SideSuggestions from '../personalization/SideSuggestions';
import BottomBanners from '../personalization/BottomBanners';

interface HubLayoutProps {
  requiredRole: UserRole | string;
  children?: React.ReactNode;
  showPersonalization?: boolean; // 개인화 슬롯 표시 여부 (기본: true)
}

/**
 * 역할 인지 허브 레이아웃
 *
 * - currentRole 구독하여 자동 UI 업데이트
 * - 역할별 메뉴, 배너, 대시보드 설정 적용
 * - 개인화 슬롯 통합 (M4)
 */
export const HubLayout: React.FC<HubLayoutProps> = ({ requiredRole, children, showPersonalization = true }) => {
  const { user } = useAuth();
  const currentRole = user?.currentRole || user?.roles?.[0] || 'customer';
  const [personalizedFeed, setPersonalizedFeed] = useState<PersonalizedFeedType | null>(null);

  // 역할별 설정 로드
  const menuConfig = getMenuForRole(currentRole);
  const banners = getBannersForRole(currentRole);
  const dashboardConfig = getDashboardForRole(currentRole);

  // 개인화 피드 생성
  useEffect(() => {
    if (showPersonalization && user) {
      const feed = generatePersonalizedFeed(
        currentRole,
        user.roles || [currentRole],
        user.createdAt
      );
      setPersonalizedFeed(feed);
    }
  }, [currentRole, user, showPersonalization]);

  // 역할 변경 시 분석 이벤트 전송
  useEffect(() => {
    // 메뉴 로드 이벤트
    trackRoleMenuLoaded(currentRole, menuConfig.primary.length);

    // 대시보드 로드 이벤트
    trackRoleDashboardLoaded(currentRole, dashboardConfig.cards.length);

    // 배너 표시 이벤트
    if (banners.length > 0) {
      const topBanner = banners[0];
      trackRoleBannerShown(currentRole, topBanner.id, topBanner.title);
    }
  }, [currentRole, menuConfig, dashboardConfig, banners]);

  // 배너 표시 (있을 경우 최상위 1개)
  const topBanner = banners.length > 0 ? banners[0] : null;

  return (
    <div className="hub-layout max-w-7xl mx-auto px-4 py-6">
      {/* M4: 개인화 상단 공지 */}
      {showPersonalization && personalizedFeed?.topNotice && (
        <TopNotice banner={personalizedFeed.topNotice} role={currentRole} />
      )}

      {/* 역할별 배너 (M3 - 폴백용) */}
      {!showPersonalization && topBanner && (
        <div
          className="hub-banner py-8 px-6 mb-6 rounded-lg"
          style={{
            backgroundColor: topBanner.backgroundColor || '#3b82f6',
            color: topBanner.textColor || '#ffffff'
          }}
        >
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">{topBanner.title}</h2>
            <p className="text-lg opacity-90 mb-4">{topBanner.description}</p>
            {topBanner.ctaText && topBanner.ctaUrl && (
              <a
                href={topBanner.ctaUrl}
                className="inline-block bg-white text-gray-900 px-6 py-2 rounded-md font-medium hover:bg-opacity-90 transition-colors"
              >
                {topBanner.ctaText}
              </a>
            )}
          </div>
        </div>
      )}

      {/* 대시보드 헤더 */}
      <div className="hub-header mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{dashboardConfig.title}</h1>
        {dashboardConfig.subtitle && (
          <p className="text-gray-600 mt-2">{dashboardConfig.subtitle}</p>
        )}
      </div>

      {/* 메인 콘텐츠 영역 (개인화 슬롯 포함) */}
      <div className="hub-content flex gap-6">
        {/* 메인 영역 */}
        <div className="flex-1">
          {children}
        </div>

        {/* M4: 사이드 추천 (데스크톱 only) */}
        {showPersonalization && personalizedFeed?.suggestions && (
          <div className="hidden lg:block w-64">
            <SideSuggestions suggestions={personalizedFeed.suggestions} role={currentRole} />
          </div>
        )}
      </div>

      {/* M4: 하단 배너 */}
      {showPersonalization && personalizedFeed?.bottomBanners && (
        <BottomBanners banners={personalizedFeed.bottomBanners} role={currentRole} />
      )}
    </div>
  );
};

export default HubLayout;
