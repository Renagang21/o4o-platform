/**
 * Event Controller
 *
 * WO-O4O-REQUEST-EVENT-CONNECTION-PHASE2A
 *
 * API endpoints for recording and querying Glycopharm events:
 * - POST /events - Record event + auto-evaluate promotion to Request
 * - GET /events - List events for pharmacy (auth required)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import {
  GlycopharmEvent,
  type GlycopharmEventType,
  type GlycopharmEventSourceType,
  type GlycopharmEventPurpose,
} from '../entities/glycopharm-event.entity.js';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
import { EventPromotionService } from '../services/event-promotion.service.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;

/** Valid event types (O4O-EXPOSURE-EVENT-DEFINITION-V1) */
const VALID_EVENT_TYPES: GlycopharmEventType[] = ['impression', 'click', 'qr_scan'];

/** Valid source types */
const VALID_SOURCE_TYPES: GlycopharmEventSourceType[] = ['qr', 'tablet', 'web', 'signage', 'print'];

/** Valid purposes (O4O-QR-PURPOSE-DEFINITION-V1) */
const VALID_PURPOSES: GlycopharmEventPurpose[] = ['info', 'survey', 'sample', 'consultation', 'order', 'event'];

/** Event creation DTO */
interface CreateEventDto {
  pharmacyId: string;
  eventType: GlycopharmEventType;
  sourceType: GlycopharmEventSourceType;
  sourceId?: string;
  purpose?: GlycopharmEventPurpose;
  metadata?: Record<string, any>;
}

/** Event list query params */
interface ListEventsQuery {
  eventType?: string;
  sourceType?: string;
  fromDate?: string;
  toDate?: string;
  page?: string;
  pageSize?: string;
}

/**
 * Create Event Controller
 */
export function createEventController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const promotionService = new EventPromotionService(dataSource);
  const pharmacyRepo = dataSource.getRepository(OrganizationStore);
  const eventRepo = dataSource.getRepository(GlycopharmEvent);

  /**
   * POST /events
   * Record an event and auto-evaluate promotion to Request
   * Public endpoint (no auth required — events come from QR, tablet, signage)
   */
  router.post('/events', async (req: Request, res: Response): Promise<void> => {
    try {
      const body: CreateEventDto = req.body;

      // Validation: pharmacyId
      if (!body.pharmacyId) {
        res.status(400).json({
          success: false,
          error: 'pharmacyId is required',
          code: 'MISSING_PHARMACY_ID',
        });
        return;
      }

      // Validation: eventType
      if (!body.eventType || !VALID_EVENT_TYPES.includes(body.eventType)) {
        res.status(400).json({
          success: false,
          error: `Invalid eventType. Valid values: ${VALID_EVENT_TYPES.join(', ')}`,
          code: 'INVALID_EVENT_TYPE',
        });
        return;
      }

      // Validation: sourceType
      if (!body.sourceType || !VALID_SOURCE_TYPES.includes(body.sourceType)) {
        res.status(400).json({
          success: false,
          error: `Invalid sourceType. Valid values: ${VALID_SOURCE_TYPES.join(', ')}`,
          code: 'INVALID_SOURCE_TYPE',
        });
        return;
      }

      // Validation: purpose (optional, but must be valid if provided)
      if (body.purpose && !VALID_PURPOSES.includes(body.purpose)) {
        res.status(400).json({
          success: false,
          error: `Invalid purpose. Valid values: ${VALID_PURPOSES.join(', ')}`,
          code: 'INVALID_PURPOSE',
        });
        return;
      }

      // 1. Record event (always)
      const event = await promotionService.recordEvent({
        pharmacyId: body.pharmacyId,
        eventType: body.eventType,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        purpose: body.purpose,
        metadata: body.metadata,
      });

      // 2. Evaluate promotion (conditional)
      const promotionResult = await promotionService.evaluateAndPromote(event);

      res.status(201).json({
        success: true,
        data: {
          eventId: event.id,
          eventType: event.eventType,
          promoted: promotionResult.promoted,
          ...(promotionResult.requestId && { requestId: promotionResult.requestId }),
        },
      });
    } catch (error: any) {
      console.error('Failed to record event:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * GET /events
   * List events for the authenticated user's pharmacy
   * Requires authentication (pharmacy staff)
   */
  router.get('/events', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Find pharmacy owned by user
      const pharmacy = await pharmacyRepo.findOne({
        where: { created_by_user_id: userId },
      });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: 'Pharmacy not found for this user',
          code: 'PHARMACY_NOT_FOUND',
        });
        return;
      }

      const query = req.query as ListEventsQuery;
      const page = parseInt(query.page || '1');
      const pageSize = Math.min(parseInt(query.pageSize || '50'), 100);

      // Build query
      const qb = eventRepo
        .createQueryBuilder('event')
        .where('event.pharmacy_id = :pharmacyId', { pharmacyId: pharmacy.id });

      // Event type filter
      if (query.eventType) {
        qb.andWhere('event.event_type = :eventType', { eventType: query.eventType });
      }

      // Source type filter
      if (query.sourceType) {
        qb.andWhere('event.source_type = :sourceType', { sourceType: query.sourceType });
      }

      // Date range filter
      if (query.fromDate) {
        qb.andWhere('event.created_at >= :fromDate', { fromDate: query.fromDate });
      }
      if (query.toDate) {
        qb.andWhere('event.created_at <= :toDate', { toDate: query.toDate });
      }

      // Get total count
      const total = await qb.getCount();

      // Apply pagination and get results
      const events = await qb
        .orderBy('event.created_at', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .getMany();

      // Map to response
      const items = events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        purpose: e.purpose,
        promoted: !!e.promotedToRequestId,
        promotedToRequestId: e.promotedToRequestId,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      }));

      res.json({
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error: any) {
      console.error('Failed to list events:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}
