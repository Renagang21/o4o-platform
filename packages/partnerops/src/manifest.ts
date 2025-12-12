/**
 * PartnerOps App Manifest
 *
 * Partner Operations App for the O4O Platform
 * Manages partners, affiliate links, conversions, and commissions
 *
 * Phase 5 Refactoring: Partner-Core 기반
 *
 * @package @o4o/partnerops
 */

export const partneropsManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'partnerops',
  displayName: '파트너 운영',
  version: '2.0.0',
  appType: 'extension' as const,
  description: '파트너 운영 앱 - Partner-Core 기반 파트너 관리, 링크 추적, 전환 분석, 커미션 정산',

  // ===== 의존성 (Partner-Core 기반) =====
  dependencies: {
    core: ['partner-core'],  // dropshipping-core → partner-core
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
    'partnerops.profile.manage',
  ],

  // Events this app subscribes to (Partner-Core events)
  events: {
    subscribes: [
      // Partner-Core events
      'partner-core.partner.created',
      'partner-core.partner.updated',
      'partner-core.partner.level-changed',
      'partner-core.click.recorded',
      'partner-core.conversion.created',
      'partner-core.conversion.confirmed',
      'partner-core.commission.created',
      'partner-core.commission.settled',
      'partner-core.settlement.batch-created',
      'partner-core.settlement.paid',
      // Order events
      'order.created',
      'order.completed',
    ],
    publishes: [
      'partnerops.partner.registered',
      'partnerops.partner.profile-updated',
      'partnerops.routine.created',
      'partnerops.routine.published',
      'partnerops.link.created',
    ],
  },

  // API Routes (Partner-Core 기반)
  routes: [
    // Dashboard
    { method: 'GET', path: '/partnerops/dashboard/summary', handler: 'DashboardController.getSummary' },
    { method: 'GET', path: '/partnerops/dashboard/stats', handler: 'DashboardController.getStatsByPeriod' },

    // Profile
    { method: 'GET', path: '/partnerops/profile', handler: 'ProfileController.getProfile' },
    { method: 'PUT', path: '/partnerops/profile', handler: 'ProfileController.updateProfile' },
    { method: 'POST', path: '/partnerops/profile/apply', handler: 'ProfileController.applyAsPartner' },
    { method: 'GET', path: '/partnerops/profile/level', handler: 'ProfileController.getLevelInfo' },

    // Routines (Content)
    { method: 'GET', path: '/partnerops/routines', handler: 'RoutinesController.list' },
    { method: 'GET', path: '/partnerops/routines/:id', handler: 'RoutinesController.getById' },
    { method: 'POST', path: '/partnerops/routines', handler: 'RoutinesController.create' },
    { method: 'PUT', path: '/partnerops/routines/:id', handler: 'RoutinesController.update' },
    { method: 'DELETE', path: '/partnerops/routines/:id', handler: 'RoutinesController.delete' },
    { method: 'POST', path: '/partnerops/routines/:id/publish', handler: 'RoutinesController.publish' },
    { method: 'POST', path: '/partnerops/routines/:id/archive', handler: 'RoutinesController.archive' },

    // Links
    { method: 'GET', path: '/partnerops/links', handler: 'LinksController.list' },
    { method: 'GET', path: '/partnerops/links/summary', handler: 'LinksController.getSummary' },
    { method: 'POST', path: '/partnerops/links', handler: 'LinksController.create' },
    { method: 'GET', path: '/partnerops/links/:id/stats', handler: 'LinksController.getStats' },
    { method: 'DELETE', path: '/partnerops/links/:id', handler: 'LinksController.delete' },

    // Conversions
    { method: 'GET', path: '/partnerops/conversions', handler: 'ConversionsController.list' },
    { method: 'GET', path: '/partnerops/conversions/summary', handler: 'ConversionsController.getSummary' },
    { method: 'GET', path: '/partnerops/conversions/funnel', handler: 'ConversionsController.getFunnel' },
    { method: 'GET', path: '/partnerops/conversions/:id', handler: 'ConversionsController.getById' },

    // Settlement
    { method: 'GET', path: '/partnerops/settlement/summary', handler: 'SettlementController.getSummary' },
    { method: 'GET', path: '/partnerops/settlement/batches', handler: 'SettlementController.getBatches' },
    { method: 'GET', path: '/partnerops/settlement/batches/:id', handler: 'SettlementController.getBatchById' },
  ],

  // Lifecycle Hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
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
      { label: '정산 내역', path: '/partnerops/settlement', icon: 'DollarSign' },
    ],
  },

  /**
   * Backend Configuration (Partner-Core 기반)
   */
  backend: {
    // Partner-Core entities 사용, PartnerOps는 자체 entity 없음
    entities: [],
    services: [
      'DashboardService',
      'ProfileService',
      'RoutineService',
      'LinkService',
      'ConversionService',
      'SettlementService',
    ],
    controllers: [
      'DashboardController',
      'ProfileController',
      'RoutinesController',
      'LinksController',
      'ConversionsController',
      'SettlementController',
    ],
    routesExport: 'createRoutes',
  },

  /**
   * Exposes (외부에 노출하는 것들)
   */
  exposes: {
    services: [
      'DashboardService',
      'ProfileService',
      'RoutineService',
      'LinkService',
      'ConversionService',
      'SettlementService',
    ],
    types: [
      'PartnerProfileDto',
      'DashboardSummaryDto',
      'PartnerRoutineDto',
      'PartnerLinkStatsDto',
      'ConversionListItemDto',
      'SettlementSummaryDto',
      'SettlementBatchItemDto',
    ],
    events: [
      'partnerops.partner.registered',
      'partnerops.partner.profile-updated',
      'partnerops.routine.created',
      'partnerops.routine.published',
      'partnerops.link.created',
    ],
  },

  /**
   * Extension Points
   * Partner-Core의 확장 포인트 사용
   */
  extensionPoints: {
    // Partner-Core의 pharmaceutical 필터링 hook 사용
    hooks: ['partner-core.validatePartnerVisibility'],
  },
};

export default partneropsManifest;
