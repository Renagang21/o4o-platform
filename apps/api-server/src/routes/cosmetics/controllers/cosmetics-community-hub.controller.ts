/**
 * Cosmetics Community Hub Controller
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Reuses CommunityHubService from KPA with SERVICE_CODE = 'cosmetics'.
 * Public: GET /community/ads, GET /community/sponsors
 * Operator: /community/manage/ads (CRUD), /community/manage/sponsors (CRUD)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { CommunityHubService } from '../../kpa/services/community-hub.service.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

const SERVICE_CODE = 'cosmetics';

export function createCosmeticsCommunityHubController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireCosmeticsScope: ScopeMiddleware,
): Router {
  const router = Router();
  const service = new CommunityHubService(dataSource);

  // ==================== Public Endpoints ====================

  // GET /community/ads?type=hero|page
  router.get(
    '/community/ads',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const type = req.query.type as string;
      if (type !== 'hero' && type !== 'page') {
        res.status(400).json({ success: false, error: 'INVALID_TYPE', message: 'type must be hero or page' });
        return;
      }
      const ads = await service.getActiveAds(SERVICE_CODE, type);
      res.json({ success: true, data: { ads } });
    }),
  );

  // GET /community/sponsors
  router.get(
    '/community/sponsors',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const sponsors = await service.getActiveSponsors(SERVICE_CODE);
      res.json({ success: true, data: { sponsors } });
    }),
  );

  // ==================== Operator Endpoints ====================

  // GET /community/manage/ads
  router.get(
    '/community/manage/ads',
    requireAuth as any,
    requireCosmeticsScope('cosmetics:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const type = req.query.type as string | undefined;
      const ads = await service.listAds(SERVICE_CODE, type);
      res.json({ success: true, data: { ads } });
    }),
  );

  // POST /community/manage/ads
  router.post(
    '/community/manage/ads',
    requireAuth as any,
    requireCosmeticsScope('cosmetics:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { type, title, imageUrl, linkUrl, startDate, endDate, displayOrder, isActive } = req.body;
      if (!type || !title || !imageUrl) {
        res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'type, title, imageUrl are required' });
        return;
      }
      const ad = await service.createAd({
        serviceCode: SERVICE_CODE, type, title, imageUrl, linkUrl, startDate, endDate, displayOrder, isActive,
      });
      res.status(201).json({ success: true, data: ad });
    }),
  );

  // PUT /community/manage/ads/:id
  router.put(
    '/community/manage/ads/:id',
    requireAuth as any,
    requireCosmeticsScope('cosmetics:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const updated = await service.updateAd(req.params.id, SERVICE_CODE, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Ad not found' });
        return;
      }
      res.json({ success: true, data: updated });
    }),
  );

  // DELETE /community/manage/ads/:id
  router.delete(
    '/community/manage/ads/:id',
    requireAuth as any,
    requireCosmeticsScope('cosmetics:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const deleted = await service.deleteAd(req.params.id, SERVICE_CODE);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Ad not found' });
        return;
      }
      res.json({ success: true });
    }),
  );

  // GET /community/manage/sponsors
  router.get(
    '/community/manage/sponsors',
    requireAuth as any,
    requireCosmeticsScope('cosmetics:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const sponsors = await service.listSponsors(SERVICE_CODE);
      res.json({ success: true, data: { sponsors } });
    }),
  );

  // POST /community/manage/sponsors
  router.post(
    '/community/manage/sponsors',
    requireAuth as any,
    requireCosmeticsScope('cosmetics:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { name, logoUrl, linkUrl, displayOrder, isActive } = req.body;
      if (!name || !logoUrl) {
        res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'name, logoUrl are required' });
        return;
      }
      const sponsor = await service.createSponsor({
        serviceCode: SERVICE_CODE, name, logoUrl, linkUrl, displayOrder, isActive,
      });
      res.status(201).json({ success: true, data: sponsor });
    }),
  );

  // PUT /community/manage/sponsors/:id
  router.put(
    '/community/manage/sponsors/:id',
    requireAuth as any,
    requireCosmeticsScope('cosmetics:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const updated = await service.updateSponsor(req.params.id, SERVICE_CODE, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Sponsor not found' });
        return;
      }
      res.json({ success: true, data: updated });
    }),
  );

  // DELETE /community/manage/sponsors/:id
  router.delete(
    '/community/manage/sponsors/:id',
    requireAuth as any,
    requireCosmeticsScope('cosmetics:operator') as any,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const deleted = await service.deleteSponsor(req.params.id, SERVICE_CODE);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Sponsor not found' });
        return;
      }
      res.json({ success: true });
    }),
  );

  return router;
}
