/**
 * Partner Authentication Middleware
 *
 * Phase 10: Security hardening for cosmetics-partner-extension
 * - Validates user authentication
 * - Resolves partnerId from authenticated user
 * - Attaches partner info to request
 */

import type { Request, Response, NextFunction } from 'express';
import type { Repository } from 'typeorm';
import type { PartnerProfile } from '../entities/partner-profile.entity.js';

/**
 * User interface (from auth system)
 */
interface User {
  id: string;
  role: string;
  email?: string;
  permissions?: string[];
}

/**
 * Extended request with partner info
 */
export interface PartnerAuthenticatedRequest extends Request {
  user?: User | any;
  partnerId?: string;
  partnerProfile?: PartnerProfile;
}

/**
 * Partner permissions
 */
export const PartnerPermissions = {
  VIEW_EARNINGS: 'partner:view_earnings',
  MANAGE_EARNINGS: 'partner:manage_earnings',
  VIEW_LINKS: 'partner:view_links',
  MANAGE_LINKS: 'partner:manage_links',
  VIEW_ROUTINES: 'partner:view_routines',
  MANAGE_ROUTINES: 'partner:manage_routines',
  ADMIN: 'partner:admin',
} as const;

/**
 * Create partner authentication middleware
 *
 * This middleware:
 * 1. Checks if user is authenticated (req.user exists)
 * 2. Looks up PartnerProfile by userId
 * 3. Attaches partnerId and partnerProfile to request
 *
 * @param profileRepository - TypeORM repository for PartnerProfile
 */
export function createRequirePartnerAuth(profileRepository: Repository<PartnerProfile>) {
  return async (
    req: PartnerAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errorCode: 'AUTH_REQUIRED',
        });
        return;
      }

      const userId = req.user.id;

      // Admin can access all partner data
      if (req.user.role === 'admin') {
        // For admin, allow passing partnerId as query param for specific partner access
        const targetPartnerId = req.params.partnerId || req.query.partnerId as string;
        if (targetPartnerId) {
          const profile = await profileRepository.findOne({ where: { id: targetPartnerId } });
          if (profile) {
            req.partnerId = profile.id;
            req.partnerProfile = profile;
          }
        }
        next();
        return;
      }

      // For regular users, look up their partner profile
      const partnerProfile = await profileRepository.findOne({
        where: { userId },
      });

      if (!partnerProfile) {
        res.status(403).json({
          success: false,
          message: 'Partner profile not found for this user',
          errorCode: 'PARTNER_NOT_FOUND',
        });
        return;
      }

      if (partnerProfile.status !== 'active') {
        res.status(403).json({
          success: false,
          message: `Partner account is ${partnerProfile.status}`,
          errorCode: 'PARTNER_INACTIVE',
        });
        return;
      }

      // Attach partner info to request
      req.partnerId = partnerProfile.id;
      req.partnerProfile = partnerProfile;

      next();
    } catch (error: any) {
      console.error('[PartnerAuthMiddleware] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify partner authentication',
        errorCode: 'AUTH_ERROR',
      });
    }
  };
}

/**
 * Require specific partner permission
 */
export function requirePartnerPermission(permission: string) {
  return (req: PartnerAuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Admin has all permissions
    if (user.role === 'admin') {
      next();
      return;
    }

    // Check explicit permissions
    if (user.permissions?.includes(permission)) {
      next();
      return;
    }

    // Partner role has default partner permissions
    if (user.role === 'partner') {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Permission denied: ${permission} required`,
    });
  };
}
