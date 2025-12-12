/**
 * Supplier Profile Controller
 *
 * 공급사 프로필 관리 API
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { SupplierProfileService } from '../services/supplier-profile.service';

export function createSupplierProfileController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SupplierProfileService(dataSource);

  /**
   * GET /profile/me
   * 내 공급사 프로필 조회
   */
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profile = await service.getMyProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: 'Supplier profile not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error getting supplier profile:', error);
      res.status(500).json({ error: 'Failed to get supplier profile' });
    }
  });

  /**
   * POST /profile
   * 공급사 프로필 생성
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profile = await service.create({
        ...req.body,
        userId,
      });

      res.status(201).json(profile);
    } catch (error: any) {
      console.error('Error creating supplier profile:', error);
      if (error.message === 'User already has a supplier profile') {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create supplier profile' });
    }
  });

  /**
   * GET /profile/:id
   * 특정 공급사 프로필 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const profile = await service.findById(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: 'Supplier profile not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error getting supplier profile:', error);
      res.status(500).json({ error: 'Failed to get supplier profile' });
    }
  });

  /**
   * PATCH /profile/:id
   * 공급사 프로필 수정
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const profile = await service.update(req.params.id, req.body);
      if (!profile) {
        return res.status(404).json({ error: 'Supplier profile not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error updating supplier profile:', error);
      res.status(500).json({ error: 'Failed to update supplier profile' });
    }
  });

  /**
   * GET /profile
   * 공급사 목록 조회 (Admin)
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { status, tier, search } = req.query;

      const profiles = await service.findAll({
        status: status as any,
        tier: tier as any,
        search: search as string,
      });

      res.json(profiles);
    } catch (error) {
      console.error('Error listing supplier profiles:', error);
      res.status(500).json({ error: 'Failed to list supplier profiles' });
    }
  });

  /**
   * PATCH /profile/:id/status
   * 공급사 상태 변경 (Admin)
   */
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const approvedBy = (req as any).user?.id;

      const profile = await service.updateStatus(req.params.id, status, approvedBy);
      if (!profile) {
        return res.status(404).json({ error: 'Supplier profile not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error updating supplier status:', error);
      res.status(500).json({ error: 'Failed to update supplier status' });
    }
  });

  /**
   * PATCH /profile/:id/tier
   * 공급사 등급 변경 (Admin)
   */
  router.patch('/:id/tier', async (req: Request, res: Response) => {
    try {
      const { tier } = req.body;

      const profile = await service.updateTier(req.params.id, tier);
      if (!profile) {
        return res.status(404).json({ error: 'Supplier profile not found' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error updating supplier tier:', error);
      res.status(500).json({ error: 'Failed to update supplier tier' });
    }
  });

  /**
   * GET /profile/top/list
   * 상위 공급사 목록
   */
  router.get('/top/list', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const suppliers = await service.getTopSuppliers(limit);
      res.json(suppliers);
    } catch (error) {
      console.error('Error getting top suppliers:', error);
      res.status(500).json({ error: 'Failed to get top suppliers' });
    }
  });

  /**
   * DELETE /profile/:id
   * 공급사 프로필 삭제 (Admin)
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Supplier profile not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting supplier profile:', error);
      res.status(500).json({ error: 'Failed to delete supplier profile' });
    }
  });

  return router;
}
