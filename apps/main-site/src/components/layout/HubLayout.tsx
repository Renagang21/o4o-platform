/**
 * 역할별 허브 레이아웃 컴포넌트
 *
 * 사용자의 currentRole에 따라 메뉴, 배너, 콘텐츠를 동적으로 표시합니다.
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMenuForRole, getBannersForRole, getDashboardForRole } from '../../config/roles';
import { UserRole } from '../../types/user';
import { trackRoleMenuLoaded, trackRoleBannerShown, trackRoleDashboardLoaded } from '../../utils/analytics';

interface HubLayoutProps {
  requiredRole: UserRole | string;
  children?: React.ReactNode;
}

/**
 * 역할 인지 허브 레이아웃
 *
 * - currentRole 구독하여 자동 UI 업데이트
 * - 역할별 메뉴, 배너, 대시보드 설정 적용
 */
export const HubLayout: React.FC<HubLayoutProps> = ({ requiredRole, children }) => {
  const { user } = useAuth();
  const currentRole = user?.currentRole || user?.roles?.[0] || 'customer';

  // 역할별 설정 로드
  const menuConfig = getMenuForRole(currentRole);
  const banners = getBannersForRole(currentRole);
  const dashboardConfig = getDashboardForRole(currentRole);

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
    <div className="hub-layout">
      {/* 역할별 배너 */}
      {topBanner && (
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

      {/* 메인 콘텐츠 */}
      <div className="hub-content">
        {children}
      </div>
    </div>
  );
};

export default HubLayout;
