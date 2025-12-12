/**
 * AnnualFee-Yaksa Extension App Manifest
 *
 * 약사회 연회비 시스템 앱 매니페스트
 *
 * Extends membership-yaksa with annual fee management:
 * - Fee policy management
 * - Invoice generation and management
 * - Payment processing
 * - Exemption workflow
 * - Settlement automation
 */

export const annualfeeYaksaManifest = {
  // ===== 필수 기본 정보 =====
  id: 'annualfee-yaksa',
  appId: 'annualfee-yaksa',
  displayName: '약사회 연회비 시스템',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '약사회 연회비/회비 관리 시스템 - 정책, 청구, 납부, 감면, 정산 관리',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    extension: ['membership-yaksa'],
  },
  dependsOn: ['organization-core', 'membership-yaksa'],

  // ===== 소유 테이블 =====
  ownsTables: [
    'yaksa_fee_policies',
    'yaksa_fee_invoices',
    'yaksa_fee_payments',
    'yaksa_fee_exemptions',
    'yaksa_fee_settlements',
    'yaksa_fee_logs',
  ],

  // ===== 삭제 정책 =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true,
  },

  // ===== 백엔드 =====
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
      'MemberFeeService',
      // Phase 2 Automation Services
      'InvoiceAutoGenerator',
      'FeeReminderService',
      'ReceiptPdfGenerator',
      'CsvPaymentImporter',
      'SettlementAutomation',
    ],
    routes: 'createRoutes',
  },

  // ===== 네비게이션 =====
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

  // ===== 훅 =====
  hooks: {
    // Membership-Yaksa 연동
    onMemberInfoChanged: 'FeeSyncService.onMemberInfoChanged',
    // LMS-Yaksa 연동
    onLmsCreditsCompleted: 'FeeSyncService.onLmsCreditsCompleted',
  },
};

export const manifest = annualfeeYaksaManifest;
export default annualfeeYaksaManifest;
