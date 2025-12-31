/**
 * PartnerOps App Manifest
 *
 * S2S 구조에서 Partner(파트너/제휴) 역할의 운영 앱
 *
 * ## Ops 서비스 책임 범위
 * - 자격 관리: Partner 프로필, 상태
 * - 상태 관리: 링크 활성화/비활성화, 전환 추적
 * - 관계 관리: 파트너-상품 연결, 커미션 조회
 *
 * ## Ops 서비스가 하지 않는 것
 * - 업무 방식 판단 (서비스별 정책)
 * - 정책 결정 (커미션율, 승인 조건 등)
 * - 비즈니스 로직 (서비스별 Extension에서 처리)
 *
 * ## TODO: 서비스 특화 로직 분리 대상
 * - PharmacyActivityService/Controller: 약국 특화 로직
 *   → 향후 yaksa-partner-extension 또는 별도 Extension으로 이동 예정
 *   → 현재는 PartnerOps 내부에 위치하나, Ops 중립성 원칙에 따라 분리 필요
 */

export const partneropsManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'partnerops',
  displayName: '파트너 운영',
  version: '1.0.0',
  appType: 'extension' as const,
  description: 'S2S Partner 운영 앱 - 파트너 프로필, 링크 추적, 전환 분석, 커미션 정산',

  // ===== 의존성 =====
  dependencies: {
    core: ['dropshipping-core'],
    optional: [],
  },

  // Permissions
  permissions: [
    'partnerops.read',
    'partnerops.write',
    'partnerops.routines.manage',
    'partnerops.links.manage',
    'partnerops.conversions.view',
    'partnerops.settlement.view',
  ],

  // Events this app subscribes to
  events: {
    subscribes: [
      'order.created',
      'order.completed',
      'commission.transaction.created',
      'commission.applied',
      'settlement.closed',
    ],
    publishes: [
      'partner.registered',
      'partner.approved',
      'partner.link.created',
      'partner.link.clicked',
      'partner.conversion.recorded',
      'partner.routine.created',
    ],
  },

  // API Routes
  routes: [
    // Dashboard
    { method: 'GET', path: '/partnerops/dashboard/summary', handler: 'DashboardController.getSummary' },

    // Profile
    { method: 'GET', path: '/partnerops/profile', handler: 'ProfileController.getProfile' },
    { method: 'PUT', path: '/partnerops/profile', handler: 'ProfileController.updateProfile' },
    { method: 'POST', path: '/partnerops/profile/apply', handler: 'ProfileController.applyAsPartner' },

    // Routines (Content)
    { method: 'GET', path: '/partnerops/routines', handler: 'RoutinesController.list' },
    { method: 'GET', path: '/partnerops/routines/:id', handler: 'RoutinesController.getById' },
    { method: 'POST', path: '/partnerops/routines', handler: 'RoutinesController.create' },
    { method: 'PUT', path: '/partnerops/routines/:id', handler: 'RoutinesController.update' },
    { method: 'DELETE', path: '/partnerops/routines/:id', handler: 'RoutinesController.delete' },

    // Links
    { method: 'GET', path: '/partnerops/links', handler: 'LinksController.list' },
    { method: 'POST', path: '/partnerops/links', handler: 'LinksController.create' },
    { method: 'GET', path: '/partnerops/links/:id/stats', handler: 'LinksController.getStats' },
    { method: 'DELETE', path: '/partnerops/links/:id', handler: 'LinksController.delete' },

    // Conversions
    { method: 'GET', path: '/partnerops/conversions', handler: 'ConversionsController.list' },
    { method: 'GET', path: '/partnerops/conversions/summary', handler: 'ConversionsController.getSummary' },
    { method: 'GET', path: '/partnerops/conversions/funnel', handler: 'ConversionsController.getFunnel' },

    // Settlement
    { method: 'GET', path: '/partnerops/settlement/summary', handler: 'SettlementController.getSummary' },
    { method: 'GET', path: '/partnerops/settlement/batches', handler: 'SettlementController.getBatches' },
    { method: 'GET', path: '/partnerops/settlement/transactions', handler: 'SettlementController.getTransactions' },

    // Pharmacy Activity (read-only)
    { method: 'GET', path: '/partnerops/pharmacy-activity', handler: 'PharmacyActivityController.list' },
    { method: 'GET', path: '/partnerops/pharmacy-activity/stats', handler: 'PharmacyActivityController.getStats' },
    { method: 'GET', path: '/partnerops/pharmacy-activity/:pharmacyId', handler: 'PharmacyActivityController.getPharmacyDetail' },
  ],

  // Lifecycle Hooks
  lifecycle: {
    install: './lifecycle/install',
    activate: './lifecycle/activate',
    deactivate: './lifecycle/deactivate',
    uninstall: './lifecycle/uninstall',
  },

  /**
   * Menu Configuration (표준 형식)
   */
  menus: {
    admin: [],
    member: [
      { label: '대시보드', path: '/partnerops/dashboard', icon: 'LayoutDashboard' },
      { label: '내 프로필', path: '/partnerops/profile', icon: 'User' },
      { label: '콘텐츠 관리', path: '/partnerops/routines', icon: 'FileText' },
      { label: '링크 관리', path: '/partnerops/links', icon: 'Link' },
      { label: '전환 분석', path: '/partnerops/conversions', icon: 'TrendingUp' },
      { label: '약국 활동', path: '/partnerops/pharmacy-activity', icon: 'Activity' },
      { label: '정산 내역', path: '/partnerops/settlement', icon: 'DollarSign' },
    ],
  },

  /**
   * Backend Configuration
   */
  backend: {
    entities: [],
    services: [
      'DashboardService',
      'ProfileService',
      'RoutinesService',
      'LinksService',
      'ConversionsService',
      'SettlementService',
      'PharmacyActivityService',
    ],
    controllers: [
      'DashboardController',
      'ProfileController',
      'RoutinesController',
      'LinksController',
      'ConversionsController',
      'SettlementController',
      'PharmacyActivityController',
    ],
    routesExport: 'createRoutes',
  },

  /**
   * Exposes
   */
  exposes: {
    services: [
      'DashboardService',
      'ProfileService',
      'RoutinesService',
      'LinksService',
      'ConversionsService',
      'SettlementService',
    ],
    types: [
      'PartnerProfileDto',
      'PartnerRoutineDto',
      'PartnerLinkDto',
      'ConversionDto',
    ],
    events: [
      'partner.registered',
      'partner.approved',
      'partner.link.created',
      'partner.link.clicked',
      'partner.conversion.recorded',
      'partner.routine.created',
    ],
  },
};

export default partneropsManifest;
