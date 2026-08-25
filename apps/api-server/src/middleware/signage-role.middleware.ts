/**
 * Signage Role Middleware
 *
 * WO-P2-PLATFORM-ROLE-PREFIX-IMPLEMENTATION-V1 (Phase 2)
 *
 * Role-based access control for Digital Signage API routes.
 *
 * Role Hierarchy (Role Reform V1):
 * - Admin: System-wide management (settings, extensions, suppliers, analytics)
 * - Operator (HQ): Global content production per service
 * - Store: Store-specific content management
 *
 * See: ROLE-STRUCTURE-V3.md for full role definitions
 */

import { Request, Response, NextFunction } from 'express';
import { hasPlatformRole, logLegacyRoleUsage } from '../utils/role.utils.js';
import { AppDataSource } from '../database/connection.js';
import {
  resolveCanonicalServiceKey,
  resolveRolePrefixFromCanonicalServiceKey,
} from '@o4o/security-core';
import {
  STORE_SERVICE_ORG_LINKAGE,
  isOrganizationLinkedToService,
  type StoreOwnerServiceKey,
} from '../utils/store-organization.resolver.js';
import { hasActiveServiceMembership } from '../utils/service-membership.js';

// Extend Express Request interface
declare module 'express' {
  interface Request {
    signageContext?: {
      role: 'admin' | 'operator' | 'store';
      serviceKey?: string;
      organizationId?: string;
      permissions: string[];
    };
  }
}

/**
 * Check if user has Admin permission for Signage
 *
 * WO-P2-PLATFORM-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 2
 * - Only platform:super_admin allowed
 * - Legacy roles (admin, super_admin) logged and denied
 *
 * WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
 *   'platform:admin' 분기 제거 (보유자 0 · 독립 권한 0).
 */
/**
 * Signage URL 의 `:serviceKey` → **canonical service key**
 *
 * WO-O4O-KCOS-SIGNAGE-SERVICEKEY-CANONICALIZATION-V1
 *
 * Signage API 의 `:serviceKey` 정본은 `@o4o/security-core` 의 canonical service key
 * ('kpa-society' · 'k-cosmetics' · 'glycopharm' · 'neture') 다. 역할 prefix
 * ('kpa' · 'cosmetics') 로 들어온 legacy alias 는 canonical SSOT
 * (`resolveCanonicalServiceKey`) 를 통해 **하나의 내부 key 로 수렴**시킨다.
 *
 * - 서비스별 if/else 나 새로운 mapping 표를 만들지 않는다 (SSOT 는 security-core 하나).
 * - 역할 prefix 가 필요한 곳은 `resolveRolePrefixFromCanonicalServiceKey` 로 되돌린다.
 */
export function canonicalizeSignageServiceKey(raw: string | undefined): string {
  if (!raw) return '';
  return resolveCanonicalServiceKey(raw);
}

/**
 * 요청에서 canonical signage serviceKey 를 얻는다.
 *
 * Signage 의 모든 권한 판정·데이터 scope 는 이 함수 하나만 사용한다
 * (`req.params.serviceKey` 직접 사용 금지 — alias 가 그대로 데이터 축에 새는 경로다).
 */
export function getSignageServiceKey(req: Request): string {
  return canonicalizeSignageServiceKey(req.params?.serviceKey);
}

export function hasSignageAdminPermission(user: any): boolean {
  if (!user) return false;

  const userId = user.id || 'unknown';
  const userRoles: string[] = user.roles || [];

  // Check for platform-level admin roles (Priority 1)
  if (hasPlatformRole(userRoles, 'super_admin')) {
    return true;
  }

  // Check for specific signage admin permission
  if (user.permissions?.includes('signage:admin')) {
    return true;
  }

  // Check database roles for signage-specific admin
  if (user.dbRoles?.some((r: any) => r.name === 'signage-admin')) {
    return true;
  }

  // Legacy role detection - log but deny access (role column removed, skip this check)

  if (user.dbRoles?.some((r: any) => r.name === 'admin')) {
    logLegacyRoleUsage(userId, 'admin', 'signage-role.middleware:hasSignageAdminPermission (dbRoles)');
    return false; // Deny access for legacy dbRoles
  }

  return false;
}

/**
 * Signage serviceKey 중 **service_memberships 축이 존재하는** canonical key 목록.
 *
 * WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
 *
 * 'pharmacy' / 'tourism' / 'common' / 'test' 는 canonical service 가 아니라 legacy
 * signage key 다. 이 key 들에는 "이 사용자가 그 서비스 회원인가" 를 판정할 SSOT 가 없으므로
 * 추정으로 차단하지 않는다 (`toStoreOwnerServiceKey` 의 기존 정책과 동일).
 */
const MEMBERSHIP_BACKED_SIGNAGE_SERVICE_KEYS = new Set([
  'kpa-society',
  'k-cosmetics',
  'glycopharm',
  'neture',
]);

/**
 * signage 접근에 필요한 **active membership** 검사.
 *
 * WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
 *
 * 선행 WO(CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §10-1)가
 * 남긴 잔여 3계열 중 하나 — signage 권한 계열은 role(JWT) 만 보고 membership 을 보지 않았다.
 * 그 결과 정지된 회원도 signage operator/store/community/supplier 표면으로 들어올 수 있었고,
 * 이것이 suspend 경로에서 role soft-revoke 를 계속 유지해야 했던 이유였다.
 *
 * 판정은 DB 다 (JWT 스냅샷은 정지 즉시성이 0). platform:super_admin 은 기존 계약대로 우회한다.
 *
 * @returns true = 통과(검사 대상 아님 포함) · false = 차단
 */
async function hasSignageServiceMembership(user: any, serviceKey: string): Promise<boolean> {
  if (hasSignageAdminPermission(user)) return true;
  if (!MEMBERSHIP_BACKED_SIGNAGE_SERVICE_KEYS.has(serviceKey)) return true;
  const userId = user?.id || user?.userId;
  if (!userId) return false;
  if (!AppDataSource.isInitialized) return true;
  return hasActiveServiceMembership(AppDataSource, userId, serviceKey);
}

/** membership 차단 응답 (모든 signage 게이트 공통) */
function denySignageMembership(res: Response, serviceKey: string) {
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    code: 'MEMBERSHIP_NOT_ACTIVE',
    message: `Active service membership required for service: ${serviceKey}`,
  });
}

/**
 * Check if user has Operator (HQ) permission for a specific service
 */
export function hasSignageOperatorPermission(user: any, serviceKey: string): boolean {
  if (!user) return false;

  // Admin can always act as operator
  if (hasSignageAdminPermission(user)) {
    return true;
  }

  // Check for specific service operator permission
  const operatorPermission = `signage:${serviceKey}:operator`;
  if (user.permissions?.includes(operatorPermission)) {
    return true;
  }

  // Check database roles for operator role
  if (user.dbRoles?.some((r: any) =>
    r.name === `signage-${serviceKey}-operator` ||
    r.permissions?.includes(operatorPermission)
  )) {
    return true;
  }

  // Service-level operator/admin roles also grant signage access
  // e.g. glycopharm:operator, glycopharm:admin → signage:glycopharm access
  // KPA services: kpa-society serviceKey maps to kpa: role prefix
  const userRoles: string[] = user.roles || [];
  const rolePrefix = resolveRolePrefixFromCanonicalServiceKey(serviceKey);
  if (userRoles.some((r: string) =>
    r === `${serviceKey}:operator` || r === `${serviceKey}:admin` ||
    r === `${rolePrefix}:operator` || r === `${rolePrefix}:admin`
  )) {
    return true;
  }

  return false;
}

/**
 * Signage URL 의 `:serviceKey` → 매장 조직 귀속 판정용 서비스 키
 *
 * WO-O4O-SIGNAGE-CROSS-SERVICE-ORGANIZATION-SCOPE-GUARD-V1
 *
 * 변환은 `@o4o/security-core` 의 canonical SSOT 만 사용한다
 * ('kpa-society' → 'kpa', 'k-cosmetics' → 'cosmetics', 나머지 self-map).
 * 로컬 mapping 상수를 새로 만들지 않는다.
 *
 * 귀속 계약(`STORE_SERVICE_ORG_LINKAGE`)에 없는 serviceKey
 * (pharmacy / tourism / common / neture / test)는 "이 조직이 그 서비스 매장인가"를
 * 판정할 SSOT 가 없다. 추정으로 차단하지 않고 **기존 동작을 유지**한다 (null 반환).
 */
export function toStoreOwnerServiceKey(signageServiceKey: string | undefined): StoreOwnerServiceKey | null {
  if (!signageServiceKey) return null;
  const prefix = resolveRolePrefixFromCanonicalServiceKey(signageServiceKey);
  return Object.prototype.hasOwnProperty.call(STORE_SERVICE_ORG_LINKAGE, prefix)
    ? (prefix as StoreOwnerServiceKey)
    : null;
}

/**
 * store 스코프 요청에서 organization 이 요청 서비스에 귀속되는지 확인한다.
 *
 * 소유 검사(`organization_members`)만으로는 **타 서비스 매장 조직 id 가 통과**한다
 * (본 WO 재현: KPA signage 에 K-Cosmetics 매장 org → 200). 소유 + 서비스 귀속을
 * 모두 만족할 때만 통과시킨다.
 *
 * - 귀속 SSOT 가 없는 serviceKey → 검사하지 않음(기존 동작 유지)
 * - DB 오류 → fail-closed (기존 소유 검사 fallback 과 동일 정책)
 */
async function isSignageOrganizationInService(
  serviceKey: string | undefined,
  organizationId: string,
): Promise<boolean> {
  const storeKey = toStoreOwnerServiceKey(serviceKey);
  if (!storeKey) return true;
  try {
    return await isOrganizationLinkedToService(AppDataSource, organizationId, storeKey);
  } catch {
    return false;
  }
}

/**
 * Check if user has Store permission for a specific organization
 */
export function hasSignageStorePermission(
  user: any,
  organizationId: string
): boolean {
  if (!user) return false;

  // Admin can access any store
  if (hasSignageAdminPermission(user)) {
    return true;
  }

  // Check if user belongs to the organization
  if (user.organizationId === organizationId) {
    return true;
  }

  // Check if user has access to multiple organizations
  if (user.organizations?.includes(organizationId)) {
    return true;
  }

  // Check for specific store permission
  const storePermission = `signage:store:${organizationId}`;
  if (user.permissions?.includes(storePermission)) {
    return true;
  }

  return false;
}

/**
 * Middleware: Require Signage Admin permission
 *
 * Use for:
 * - /api/signage/admin/* routes
 * - System settings, extensions, suppliers management
 */
export const requireSignageAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  if (!hasSignageAdminPermission(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SIGNAGE_ADMIN_REQUIRED',
      message: 'Signage admin permission required',
    });
  }

  // Set context
  req.signageContext = {
    role: 'admin',
    permissions: ['signage:admin'],
  };

  next();
};

/**
 * Middleware: Require Signage Operator (HQ) permission
 *
 * Use for:
 * - /api/signage/:serviceKey/hq/* routes
 * - HQ playlist/media CRUD
 * - Community approval
 * - Forced content management
 */
export const requireSignageOperator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const serviceKey = getSignageServiceKey(req);

  if (!serviceKey) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'SERVICE_KEY_REQUIRED',
      message: 'Service key is required',
    });
  }

  if (!hasSignageOperatorPermission(req.user, serviceKey)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SIGNAGE_OPERATOR_REQUIRED',
      message: `Operator permission required for service: ${serviceKey}`,
    });
  }

  // role 이 있어도 그 서비스 회원이 아니면(정지 포함) 진입 불가
  if (!(await hasSignageServiceMembership(req.user, serviceKey))) {
    return denySignageMembership(res, serviceKey);
  }

  // Set context
  req.signageContext = {
    role: 'operator',
    serviceKey,
    permissions: [`signage:${serviceKey}:operator`],
  };

  next();
};

/**
 * Middleware: Require Signage Store permission
 *
 * Use for:
 * - /api/signage/:serviceKey/store/* routes
 * - Store playlist/media CRUD
 * - Schedule management
 * - Device management
 */
export const requireSignageStore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const serviceKey = getSignageServiceKey(req);

  // role/organization 검사 이전에 서비스 회원 여부를 먼저 본다 (membership = 진입 자격)
  if (!(await hasSignageServiceMembership(req.user, serviceKey))) {
    return denySignageMembership(res, serviceKey);
  }

  // Organization ID can come from header, query, or body
  const organizationId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    req.body?.organizationId;

  if (!organizationId) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'ORGANIZATION_ID_REQUIRED',
      message: 'Organization ID is required. Provide via X-Organization-Id header or organizationId parameter.',
    });
  }

  // Check in-memory first (admin, explicit permission, etc.)
  if (!hasSignageStorePermission(req.user, organizationId)) {
    // Fallback: check organization_members table for store membership (universal, all services)
    try {
      const rows = await AppDataSource.query(
        `SELECT 1 FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND role IN ('owner', 'admin', 'manager') AND left_at IS NULL LIMIT 1`,
        [(req.user as any).id || (req.user as any).userId, organizationId],
      );
      if (!rows || rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          code: 'SIGNAGE_STORE_REQUIRED',
          message: 'You do not have access to this store',
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'SIGNAGE_STORE_REQUIRED',
        message: 'You do not have access to this store',
      });
    }
  }

  // WO-O4O-SIGNAGE-CROSS-SERVICE-ORGANIZATION-SCOPE-GUARD-V1
  // 소유 검사만으로는 **타 서비스 매장 organization id** 가 통과한다.
  // 소유 + 요청 서비스 귀속을 모두 만족해야 한다 (platform admin 은 기존대로 우회).
  if (
    !hasSignageAdminPermission(req.user) &&
    !(await isSignageOrganizationInService(serviceKey, organizationId))
  ) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SIGNAGE_STORE_REQUIRED',
      message: 'You do not have access to this store',
    });
  }

  // Set context
  req.signageContext = {
    role: 'store',
    serviceKey,
    organizationId,
    permissions: [`signage:store:${organizationId}`],
  };

  next();
};

/**
 * Middleware: Allow Signage Store Read (for global content)
 *
 * Less strict than requireSignageStore - allows read access
 * to global content without full store permission.
 *
 * Use for:
 * - /api/signage/:serviceKey/global/* routes (read-only)
 */
export const allowSignageStoreRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const serviceKey = getSignageServiceKey(req);

  if (!(await hasSignageServiceMembership(req.user, serviceKey))) {
    return denySignageMembership(res, serviceKey);
  }

  const organizationId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    (req.user as any)?.organizationId;

  // For read access, we're more lenient
  // Just need to be authenticated and have some organization context
  if (!organizationId && !hasSignageAdminPermission(req.user) && !hasSignageOperatorPermission(req.user, serviceKey)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'ORGANIZATION_CONTEXT_REQUIRED',
      message: 'Organization context required for store users',
    });
  }

  // Set context based on highest permission level
  if (hasSignageAdminPermission(req.user)) {
    req.signageContext = {
      role: 'admin',
      serviceKey,
      permissions: ['signage:admin'],
    };
  } else if (hasSignageOperatorPermission(req.user, serviceKey)) {
    req.signageContext = {
      role: 'operator',
      serviceKey,
      permissions: [`signage:${serviceKey}:operator`],
    };
  } else {
    req.signageContext = {
      role: 'store',
      serviceKey,
      organizationId,
      permissions: [`signage:store:${organizationId}:read`],
    };
  }

  next();
};

/**
 * Middleware: Require Operator OR Store permission
 *
 * Use for shared routes that both Operator and Store can access
 * but with different data scopes.
 */
export const requireSignageOperatorOrStore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const serviceKey = getSignageServiceKey(req);

  if (!(await hasSignageServiceMembership(req.user, serviceKey))) {
    return denySignageMembership(res, serviceKey);
  }

  const organizationId =
    (req.headers['x-organization-id'] as string) ||
    (req.query.organizationId as string) ||
    req.body?.organizationId;

  // Check operator permission first
  if (hasSignageOperatorPermission(req.user, serviceKey)) {
    req.signageContext = {
      role: 'operator',
      serviceKey,
      permissions: [`signage:${serviceKey}:operator`],
    };
    return next();
  }

  // Check store permission (in-memory first, then DB fallback)
  if (organizationId) {
    let hasAccess = hasSignageStorePermission(req.user, organizationId);
    if (!hasAccess) {
      try {
        const rows = await AppDataSource.query(
          `SELECT 1 FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND role IN ('owner', 'admin', 'manager') AND left_at IS NULL LIMIT 1`,
          [(req.user as any).id || (req.user as any).userId, organizationId],
        );
        hasAccess = rows && rows.length > 0;
      } catch { /* fall through */ }
    }
    // WO-O4O-SIGNAGE-CROSS-SERVICE-ORGANIZATION-SCOPE-GUARD-V1
    // store branch 에만 적용한다. operator branch 는 위에서 이미 return 했으므로
    // organization scope 없이 접근하는 operator 계약은 영향을 받지 않는다.
    if (
      hasAccess &&
      !hasSignageAdminPermission(req.user) &&
      !(await isSignageOrganizationInService(serviceKey, organizationId))
    ) {
      hasAccess = false;
    }
    if (hasAccess) {
      req.signageContext = {
        role: 'store',
        serviceKey,
        organizationId,
        permissions: [`signage:store:${organizationId}`],
      };
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    code: 'SIGNAGE_ACCESS_DENIED',
    message: 'Operator or Store permission required',
  });
};

/**
 * Check if user has Community permission
 *
 * Accepts:
 * - 'community' role (legacy)
 * - '*:community' prefixed role (e.g., 'kpa:community')
 * - Any authenticated user (community is open contribution)
 * - Admin/Operator (always allowed)
 */
export function hasSignageCommunityPermission(user: any, serviceKey: string): boolean {
  if (!user) return false;

  // Admin can always act as community
  if (hasSignageAdminPermission(user)) return true;

  // Operator can also act as community
  if (hasSignageOperatorPermission(user, serviceKey)) return true;

  const userRoles: string[] = user.roles || [];

  // Check for exact 'community' role
  if (userRoles.includes('community')) return true;

  // Check for prefixed community role (e.g., 'kpa:community')
  if (userRoles.some((r: string) => r.endsWith(':community'))) return true;

  // Check database roles
  if (user.dbRoles?.some((r: any) => r.name === 'community' || r.name?.endsWith(':community'))) return true;

  // Community is open to any authenticated user with a service-related role
  // Check if user has any role for the service key
  if (userRoles.some((r: string) => r.startsWith(`${serviceKey}:`))) return true;

  // KPA prefix mapping: kpa-society → kpa (e.g., kpa:member, kpa:pharmacist)
  const rolePrefix = resolveRolePrefixFromCanonicalServiceKey(serviceKey);
  if (rolePrefix !== serviceKey && userRoles.some((r: string) => r.startsWith(`${rolePrefix}:`))) return true;

  return false;
}

/**
 * Check if user has Supplier permission
 *
 * Accepts:
 * - 'supplier' role (legacy)
 * - '*:supplier' prefixed role (e.g., 'neture:supplier')
 * - Admin/Operator (always allowed)
 */
export function hasSignageSupplierPermission(user: any, serviceKey: string): boolean {
  if (!user) return false;

  // Admin can always act as supplier
  if (hasSignageAdminPermission(user)) return true;

  // Operator can also act as supplier
  if (hasSignageOperatorPermission(user, serviceKey)) return true;

  const userRoles: string[] = user.roles || [];

  // Check for exact 'supplier' role
  if (userRoles.includes('supplier')) return true;

  // Check for prefixed supplier role (e.g., 'neture:supplier', 'kpa:supplier')
  if (userRoles.some((r: string) => r.endsWith(':supplier'))) return true;

  // Check database roles
  if (user.dbRoles?.some((r: any) => r.name === 'supplier' || r.name?.endsWith(':supplier'))) return true;

  return false;
}

/**
 * Middleware: Require Signage Community permission
 *
 * Use for:
 * - /api/signage/:serviceKey/community/* routes
 * - Community content creation (media, playlists)
 * - Created content is source='community', scope='global'
 */
export const requireSignageCommunity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const serviceKey = getSignageServiceKey(req);

  if (!serviceKey) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'SERVICE_KEY_REQUIRED',
      message: 'Service key is required',
    });
  }

  if (!hasSignageCommunityPermission(req.user, serviceKey)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SIGNAGE_COMMUNITY_REQUIRED',
      message: 'Community permission required',
    });
  }

  if (!(await hasSignageServiceMembership(req.user, serviceKey))) {
    return denySignageMembership(res, serviceKey);
  }

  // Set context
  req.signageContext = {
    role: 'operator', // Community acts at operator level for global content
    serviceKey,
    permissions: ['signage:community'],
  };

  next();
};

/**
 * Middleware: Require Signage Supplier permission
 *
 * Use for:
 * - /api/signage/:serviceKey/supplier/* routes
 * - Supplier content creation (media, playlists)
 * - Created content is source='supplier', scope='global'
 */
export const requireSignageSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    });
  }

  const serviceKey = getSignageServiceKey(req);

  if (!serviceKey) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'SERVICE_KEY_REQUIRED',
      message: 'Service key is required',
    });
  }

  if (!hasSignageSupplierPermission(req.user, serviceKey)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'SIGNAGE_SUPPLIER_REQUIRED',
      message: 'Supplier permission required',
    });
  }

  if (!(await hasSignageServiceMembership(req.user, serviceKey))) {
    return denySignageMembership(res, serviceKey);
  }

  // Set context
  req.signageContext = {
    role: 'operator', // Supplier acts at operator level for global content
    serviceKey,
    permissions: ['signage:supplier'],
  };

  next();
};

/**
 * Middleware: Validate service key from params
 *
 * Use as a pre-check before other role middlewares.
 */
export const validateServiceKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const rawServiceKey = req.params?.serviceKey;

  if (!rawServiceKey) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'SERVICE_KEY_REQUIRED',
      message: 'Service key is required in URL path',
    });
  }

  const canonical = canonicalizeSignageServiceKey(rawServiceKey);

  // WO-O4O-SIGNAGE-PLAYBACK-LOG-SECURITY-HARDENING-V1
  // 미등록 serviceKey 차단 — console.warn 후 통과 금지
  //
  // WO-O4O-KCOS-SIGNAGE-SERVICEKEY-CANONICALIZATION-V1
  //   허용 목록은 **canonical service key** 로만 유지한다.
  //   'cosmetics' / 'kpa' 처럼 역할 prefix 로 들어온 alias 는 여기서 canonical SSOT 로
  //   수렴된 뒤 판정된다 (둘 다 무조건 허용하는 것이 아니라, 하나의 key 로 정규화된다).
  //   'pharmacy' / 'tourism' / 'common' 은 canonical 대응이 없는 legacy key 이며
  //   본 WO 범위 밖이라 기존 동작을 그대로 유지한다.
  const validServiceKeys = ['pharmacy', 'k-cosmetics', 'tourism', 'common', 'kpa-society', 'neture', 'glycopharm'];
  if (!validServiceKeys.includes(canonical) && canonical !== 'test') {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      code: 'INVALID_SERVICE_KEY',
      message: `Invalid service key: ${rawServiceKey}`,
    });
  }

  next();
};
