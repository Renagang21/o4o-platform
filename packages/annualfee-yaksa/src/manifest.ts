/**
 * AnnualFee-Yaksa Manifest
 *
 * 약사회 연회비 시스템 앱 매니페스트
 */

export const manifest = {
  meta: {
    appId: 'annualfee-yaksa',
    name: '약사회 연회비 시스템',
    version: '1.0.0',
    type: 'extension' as const,
    description: '약사회 연회비/회비 관리 시스템 - 정책, 청구, 납부, 감면, 정산 관리',
    author: 'O4O Platform',
  },

  dependencies: {
    core: ['organization-core'],
    extension: ['membership-yaksa'],
  },

  cms: {
    cpt: [],
    acf: [],
    viewTemplates: [],
  },

  backend: {
    entities: [
      'FeePolicy',
      'FeeInvoice',
      'FeePayment',
      'FeeExemption',
      'FeeSettlement',
      'FeeLog',
    ],
    services: [
      'FeePolicyService',
      'FeeCalculationService',
      'FeeInvoiceService',
      'FeePaymentService',
      'FeeExemptionService',
      'FeeSettlementService',
      'FeeLogService',
      'FeeSyncService',
    ],
    routes: [
      {
        path: '/api/annualfee',
        handler: 'createRoutes',
      },
    ],
  },

  navigation: {
    menus: [],
    adminRoutes: [
      {
        path: '/admin/annualfee',
        label: '회비 관리',
        icon: 'wallet',
        children: [
          {
            path: '/admin/annualfee/dashboard',
            label: '회비 대시보드',
          },
          {
            path: '/admin/annualfee/policies',
            label: '정책 관리',
          },
          {
            path: '/admin/annualfee/invoices',
            label: '청구 관리',
          },
          {
            path: '/admin/annualfee/payments',
            label: '납부 관리',
          },
          {
            path: '/admin/annualfee/exemptions',
            label: '감면 관리',
          },
          {
            path: '/admin/annualfee/settlements',
            label: '정산 관리',
          },
        ],
      },
    ],
  },

  hooks: {
    // Membership-Yaksa 연동
    onMemberInfoChanged: 'FeeSyncService.onMemberInfoChanged',
    // LMS-Yaksa 연동
    onLmsCreditsCompleted: 'FeeSyncService.onLmsCreditsCompleted',
  },
};

export default manifest;
