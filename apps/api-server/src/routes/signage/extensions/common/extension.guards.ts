/**
 * Signage Extension - Role Guards
 *
 * WO-SIGNAGE-PHASE3-DEV-FOUNDATION
 *
 * Extension 전용 Role Guard 미들웨어
 * Core Signage Role Guard와 연계하여 Extension별 권한 제어
 */

import type { Request, Response, NextFunction } from 'express';
import type { ExtensionType } from './extension.types.js';
import { extensionRegistry } from './extension.config.js';
import { ExtensionErrorCodes } from './extension.types.js';

// ============================================================================
// EXTENSION ROLE DEFINITIONS
// ============================================================================

/**
 * Extension Role 정의
 * 형식: signage:{extension}:{role}
 */
export const ExtensionRoles = {
  // Pharmacy
  PHARMACY_OPERATOR: 'signage:pharmacy:operator',
  PHARMACY_STORE: 'signage:pharmacy:store',

  // Cosmetics
  COSMETICS_OPERATOR: 'signage:cosmetics:operator',
  COSMETICS_STORE: 'signage:cosmetics:store',

  // Seller
  SELLER_PARTNER: 'signage:seller:partner',
  SELLER_ADMIN: 'signage:seller:admin',

  // Tourist
  TOURIST_OPERATOR: 'signage:tourist:operator',
  TOURIST_STORE: 'signage:tourist:store',
} as const;

/**
 * Extension별 Operator Role 매핑
 */
const EXTENSION_OPERATOR_ROLES: Record<ExtensionType, string> = {
  pharmacy: ExtensionRoles.PHARMACY_OPERATOR,
  cosmetics: ExtensionRoles.COSMETICS_OPERATOR,
  seller: ExtensionRoles.SELLER_ADMIN,
  tourist: ExtensionRoles.TOURIST_OPERATOR,
};

/**
 * Extension별 Store Role 매핑
 */
const EXTENSION_STORE_ROLES: Record<ExtensionType, string> = {
  pharmacy: ExtensionRoles.PHARMACY_STORE,
  cosmetics: ExtensionRoles.COSMETICS_STORE,
  seller: ExtensionRoles.SELLER_PARTNER,
  tourist: ExtensionRoles.TOURIST_STORE,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * 사용자 Role 확인
 */
function hasRole(user: any, role: string): boolean {
  if (!user?.roles) {
    return false;
  }

  // roles가 배열인 경우
  if (Array.isArray(user.roles)) {
    return user.roles.some((r: any) => {
      if (typeof r === 'string') return r === role;
      if (r?.name) return r.name === role;
      return false;
    });
  }

  return false;
}

/**
 * Core Signage Operator 여부 확인
 */
function isCoreSignageOperator(user: any): boolean {
  return hasRole(user, 'signage:operator') || hasRole(user, 'admin');
}

/**
 * Core Signage Store 여부 확인
 */
function isCoreSignageStore(user: any): boolean {
  return hasRole(user, 'signage:store');
}

/**
 * Extension Error Response
 */
function sendExtensionError(
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string,
  extension?: ExtensionType
): void {
  res.status(statusCode).json({
    error: errorCode,
    message,
    statusCode,
    extension,
  });
}

// ============================================================================
// EXTENSION AVAILABILITY GUARD
// ============================================================================

/**
 * Extension 활성화 확인 미들웨어 Factory
 */
export function requireExtensionEnabled(extensionType: ExtensionType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!extensionRegistry.isEnabled(extensionType)) {
      sendExtensionError(
        res,
        503,
        ExtensionErrorCodes.EXT_DISABLED,
        `Extension '${extensionType}' is currently disabled`,
        extensionType
      );
      return;
    }

    // organizationId가 있으면 조직별 확인
    const organizationId = (req as any).organizationId || (req as any).user?.organizationId;
    if (organizationId && !extensionRegistry.isEnabledForOrganization(extensionType, organizationId)) {
      sendExtensionError(
        res,
        503,
        ExtensionErrorCodes.EXT_DISABLED,
        `Extension '${extensionType}' is not enabled for this organization`,
        extensionType
      );
      return;
    }

    // Extension 타입을 request에 저장
    (req as any).extensionType = extensionType;
    next();
  };
}

// ============================================================================
// EXTENSION ROLE GUARDS
// ============================================================================

/**
 * Extension Operator 권한 확인 미들웨어 Factory
 *
 * Core Operator 또는 Extension Operator 허용
 */
export function requireExtensionOperator(extensionType: ExtensionType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      sendExtensionError(res, 401, 'UNAUTHORIZED', 'Authentication required', extensionType);
      return;
    }

    // Core Signage Operator는 모든 Extension 접근 가능
    if (isCoreSignageOperator(user)) {
      (req as any).extensionRole = 'operator';
      next();
      return;
    }

    // Extension별 Operator Role 확인
    const requiredRole = EXTENSION_OPERATOR_ROLES[extensionType];
    if (hasRole(user, requiredRole)) {
      (req as any).extensionRole = 'operator';
      next();
      return;
    }

    sendExtensionError(
      res,
      403,
      ExtensionErrorCodes.EXT_FORBIDDEN,
      `Operator access required for '${extensionType}' extension`,
      extensionType
    );
  };
}

/**
 * Extension Store 권한 확인 미들웨어 Factory
 *
 * Store 전용 기능 접근 (Operator도 허용)
 */
export function requireExtensionStore(extensionType: ExtensionType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      sendExtensionError(res, 401, 'UNAUTHORIZED', 'Authentication required', extensionType);
      return;
    }

    // Operator는 Store 기능도 접근 가능
    if (isCoreSignageOperator(user)) {
      (req as any).extensionRole = 'operator';
      next();
      return;
    }

    // Extension별 Operator Role
    const operatorRole = EXTENSION_OPERATOR_ROLES[extensionType];
    if (hasRole(user, operatorRole)) {
      (req as any).extensionRole = 'operator';
      next();
      return;
    }

    // Core Store 또는 Extension Store
    if (isCoreSignageStore(user)) {
      (req as any).extensionRole = 'store';
      next();
      return;
    }

    const storeRole = EXTENSION_STORE_ROLES[extensionType];
    if (hasRole(user, storeRole)) {
      (req as any).extensionRole = 'store';
      next();
      return;
    }

    sendExtensionError(
      res,
      403,
      ExtensionErrorCodes.EXT_FORBIDDEN,
      `Store access required for '${extensionType}' extension`,
      extensionType
    );
  };
}

/**
 * Extension Store 읽기 전용 접근 허용 미들웨어 Factory
 *
 * Global Content 조회 등 Store가 읽기만 가능한 경우
 */
export function allowExtensionStoreRead(extensionType: ExtensionType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      sendExtensionError(res, 401, 'UNAUTHORIZED', 'Authentication required', extensionType);
      return;
    }

    // 모든 Signage 관련 Role 허용
    if (
      isCoreSignageOperator(user) ||
      isCoreSignageStore(user) ||
      hasRole(user, EXTENSION_OPERATOR_ROLES[extensionType]) ||
      hasRole(user, EXTENSION_STORE_ROLES[extensionType])
    ) {
      (req as any).extensionRole = isCoreSignageOperator(user) ? 'operator' : 'store';
      next();
      return;
    }

    sendExtensionError(
      res,
      403,
      ExtensionErrorCodes.EXT_FORBIDDEN,
      `Access denied for '${extensionType}' extension`,
      extensionType
    );
  };
}

// ============================================================================
// SELLER-SPECIFIC GUARDS
// ============================================================================

/**
 * Seller Partner 권한 확인 미들웨어
 *
 * Partner가 자신의 콘텐츠만 접근 가능
 */
export function requireSellerPartner(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (!user) {
    sendExtensionError(res, 401, 'UNAUTHORIZED', 'Authentication required', 'seller');
    return;
  }

  // Admin은 모든 Partner 콘텐츠 접근 가능
  if (isCoreSignageOperator(user) || hasRole(user, ExtensionRoles.SELLER_ADMIN)) {
    (req as any).extensionRole = 'admin';
    next();
    return;
  }

  // Partner는 자신의 콘텐츠만
  if (hasRole(user, ExtensionRoles.SELLER_PARTNER)) {
    (req as any).extensionRole = 'partner';
    (req as any).sellerId = user.partnerId || user.id; // Partner ID 설정
    next();
    return;
  }

  sendExtensionError(
    res,
    403,
    ExtensionErrorCodes.EXT_FORBIDDEN,
    'Partner access required for seller extension',
    'seller'
  );
}

/**
 * Seller Admin 권한 확인 미들웨어
 *
 * 승인/관리 기능용
 */
export function requireSellerAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;

  if (!user) {
    sendExtensionError(res, 401, 'UNAUTHORIZED', 'Authentication required', 'seller');
    return;
  }

  if (isCoreSignageOperator(user) || hasRole(user, ExtensionRoles.SELLER_ADMIN)) {
    (req as any).extensionRole = 'admin';
    next();
    return;
  }

  sendExtensionError(
    res,
    403,
    ExtensionErrorCodes.EXT_FORBIDDEN,
    'Admin access required for seller approval',
    'seller'
  );
}

// ============================================================================
// COMBINED GUARD FACTORY
// ============================================================================

/**
 * Extension Guard 조합 Factory
 *
 * 여러 Guard를 조합하여 사용
 */
export function createExtensionGuards(extensionType: ExtensionType) {
  return {
    enabled: requireExtensionEnabled(extensionType),
    operator: requireExtensionOperator(extensionType),
    store: requireExtensionStore(extensionType),
    storeRead: allowExtensionStoreRead(extensionType),
  };
}
