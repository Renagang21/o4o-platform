/**
 * PartnerOps App Manifest
 *
 * Partner Operations App for the O4O Platform
 * Manages partners, affiliate links, conversions, and commissions
 */

export const partneropsManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'partnerops',
  displayName: '파트너 운영',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '파트너 운영 앱 - 파트너 관리, 링크 추적, 전환 분석, 커미션 정산',

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
