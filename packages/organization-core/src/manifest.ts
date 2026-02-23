/**
 * Organization-Core App Manifest
 *
 * 전사 조직 관리 시스템 (Core Domain)
 * - 계층 구조 조직 관리
 * - 멤버 관리
 * - 조직 스코프 권한
 *
 * @status FROZEN - Phase A/B complete (2025-12-14)
 * @note Foundation Core. Do not modify without Phase review.
 */

export const organizationCoreManifest = {
  // ===== 필수 기본 정보 =====
  appId: 'organization-core',
  displayName: '조직 관리',
  name: 'Organization Core',
  version: '1.0.0',
  type: 'core' as const,
  appType: 'core' as const, // Legacy compatibility
  category: 'organization' as const,
  description: '전사 조직 관리 시스템 (Core Domain) - 계층 구조, 멤버 관리, 조직 스코프 권한',

  // ===== 의존성 =====
  dependencies: {
    core: [],
    apps: [],
  },

  // ===== 소유 테이블 =====
  ownsTables: [
    'organizations',
    'organization_members',
    'organization_units',
    'organization_roles',
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
      './entities/Organization',
      './entities/OrganizationMember',
      // RoleAssignment Entity는 Auth module이 소유
      // (organization-core는 interface만 제공, string-based repository 참조)
    ],
    services: [
      'OrganizationService',
      'OrganizationMemberService',
    ],
    controllers: [
      'OrganizationController',
    ],
    routesExport: 'createRoutes',
  },

  // ===== 프론트엔드 =====
  frontend: {
    admin: {
      pages: [
        { path: '/admin/organizations', component: 'OrganizationList' },
        { path: '/admin/organizations/:id', component: 'OrganizationDetail' },
        { path: '/admin/organizations/:id/members', component: 'OrganizationMembers' },
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
      id: 'organization.read',
      name: '조직 읽기',
      description: '조직 정보를 조회할 수 있는 권한',
      category: 'organization',
    },
    {
      id: 'organization.manage',
      name: '조직 관리',
      description: '조직 생성/수정/삭제 권한',
      category: 'organization',
    },
    {
      id: 'organization.member.read',
      name: '조직 멤버 읽기',
      description: '조직 멤버 목록 조회 권한',
      category: 'organization',
    },
    {
      id: 'organization.member.manage',
      name: '조직 멤버 관리',
      description: '조직 멤버 추가/삭제/수정 권한',
      category: 'organization',
    },
  ],

  // ===== 메뉴 정의 =====
  menus: {
    admin: [
      {
        id: 'organizations',
        label: '조직 관리',
        icon: 'building-office',
        order: 10,
        children: [
          {
            id: 'organization-list',
            label: '조직 목록',
            path: '/admin/organizations',
            icon: 'list-bullet',
          },
        ],
      },
    ],
  },

  // ===== 외부 노출 (다른 앱에서 사용 가능) =====
  exposes: {
    services: ['OrganizationService', 'OrganizationMemberService'],
    types: ['Organization', 'OrganizationMember', 'OrganizationUnit', 'OrganizationRole'],
    events: ['organization.created', 'organization.updated', 'organization.deleted', 'member.added', 'member.removed'],
  },

  // ===== 기본 설정 =====
  defaultConfig: {
    enableHierarchy: true,
    maxDepth: 5,
    defaultOrganizationType: 'branch',
  },
};

// Legacy export for backward compatibility
export const manifest = organizationCoreManifest;
export default organizationCoreManifest;
