/**
 * Store Events Controller
 *
 * WO-O4O-STORE-EVENT-MINIMAL-V1
 *
 * 매장 이벤트 CRUD (Display Domain).
 *
 * GET    /pharmacy/events            — 이벤트 목록 (org 필터)
 * POST   /pharmacy/events            — 이벤트 생성
 * PUT    /pharmacy/events/:id        — 이벤트 수정
 * DELETE /pharmacy/events/:id        — soft-delete (is_active=false)
 *
 * 인증: requireAuth + store owner 체크
 * 조직: organization_members 기반 자동 결정
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { StoreEvent } from '../../platform/entities/store-event.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

export function createStoreEventsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const eventRepo = dataSource.getRepository(StoreEvent);

  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /pharmacy/events — 이벤트 목록 ─────────────────────────
  router.get(
    '/pharmacy/events',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;

      const events = await eventRepo.find({
        where: { organizationId },
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      });

      res.json({ success: true, data: events });
    }),
  );

  // ─── POST /pharmacy/events — 이벤트 생성 ────────────────────────
  router.post(
    '/pharmacy/events',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { title, description, imageUrl, startDate, endDate, sortOrder } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title is required' },
        });
        return;
      }

      const event = eventRepo.create({
        organizationId,
        title: title.trim(),
        description: description || null,
        imageUrl: imageUrl || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        isActive: true,
      });

      const saved = await eventRepo.save(event);
      res.status(201).json({ success: true, data: saved });
    }),
  );

  // ─── PUT /pharmacy/events/:id — 이벤트 수정 ────────────────────
  router.put(
    '/pharmacy/events/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const event = await eventRepo.findOne({
        where: { id, organizationId },
      });

      if (!event) {
        res.status(404).json({
          success: false,
          error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' },
        });
        return;
      }

      const { title, description, imageUrl, startDate, endDate, sortOrder, isActive } = req.body;

      if (title !== undefined) event.title = String(title).trim();
      if (description !== undefined) event.description = description;
      if (imageUrl !== undefined) event.imageUrl = imageUrl;
      if (startDate !== undefined) event.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) event.endDate = endDate ? new Date(endDate) : null;
      if (typeof sortOrder === 'number') event.sortOrder = sortOrder;
      if (typeof isActive === 'boolean') event.isActive = isActive;

      const saved = await eventRepo.save(event);
      res.json({ success: true, data: saved });
    }),
  );

  // ─── DELETE /pharmacy/events/:id — soft-delete ──────────────────
  router.delete(
    '/pharmacy/events/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const event = await eventRepo.findOne({
        where: { id, organizationId },
      });

      if (!event) {
        res.status(404).json({
          success: false,
          error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' },
        });
        return;
      }

      event.isActive = false;
      await eventRepo.save(event);

      res.json({ success: true, message: 'Event deactivated' });
    }),
  );

  return router;
}
