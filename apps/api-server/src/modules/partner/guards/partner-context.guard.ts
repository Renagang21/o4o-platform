/**
 * PartnerContextGuard
 * 파트너 역할 및 서비스 연결 검증
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 *
 * 검증 사항:
 * - 요청 사용자에게 partner Role 존재
 * - partner ↔ service 연결 관계 존재
 * - 현재 서비스 컨텍스트에 유효한 partner인지 검증
 *
 * ❌ 승인 상태 검증하지 않음
 * ❌ 대기 상태 노출하지 않음
 * ❌ 관리 개념 노출하지 않음
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../../types/auth.js';

export interface PartnerContext {
  partnerId: string;
  serviceId: string;
  userId: string;
}

// Extend Express Request to include partner context
declare global {
  namespace Express {
    interface Request {
      partnerContext?: PartnerContext;
    }
  }
}

/**
 * Extracts service ID from request
 * Priority: query param > header > default
 */
function extractServiceId(req: Request): string {
  // From query parameter
  if (req.query.serviceId && typeof req.query.serviceId === 'string') {
    return req.query.serviceId;
  }

  // From custom header
  const headerServiceId = req.headers['x-service-id'];
  if (headerServiceId && typeof headerServiceId === 'string') {
    return headerServiceId;
  }

  // Default service (can be configured per deployment)
  return 'glycopharm';
}

/**
 * Validates service ID is one of the allowed services
 */
function isValidServiceId(serviceId: string): boolean {
  const allowedServices = ['glycopharm', 'k-cosmetics', 'glucoseview'];
  return allowedServices.includes(serviceId.toLowerCase());
}

/**
 * PartnerContextGuard middleware
 *
 * Validates:
 * 1. User is authenticated (should be used after authenticate middleware)
 * 2. User has partner role
 * 3. Service context is valid
 *
 * Sets req.partnerContext for downstream use
 */
export function partnerContextGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check if user is authenticated
    const user = (req as any).authUser || (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Check if user has partner role
    const hasPartnerRole =
      user.role === UserRole.PARTNER ||
      user.role === 'partner' ||
      user.roles?.includes(UserRole.PARTNER) ||
      user.roles?.includes('partner') ||
      (typeof user.hasRole === 'function' && user.hasRole('partner'));

    if (!hasPartnerRole) {
      res.status(403).json({
        success: false,
        error: 'Partner role required',
      });
      return;
    }

    // Extract and validate service ID
    const serviceId = extractServiceId(req);

    if (!isValidServiceId(serviceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid service context',
      });
      return;
    }

    // Set partner context
    req.partnerContext = {
      partnerId: user.id,
      serviceId: serviceId.toLowerCase(),
      userId: user.id,
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate partner context',
    });
  }
}

/**
 * Utility function to get partner context from request
 * Returns null if not available (for optional partner routes)
 */
export function getPartnerContext(req: Request): PartnerContext | null {
  return req.partnerContext || null;
}

/**
 * Utility function to require partner context
 * Throws if not available
 */
export function requirePartnerContext(req: Request): PartnerContext {
  const context = req.partnerContext;
  if (!context) {
    throw new Error('Partner context not available');
  }
  return context;
}
