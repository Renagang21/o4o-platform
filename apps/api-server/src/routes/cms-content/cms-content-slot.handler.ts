/**
 * CMS Content Slot Handler — Slot management endpoints
 *
 * WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1
 * Extracted from cms-content.routes.ts
 *
 * WO-P3-CMS-SLOT-MANAGEMENT-P1: Slot CRUD and content assignment
 * WO-P7-CMS-SLOT-LOCK-P1: Slot lock fields for edit restrictions
 * WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: Operator access with serviceKey scope
 *
 * Endpoints:
 *   GET    /slots/:slotKey          — Get content by slot key (public)
 *   GET    /slots                   — List all slots (admin/operator)
 *   POST   /slots                   — Create slot (admin/operator)
 *   PUT    /slots/:id               — Update slot (admin/operator, locked check)
 *   DELETE /slots/:id               — Delete slot (admin/operator, locked check)
 *   PUT    /slots/:slotKey/contents — Assign contents to slot (admin/operator)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { type DataSource, In } from 'typeorm';
import { CmsContent, CmsContentSlot } from '@o4o-apps/cms-core';
import { optionalAuth, requireAuth } from '../../middleware/auth.middleware.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import logger from '../../utils/logger.js';

// ============================================================================
// WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: Operator scope infrastructure
// ============================================================================

/**
 * Mapping: security-core scope prefix → CMS serviceKey values
 *
 * CmsContentSlot.serviceKey uses full names (kpa-society, k-cosmetics)
 * while security-core roles use short prefixes (kpa, cosmetics).
 */
const SCOPE_TO_CMS_KEYS: Record<string, string[]> = {
  kpa: ['kpa-society', 'kpa'],
  cosmetics: ['k-cosmetics', 'cosmetics'],
  neture: ['neture'],
  glycopharm: ['glycopharm'],
  glucoseview: ['glucoseview'],
};

const KNOWN_PREFIXES = Object.keys(SCOPE_TO_CMS_KEYS);
const PLATFORM_ADMIN_ROLES = ['platform:admin', 'platform:super_admin'];
const OPERATOR_SUFFIXES = [':admin', ':operator'];

/** Slot access context attached to request by requireSlotAccess middleware */
interface SlotAccess {
  isAdmin: boolean;
  /** CMS serviceKey values this operator can manage. Empty for admin (unrestricted). */
  allowedCmsKeys: string[];
}

interface SlotAuthRequest extends Request {
  slotAccess?: SlotAccess;
  user?: any;
}

/**
 * Extract CMS serviceKeys that a user's roles allow managing.
 * e.g., ['kpa:operator'] → ['kpa-society', 'kpa']
 * e.g., ['cosmetics:admin'] → ['k-cosmetics', 'cosmetics']
 */
function extractAllowedCmsKeys(roles: string[]): string[] {
  const keys: string[] = [];
  for (const role of roles) {
    for (const prefix of KNOWN_PREFIXES) {
      for (const suffix of OPERATOR_SUFFIXES) {
        if (role === `${prefix}${suffix}`) {
          const mapped = SCOPE_TO_CMS_KEYS[prefix];
          if (mapped) {
            for (const k of mapped) {
              if (!keys.includes(k)) keys.push(k);
            }
          }
        }
      }
    }
  }
  return keys;
}

/**
 * Middleware: require platform admin OR service operator.
 *
 * Must be chained after requireAuth.
 *
 * Admin (platform:admin, platform:super_admin):
 *   → slotAccess = { isAdmin: true, allowedCmsKeys: [] }
 *
 * Operator ({service}:admin, {service}:operator):
 *   → slotAccess = { isAdmin: false, allowedCmsKeys: ['kpa-society', ...] }
 */
const requireSlotAccess = async (
  req: SlotAuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const userId = req.user.id;

  try {
    // Priority 1: Platform admin → full access
    const isAdmin = await roleAssignmentService.hasAnyRole(userId, PLATFORM_ADMIN_ROLES);
    if (isAdmin) {
      req.slotAccess = { isAdmin: true, allowedCmsKeys: [] };
      return next();
    }

    // Priority 2: Service operator → scoped access
    const userRoles: string[] = req.user.roles || [];
    const allowedCmsKeys = extractAllowedCmsKeys(userRoles);

    // Fallback: check role_assignments DB if runtime roles yielded nothing
    if (allowedCmsKeys.length === 0) {
      const dbAssignments = await roleAssignmentService.getActiveRoles(userId);
      const dbKeys = extractAllowedCmsKeys(dbAssignments.map(a => a.role));
      for (const k of dbKeys) {
        if (!allowedCmsKeys.includes(k)) allowedCmsKeys.push(k);
      }
    }

    if (allowedCmsKeys.length > 0) {
      req.slotAccess = { isAdmin: false, allowedCmsKeys };
      return next();
    }

    logger.warn('[requireSlotAccess] Access denied — no qualifying role', {
      userId,
      email: req.user.email,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: 'Admin or service operator role required for slot management',
      code: 'FORBIDDEN',
    });
  } catch (error) {
    logger.error('[requireSlotAccess] Error checking roles', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });

    return res.status(500).json({
      success: false,
      error: 'Error verifying access',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Check if operator can manage a slot with the given CMS serviceKey.
 * - Admin: always allowed
 * - Operator: must match allowedCmsKeys
 * - null serviceKey (global): admin only
 */
function canManageServiceKey(access: SlotAccess, cmsServiceKey: string | null): boolean {
  if (access.isAdmin) return true;
  if (!cmsServiceKey) return false;
  return access.allowedCmsKeys.includes(cmsServiceKey);
}

// ============================================================================
// Route factory
// ============================================================================

export function createCmsContentSlotRoutes(deps: {
  dataSource: DataSource;
}): Router {
  const router = Router();
  const { dataSource } = deps;

  /**
   * GET /cms/slots/:slotKey
   * Get content items assigned to a specific slot
   *
   * Public endpoint — no auth required.
   *
   * Query params:
   * - serviceKey: Filter by service
   * - organizationId: Filter by organization
   * - activeOnly: Only show currently active slots (default: true)
   */
  router.get('/slots/:slotKey', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slotKey } = req.params;
      const { serviceKey, organizationId, activeOnly = 'true' } = req.query;

      const slotRepo = dataSource.getRepository(CmsContentSlot);
      const now = new Date();

      // Build where clause
      const where: any = { slotKey };
      if (serviceKey) {
        where.serviceKey = serviceKey as string;
      }
      if (organizationId) {
        where.organizationId = organizationId as string;
      }
      if (activeOnly === 'true') {
        where.isActive = true;
      }

      // Get slots with content
      const slots = await slotRepo.find({
        where,
        relations: ['content'],
        order: { sortOrder: 'ASC' },
      });

      // Filter by time window if active
      const filteredSlots = activeOnly === 'true'
        ? slots.filter(slot => {
            const startsOk = !slot.startsAt || slot.startsAt <= now;
            const endsOk = !slot.endsAt || slot.endsAt >= now;
            const contentPublished = slot.content?.status === 'published';
            return startsOk && endsOk && contentPublished;
          })
        : slots;

      res.json({
        success: true,
        data: filteredSlots.map(slot => ({
          id: slot.id,
          slotKey: slot.slotKey,
          sortOrder: slot.sortOrder,
          isActive: slot.isActive,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          // Lock fields (WO-P7-CMS-SLOT-LOCK-P1)
          isLocked: slot.isLocked,
          lockedBy: slot.lockedBy,
          lockedReason: slot.lockedReason,
          lockedUntil: slot.lockedUntil,
          content: slot.content ? {
            id: slot.content.id,
            type: slot.content.type,
            title: slot.content.title,
            summary: slot.content.summary,
            imageUrl: slot.content.imageUrl,
            linkUrl: slot.content.linkUrl,
            linkText: slot.content.linkText,
            metadata: slot.content.metadata,
          } : null,
        })),
        meta: {
          slotKey,
          serviceKey: serviceKey || null,
          organizationId: organizationId || null,
          total: filteredSlots.length,
        },
      });
    } catch (error: any) {
      console.error('Failed to get CMS content slots:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /cms/slots
   * List all slots with optional filters (admin/operator)
   *
   * WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1:
   * - Admin: sees all slots (optionally filtered by serviceKey)
   * - Operator: sees only their service's slots (serviceKey forced)
   *
   * Query params:
   * - serviceKey: Filter by service
   * - slotKey: Filter by specific slot key
   * - isActive: Filter by active status
   */
  router.get('/slots', requireAuth, requireSlotAccess, async (req: SlotAuthRequest, res: Response): Promise<void> => {
    try {
      const { serviceKey, slotKey, isActive } = req.query;
      const slotRepo = dataSource.getRepository(CmsContentSlot);
      const access = req.slotAccess!;

      const where: any = {};

      // Operator: force serviceKey filter to their allowed keys
      if (!access.isAdmin) {
        if (serviceKey) {
          // Operator specified a serviceKey — validate it's within their scope
          if (!access.allowedCmsKeys.includes(serviceKey as string)) {
            res.status(403).json({
              success: false,
              error: { code: 'SERVICE_SCOPE_DENIED', message: `Not authorized to manage slots for service: ${serviceKey}` },
            });
            return;
          }
          where.serviceKey = serviceKey as string;
        } else {
          // No serviceKey specified — restrict to operator's allowed keys
          where.serviceKey = In(access.allowedCmsKeys);
        }
      } else {
        // Admin: optional serviceKey filter
        if (serviceKey) {
          where.serviceKey = serviceKey as string;
        }
      }

      if (slotKey) {
        where.slotKey = slotKey as string;
      }
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const slots = await slotRepo.find({
        where,
        relations: ['content'],
        order: { slotKey: 'ASC', sortOrder: 'ASC' },
      });

      // Group slots by slotKey for better organization
      const slotGroups: Record<string, typeof slots> = {};
      for (const slot of slots) {
        if (!slotGroups[slot.slotKey]) {
          slotGroups[slot.slotKey] = [];
        }
        slotGroups[slot.slotKey].push(slot);
      }

      res.json({
        success: true,
        data: slots.map(slot => ({
          id: slot.id,
          slotKey: slot.slotKey,
          serviceKey: slot.serviceKey,
          organizationId: slot.organizationId,
          contentId: slot.contentId,
          content: slot.content ? {
            id: slot.content.id,
            type: slot.content.type,
            title: slot.content.title,
            status: slot.content.status,
          } : null,
          sortOrder: slot.sortOrder,
          isActive: slot.isActive,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          // Lock fields (WO-P7-CMS-SLOT-LOCK-P1)
          isLocked: slot.isLocked,
          lockedBy: slot.lockedBy,
          lockedReason: slot.lockedReason,
          lockedUntil: slot.lockedUntil,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
        })),
        meta: {
          total: slots.length,
          slotKeys: Object.keys(slotGroups),
        },
      });
    } catch (error: any) {
      console.error('Failed to list CMS slots:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /cms/slots
   * Create a new slot (admin/operator)
   *
   * WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1:
   * - Admin: can create with any serviceKey (including null for global)
   * - Operator: must provide serviceKey matching their scope; cannot create global slots
   */
  router.post('/slots', requireAuth, requireSlotAccess, async (req: SlotAuthRequest, res: Response): Promise<void> => {
    try {
      const {
        slotKey,
        serviceKey,
        organizationId,
        contentId,
        sortOrder = 0,
        isActive = true,
        startsAt,
        endsAt,
      } = req.body;
      const access = req.slotAccess!;

      // Validate required fields
      if (!slotKey || !contentId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'slotKey and contentId are required' },
        });
        return;
      }

      // WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: serviceKey scope check
      if (!access.isAdmin) {
        if (!serviceKey) {
          res.status(403).json({
            success: false,
            error: { code: 'SERVICE_KEY_REQUIRED', message: 'Operators must provide a serviceKey when creating slots' },
          });
          return;
        }
        if (!canManageServiceKey(access, serviceKey)) {
          res.status(403).json({
            success: false,
            error: { code: 'SERVICE_SCOPE_DENIED', message: `Not authorized to create slots for service: ${serviceKey}` },
          });
          return;
        }
      }

      // Verify content exists
      const contentRepo = dataSource.getRepository(CmsContent);
      const content = await contentRepo.findOne({ where: { id: contentId } });
      if (!content) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Content not found' },
        });
        return;
      }

      const slotRepo = dataSource.getRepository(CmsContentSlot);

      const slot = slotRepo.create({
        slotKey,
        serviceKey: serviceKey || null,
        organizationId: organizationId || null,
        contentId,
        sortOrder,
        isActive,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      });

      const saved = await slotRepo.save(slot);

      // Reload with content relation
      const result = await slotRepo.findOne({
        where: { id: saved.id },
        relations: ['content'],
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Failed to create CMS slot:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /cms/slots/:id
   * Update a slot (admin/operator)
   *
   * WO-P7-CMS-SLOT-LOCK-P1: Locked slots cannot be edited
   * WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1:
   * - Admin: full update including lock fields
   * - Operator: cannot modify lock fields; cannot modify serviceKey; target slot must be in scope
   */
  router.put('/slots/:id', requireAuth, requireSlotAccess, async (req: SlotAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        slotKey,
        serviceKey,
        contentId,
        sortOrder,
        isActive,
        startsAt,
        endsAt,
        // Lock fields - platform admin only
        isLocked,
        lockedBy,
        lockedReason,
        lockedUntil,
      } = req.body;
      const access = req.slotAccess!;

      const slotRepo = dataSource.getRepository(CmsContentSlot);

      const slot = await slotRepo.findOne({ where: { id } });
      if (!slot) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Slot not found' },
        });
        return;
      }

      // WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: serviceKey scope check
      if (!canManageServiceKey(access, slot.serviceKey)) {
        res.status(403).json({
          success: false,
          error: { code: 'SERVICE_SCOPE_DENIED', message: `Not authorized to manage slots for service: ${slot.serviceKey}` },
        });
        return;
      }

      // WO-P7-CMS-SLOT-LOCK-P1: Check if slot is locked
      const isModifyingLockFields = isLocked !== undefined || lockedBy !== undefined ||
                                     lockedReason !== undefined || lockedUntil !== undefined;
      const isModifyingContentFields = slotKey !== undefined || serviceKey !== undefined ||
                                        contentId !== undefined || sortOrder !== undefined ||
                                        isActive !== undefined || startsAt !== undefined ||
                                        endsAt !== undefined;

      // WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: operators cannot modify lock fields
      if (!access.isAdmin && isModifyingLockFields) {
        res.status(403).json({
          success: false,
          error: { code: 'LOCK_ADMIN_ONLY', message: 'Only platform admins can modify lock fields' },
        });
        return;
      }

      // WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: operators cannot change serviceKey
      if (!access.isAdmin && serviceKey !== undefined && serviceKey !== slot.serviceKey) {
        res.status(403).json({
          success: false,
          error: { code: 'SERVICE_KEY_IMMUTABLE', message: 'Operators cannot change the serviceKey of an existing slot' },
        });
        return;
      }

      if (slot.isLocked && isModifyingContentFields && !isModifyingLockFields) {
        res.status(403).json({
          success: false,
          error: {
            code: 'SLOT_LOCKED',
            message: slot.lockedReason || 'This slot is locked and cannot be edited',
            lockedBy: slot.lockedBy,
            lockedUntil: slot.lockedUntil,
          },
        });
        return;
      }

      // Verify content if being changed
      if (contentId && contentId !== slot.contentId) {
        const contentRepo = dataSource.getRepository(CmsContent);
        const content = await contentRepo.findOne({ where: { id: contentId } });
        if (!content) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Content not found' },
          });
          return;
        }
        slot.contentId = contentId;
      }

      // Update fields
      if (slotKey !== undefined) slot.slotKey = slotKey;
      if (serviceKey !== undefined) slot.serviceKey = serviceKey;
      if (sortOrder !== undefined) slot.sortOrder = sortOrder;
      if (isActive !== undefined) slot.isActive = isActive;
      if (startsAt !== undefined) slot.startsAt = startsAt ? new Date(startsAt) : null;
      if (endsAt !== undefined) slot.endsAt = endsAt ? new Date(endsAt) : null;

      // Lock fields (platform admin only — guard above)
      if (isLocked !== undefined) slot.isLocked = isLocked;
      if (lockedBy !== undefined) slot.lockedBy = lockedBy;
      if (lockedReason !== undefined) slot.lockedReason = lockedReason;
      if (lockedUntil !== undefined) slot.lockedUntil = lockedUntil ? new Date(lockedUntil) : null;

      await slotRepo.save(slot);

      // Reload with content relation
      const result = await slotRepo.findOne({
        where: { id: slot.id },
        relations: ['content'],
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Failed to update CMS slot:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * DELETE /cms/slots/:id
   * Delete a slot (admin/operator)
   *
   * WO-P7-CMS-SLOT-LOCK-P1: Locked slots cannot be deleted
   * WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: operator must own the slot's serviceKey
   */
  router.delete('/slots/:id', requireAuth, requireSlotAccess, async (req: SlotAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const access = req.slotAccess!;
      const slotRepo = dataSource.getRepository(CmsContentSlot);

      const slot = await slotRepo.findOne({ where: { id } });
      if (!slot) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Slot not found' },
        });
        return;
      }

      // WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: serviceKey scope check
      if (!canManageServiceKey(access, slot.serviceKey)) {
        res.status(403).json({
          success: false,
          error: { code: 'SERVICE_SCOPE_DENIED', message: `Not authorized to manage slots for service: ${slot.serviceKey}` },
        });
        return;
      }

      // WO-P7-CMS-SLOT-LOCK-P1: Check if slot is locked
      if (slot.isLocked) {
        res.status(403).json({
          success: false,
          error: {
            code: 'SLOT_LOCKED',
            message: slot.lockedReason || 'This slot is locked and cannot be deleted',
            lockedBy: slot.lockedBy,
            lockedUntil: slot.lockedUntil,
          },
        });
        return;
      }

      await slotRepo.remove(slot);

      res.json({
        success: true,
        message: 'Slot deleted successfully',
      });
    } catch (error: any) {
      console.error('Failed to delete CMS slot:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * PUT /cms/slots/:slotKey/contents
   * Assign contents to a slot (admin/operator)
   *
   * This replaces all contents in a slot with the provided list.
   * Useful for reordering or bulk assignment.
   *
   * WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1:
   * - Admin: can assign with any serviceKey
   * - Operator: must provide serviceKey matching their scope
   *
   * Body: {
   *   serviceKey?: string,
   *   contents: Array<{ contentId: string, sortOrder: number, isActive?: boolean, startsAt?: string, endsAt?: string }>
   * }
   */
  router.put('/slots/:slotKey/contents', requireAuth, requireSlotAccess, async (req: SlotAuthRequest, res: Response): Promise<void> => {
    try {
      const { slotKey } = req.params;
      const { serviceKey, organizationId, contents } = req.body;
      const access = req.slotAccess!;

      if (!Array.isArray(contents)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'contents must be an array' },
        });
        return;
      }

      // WO-O4O-PROMOTION-SLOT-API-OPERATOR-V1: serviceKey scope check
      if (!access.isAdmin) {
        if (!serviceKey) {
          res.status(403).json({
            success: false,
            error: { code: 'SERVICE_KEY_REQUIRED', message: 'Operators must provide a serviceKey when assigning slot contents' },
          });
          return;
        }
        if (!canManageServiceKey(access, serviceKey)) {
          res.status(403).json({
            success: false,
            error: { code: 'SERVICE_SCOPE_DENIED', message: `Not authorized to manage slots for service: ${serviceKey}` },
          });
          return;
        }
      }

      const slotRepo = dataSource.getRepository(CmsContentSlot);
      const contentRepo = dataSource.getRepository(CmsContent);

      // Validate all content IDs exist
      const contentIds = contents.map((c: any) => c.contentId);
      if (contentIds.length > 0) {
        const existingContents = await contentRepo.find({
          where: { id: In(contentIds) },
        });
        if (existingContents.length !== contentIds.length) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'One or more contents not found' },
          });
          return;
        }
      }

      // Build scope condition
      const scopeWhere: any = { slotKey };
      if (serviceKey) {
        scopeWhere.serviceKey = serviceKey;
      }
      if (organizationId) {
        scopeWhere.organizationId = organizationId;
      }

      // Delete existing slots for this slotKey/scope
      await slotRepo.delete(scopeWhere);

      // Create new slots
      const newSlots = contents.map((c: any, index: number) => {
        return slotRepo.create({
          slotKey,
          serviceKey: serviceKey || null,
          organizationId: organizationId || null,
          contentId: c.contentId,
          sortOrder: c.sortOrder ?? index,
          isActive: c.isActive ?? true,
          startsAt: c.startsAt ? new Date(c.startsAt) : null,
          endsAt: c.endsAt ? new Date(c.endsAt) : null,
        });
      });

      const savedSlots = await slotRepo.save(newSlots);

      // Reload with content relations
      const result = await slotRepo.find({
        where: scopeWhere,
        relations: ['content'],
        order: { sortOrder: 'ASC' },
      });

      res.json({
        success: true,
        data: result,
        meta: {
          slotKey,
          serviceKey: serviceKey || null,
          total: result.length,
        },
      });
    } catch (error: any) {
      console.error('Failed to assign contents to slot:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
