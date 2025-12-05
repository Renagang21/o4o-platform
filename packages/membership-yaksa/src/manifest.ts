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
  appId: 'membership-yaksa',
  name: 'Membership Extension – Yaksa Organization',
  type: 'extension' as const,
  version: '1.0.0',
  description: '약사회 회원 관리 시스템 (회원정보, 자격검증, 소속관리, 연회비)',

  // Core dependency
  dependencies: {
    'organization-core': '>=1.0.0',
  },

  // Uninstall policy
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: true,
    autoBackup: true, // Member data is critical
  },

  // Extension tables (membership-specific)
  ownsTables: [
    'yaksa_members',
    'yaksa_member_categories',
    'yaksa_member_affiliations',
    'yaksa_membership_roles',
    'yaksa_membership_years',
    'yaksa_member_verifications',
  ],

  // Permissions
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

  // Admin UI routes
  adminRoutes: [
    {
      path: '/admin/membership',
      component: './admin-ui/pages/MembershipYaksaApp.js',
    },
  ],

  // Default configuration
  defaultConfig: {
    enableVerification: true,
    requireLicenseNumber: true,
    annualFeeRequired: true,
    defaultAnnualFee: 50000, // 50,000 KRW
    verificationMethods: ['license_api', 'manual_upload', 'phone_verification'],
  },

  // Menu
  menu: {
    admin: [
      {
        id: 'membership',
        label: '회원 관리',
        icon: 'users',
        children: [
          {
            id: 'members',
            label: '회원 목록',
            path: '/admin/membership/members',
          },
          {
            id: 'verifications',
            label: '자격 검증',
            path: '/admin/membership/verifications',
          },
          {
            id: 'categories',
            label: '회원 분류',
            path: '/admin/membership/categories',
          },
          {
            id: 'annual-fees',
            label: '연회비 관리',
            path: '/admin/membership/annual-fees',
          },
        ],
      },
    ],
  },
};

export default membershipYaksaManifest;
