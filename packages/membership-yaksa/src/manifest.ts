/**
 * Membership-Yaksa Extension App Manifest
 *
 * Extends organization-core with Yaksa membership-specific features:
 * - Member management with license verification
 * - Affiliation tracking (multiple organizations)
 * - Membership year and annual fee management
 * - Verification workflow
 */

export const membershipYaksaManifest = {
  // ===== 필수 기본 정보 =====
  id: 'membership-yaksa',
  appId: 'membership-yaksa',
  displayName: '약사회 회원관리',
  version: '1.0.0',
  appType: 'extension' as const,
  description: '약사회 회원 관리 시스템 (회원정보, 자격검증, 소속관리, 연회비)',

  // ===== 의존성 =====
  dependencies: {
    core: ['organization-core'],
    optional: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'yaksa_members',
    'yaksa_member_categories',
    'yaksa_member_affiliations',
    'yaksa_membership_roles',
    'yaksa_membership_years',
    'yaksa_member_verifications',
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
      'YaksaMember',
      'YaksaMemberCategory',
      'YaksaMemberAffiliation',
      'YaksaMembershipRole',
      'YaksaMembershipYear',
      'YaksaMemberVerification',
    ],
    services: [
      'MembershipYaksaService',
      'VerificationService',
    ],
    controllers: [
      'MembershipController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/membership', component: 'MembershipYaksaApp' },
        { path: '/admin/membership/members', component: 'MemberList' },
        { path: '/admin/membership/verifications', component: 'VerificationList' },
        { path: '/admin/membership/categories', component: 'CategoryList' },
        { path: '/admin/membership/annual-fees', component: 'AnnualFeeList' },
      ],
    },
  },

  // ===== 라이프사이클 =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== 권한 정의 =====
  permissions: [
    {
      id: 'membership.view',
      name: '회원 조회',
      description: '회원 정보를 조회할 수 있는 권한',
      category: 'membership',
    },
    {
      id: 'membership.manage',
      name: '회원 관리',
      description: '회원 생성/수정/삭제 권한',
      category: 'membership',
    },
    {
      id: 'membership.verify',
      name: '회원 검증',
      description: '회원 자격을 검증할 수 있는 권한',
      category: 'membership',
    },
    {
      id: 'membership.payment',
      name: '연회비 관리',
      description: '연회비 납부 정보를 관리할 수 있는 권한',
      category: 'membership',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'membership',
        label: '회원 관리',
        icon: 'users',
        order: 15,
        children: [
          {
            id: 'members',
            label: '회원 목록',
            path: '/admin/membership/members',
            icon: 'list',
          },
          {
            id: 'verifications',
            label: '자격 검증',
            path: '/admin/membership/verifications',
            icon: 'check-circle',
          },
          {
            id: 'categories',
            label: '회원 분류',
            path: '/admin/membership/categories',
            icon: 'tag',
          },
          {
            id: 'annual-fees',
            label: '연회비 관리',
            path: '/admin/membership/annual-fees',
            icon: 'credit-card',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 =====
  exposes: {
    services: ['MembershipYaksaService', 'VerificationService'],
    types: ['YaksaMember', 'YaksaMemberCategory', 'YaksaMemberAffiliation'],
    events: ['member.created', 'member.verified', 'membership.renewed'],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    enableVerification: true,
    requireLicenseNumber: true,
    annualFeeRequired: true,
    defaultAnnualFee: 50000,
    verificationMethods: ['license_api', 'manual_upload', 'phone_verification'],
  },
};

// Legacy export for backward compatibility
export const manifest = membershipYaksaManifest;
export default membershipYaksaManifest;
