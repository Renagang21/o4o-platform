/**
 * PartnerOps App Manifest
 *
 * Partner Operations App for the O4O Platform
 * Manages partners, affiliate links, conversions, and commissions
 */

export const manifest = {
  // Basic Info
  appId: 'partnerops',
  name: 'PartnerOps',
  version: '1.0.0',
  description: '파트너 운영 앱 - 파트너 관리, 링크 추적, 전환 분석, 커미션 정산',

  // App Type
  type: 'extension' as const,

  // Dependencies - requires dropshipping-core
  dependsOn: ['dropshipping-core'],

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
  ],

  // Admin Menu Configuration
  menu: {
    label: '파트너 관리',
    icon: 'Users',
    path: '/partnerops',
    requiredPermission: 'partnerops.read',
    children: [
      { label: '대시보드', path: '/partnerops/dashboard', icon: 'LayoutDashboard' },
      { label: '내 프로필', path: '/partnerops/profile', icon: 'User' },
      { label: '콘텐츠 관리', path: '/partnerops/routines', icon: 'FileText' },
      { label: '링크 관리', path: '/partnerops/links', icon: 'Link' },
      { label: '전환 분석', path: '/partnerops/conversions', icon: 'TrendingUp' },
      { label: '정산 내역', path: '/partnerops/settlement', icon: 'DollarSign' },
    ],
  },

  // Lifecycle Hooks
  lifecycle: {
    onInstall: './lifecycle/install',
    onActivate: './lifecycle/activate',
    onDeactivate: './lifecycle/deactivate',
    onUninstall: './lifecycle/uninstall',
  },
};

export default manifest;
