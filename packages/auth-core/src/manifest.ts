/**
 * Auth-Core App Manifest
 *
 * Core authentication and RBAC system:
 * - User management (users table)
 * - Role management (roles table)
 * - Permission management (permissions table)
 * - Role-Permission assignments (role_permissions table)
 * - User-Role assignments (user_roles table)
 * - OAuth linked accounts (linked_accounts table)
 * - Refresh tokens (refresh_tokens table)
 * - Login attempts tracking (login_attempts table)
 *
 * @status FROZEN - Phase A/B complete (2025-12-14)
 * @note Foundation Core. Do not modify without Phase review.
 */

export const authCoreManifest = {
  // ===== Required Basic Information =====
  id: 'auth-core',
  appId: 'auth-core',
  displayName: '인증 & RBAC 코어',
  name: 'Authentication & RBAC Core',
  version: '1.0.0',
  type: 'core' as const,
  appType: 'core' as const,
  category: 'core' as const,
  description: '사용자 인증, 역할 기반 접근 제어(RBAC), 권한 관리 핵심 시스템',

  // ===== Dependencies =====
  dependencies: {
    core: [],
    apps: [],
  },

  // ===== Owned Tables =====
  ownsTables: [
    'users',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'linked_accounts',
    'refresh_tokens',
    'login_attempts',
  ],

  // ===== Uninstall Policy =====
  uninstallPolicy: {
    defaultMode: 'keep-data' as const,
    allowPurge: false, // Critical system tables - never purge
    autoBackup: true,
  },

  // ===== Backend =====
  backend: {
    // Note: Entities are currently in api-server, will be migrated in future phase
    entities: [],
    services: [],
    controllers: [],
    routesExport: 'createRoutes',
    routePrefix: '/api/v1/auth',
  },

  // ===== Lifecycle =====
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // ===== Permissions =====
  permissions: [
    {
      id: 'auth.users.view',
      name: '사용자 조회',
      description: '사용자 목록 및 상세 정보 조회',
      category: 'auth',
    },
    {
      id: 'auth.users.manage',
      name: '사용자 관리',
      description: '사용자 생성, 수정, 삭제',
      category: 'auth',
    },
    {
      id: 'auth.roles.view',
      name: '역할 조회',
      description: '역할 목록 및 상세 정보 조회',
      category: 'auth',
    },
    {
      id: 'auth.roles.manage',
      name: '역할 관리',
      description: '역할 생성, 수정, 삭제',
      category: 'auth',
    },
    {
      id: 'auth.permissions.view',
      name: '권한 조회',
      description: '권한 목록 조회',
      category: 'auth',
    },
    {
      id: 'auth.permissions.manage',
      name: '권한 관리',
      description: '권한 할당 및 관리',
      category: 'auth',
    },
  ],

  // ===== Admin Menus =====
  menus: {
    admin: [
      {
        id: 'auth-core',
        label: '사용자 & 권한',
        icon: 'users',
        order: 5,
        children: [
          {
            id: 'auth-users',
            label: '사용자 관리',
            path: '/admin/users',
            icon: 'user',
            permission: 'auth.users.view',
          },
          {
            id: 'auth-roles',
            label: '역할 관리',
            path: '/admin/roles',
            icon: 'shield',
            permission: 'auth.roles.view',
          },
          {
            id: 'auth-permissions',
            label: '권한 관리',
            path: '/admin/permissions',
            icon: 'key',
            permission: 'auth.permissions.view',
          },
        ],
      },
    ],
    member: [],
  },

  // ===== Exposes =====
  exposes: {
    entities: ['User', 'Role', 'Permission'],
    services: ['AuthService', 'UserService', 'RoleService', 'PermissionService'],
    types: ['User', 'Role', 'Permission', 'UserRole', 'UserStatus'],
    events: [
      'auth.user.created',
      'auth.user.updated',
      'auth.user.deleted',
      'auth.login.success',
      'auth.login.failed',
      'auth.role.assigned',
      'auth.role.revoked',
    ],
  },

  // ===== Default Config =====
  defaultConfig: {
    // Password policy
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: false,

    // Login security
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,

    // Session management
    accessTokenExpiresInMinutes: 15,
    refreshTokenExpiresInDays: 7,

    // Email verification
    requireEmailVerification: true,
  },
};

export default authCoreManifest;
