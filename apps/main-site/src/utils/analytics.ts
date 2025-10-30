/**
 * 분석 이벤트 유틸리티
 *
 * - 역할 전환, 메뉴 로드, 배너 표시 등의 이벤트 추적
 * - Google Analytics, Mixpanel 등 외부 서비스 연동 가능
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

/**
 * 분석 이벤트 전송
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  const event: AnalyticsEvent = {
    name: eventName,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      path: window.location.pathname
    }
  };

  // 개발 환경에서는 콘솔에 로그
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.info('[Analytics]', event.name, event.properties);
  }

  // Google Analytics 4 (gtag.js)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties);
  }

  // Google Tag Manager (dataLayer)
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...properties
    });
  }

  // Mixpanel (선택적)
  if (typeof window !== 'undefined' && (window as any).mixpanel) {
    (window as any).mixpanel.track(eventName, properties);
  }
}

/**
 * 역할 전환 이벤트
 */
export function trackRoleSwitch(fromRole: string, toRole: string): void {
  trackEvent('role_switched', {
    from_role: fromRole,
    to_role: toRole
  });
}

/**
 * 역할별 메뉴 로드 이벤트
 */
export function trackRoleMenuLoaded(role: string, menuItemCount: number): void {
  trackEvent('role_menu_loaded', {
    role,
    menu_item_count: menuItemCount
  });
}

/**
 * 역할별 배너 표시 이벤트
 */
export function trackRoleBannerShown(role: string, bannerId: string, bannerTitle: string): void {
  trackEvent('role_banner_shown', {
    role,
    banner_id: bannerId,
    banner_title: bannerTitle
  });
}

/**
 * 역할별 대시보드 로드 이벤트
 */
export function trackRoleDashboardLoaded(role: string, cardCount: number): void {
  trackEvent('role_dashboard_loaded', {
    role,
    card_count: cardCount
  });
}

/**
 * 대시보드 카드 클릭 이벤트
 */
export function trackDashboardCardClick(role: string, cardId: string, cardTitle: string): void {
  trackEvent('dashboard_card_clicked', {
    role,
    card_id: cardId,
    card_title: cardTitle
  });
}

/**
 * 허브 접근 거부 이벤트 (권한 없음)
 */
export function trackAccessDenied(requiredRole: string, userRole: string): void {
  trackEvent('hub_access_denied', {
    required_role: requiredRole,
    user_role: userRole
  });
}

/**
 * 페이지 뷰 이벤트
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title
  });
}
