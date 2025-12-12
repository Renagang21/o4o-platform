/**
 * PartnerRoutineController
 *
 * 파트너 루틴 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type { PartnerRoutineService } from '../services/partner-routine.service';
import type { PartnerProfileService } from '../services/partner-profile.service';

export class PartnerRoutineController {
  constructor(
    private readonly service: PartnerRoutineService,
    private readonly profileService: PartnerProfileService
  ) {}

  /**
   * POST /api/v1/cosmetics-partner/routines
   * 루틴 생성
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const {
        title,
        description,
        routineType,
        visibility,
        skinTypes,
        skinConcerns,
        steps,
        thumbnailUrl,
      } = req.body;

      if (!title || !routineType || !steps || !Array.isArray(steps)) {
        res.status(400).json({ error: 'title, routineType, and steps are required' });
        return;
      }

      const routine = await this.service.createRoutine({
        partnerId: profile.id,
        title,
        description,
        routineType,
        visibility,
        skinTypes,
        skinConcerns,
        steps,
        thumbnailUrl,
      });

      res.status(201).json(routine);
    } catch (error) {
      console.error('[PartnerRoutineController] create error:', error);
      res.status(500).json({ error: 'Failed to create routine' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/routines
   * 내 루틴 목록 조회
   */
  async getMyRoutines(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const { routineType, isPublished, page, limit } = req.query;

      const result = await this.service.findByPartnerId(profile.id, {
        routineType: routineType as any,
        isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('[PartnerRoutineController] getMyRoutines error:', error);
      res.status(500).json({ error: 'Failed to get routines' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/routines/public
   * 공개 루틴 목록 조회
   */
  async getPublicRoutines(req: Request, res: Response): Promise<void> {
    try {
      const { skinType, skinConcern, routineType, page, limit } = req.query;

      const result = await this.service.findPublicRoutines({
        skinType: skinType as string,
        skinConcern: skinConcern as string,
        routineType: routineType as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('[PartnerRoutineController] getPublicRoutines error:', error);
      res.status(500).json({ error: 'Failed to get public routines' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/routines/:id
   * 특정 루틴 조회
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.service.findById(id);

      if (!routine) {
        res.status(404).json({ error: 'Routine not found' });
        return;
      }

      // 조회수 증가
      await this.service.incrementViewCount(id);

      res.json(routine);
    } catch (error) {
      console.error('[PartnerRoutineController] findById error:', error);
      res.status(500).json({ error: 'Failed to get routine' });
    }
  }

  /**
   * PUT /api/v1/cosmetics-partner/routines/:id
   * 루틴 업데이트
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        routineType,
        visibility,
        skinTypes,
        skinConcerns,
        steps,
        thumbnailUrl,
        isPublished,
        isFeatured,
      } = req.body;

      const updated = await this.service.updateRoutine(id, {
        title,
        description,
        routineType,
        visibility,
        skinTypes,
        skinConcerns,
        steps,
        thumbnailUrl,
        isPublished,
        isFeatured,
      });

      if (!updated) {
        res.status(404).json({ error: 'Routine not found' });
        return;
      }

      res.json(updated);
    } catch (error) {
      console.error('[PartnerRoutineController] update error:', error);
      res.status(500).json({ error: 'Failed to update routine' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/routines/:id/publish
   * 루틴 발행
   */
  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.service.publishRoutine(id);

      if (!routine) {
        res.status(404).json({ error: 'Routine not found' });
        return;
      }

      res.json(routine);
    } catch (error) {
      console.error('[PartnerRoutineController] publish error:', error);
      res.status(500).json({ error: 'Failed to publish routine' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/routines/:id/unpublish
   * 루틴 발행 취소
   */
  async unpublish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.service.unpublishRoutine(id);

      if (!routine) {
        res.status(404).json({ error: 'Routine not found' });
        return;
      }

      res.json(routine);
    } catch (error) {
      console.error('[PartnerRoutineController] unpublish error:', error);
      res.status(500).json({ error: 'Failed to unpublish routine' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/routines/:id/like
   * 좋아요
   */
  async like(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.incrementLikeCount(id);
      res.json({ success: true });
    } catch (error) {
      console.error('[PartnerRoutineController] like error:', error);
      res.status(500).json({ error: 'Failed to like routine' });
    }
  }

  /**
   * POST /api/v1/cosmetics-partner/routines/:id/save
   * 저장
   */
  async save(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.incrementSaveCount(id);
      res.json({ success: true });
    } catch (error) {
      console.error('[PartnerRoutineController] save error:', error);
      res.status(500).json({ error: 'Failed to save routine' });
    }
  }

  /**
   * GET /api/v1/cosmetics-partner/routines/stats
   * 내 루틴 통계 조회
   */
  async getMyStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await this.profileService.findByUserId(userId);

      if (!profile) {
        res.status(404).json({ error: 'Partner profile not found' });
        return;
      }

      const stats = await this.service.getRoutineStats(profile.id);
      res.json(stats);
    } catch (error) {
      console.error('[PartnerRoutineController] getMyStats error:', error);
      res.status(500).json({ error: 'Failed to get routine stats' });
    }
  }

  /**
   * DELETE /api/v1/cosmetics-partner/routines/:id
   * 루틴 삭제
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.json({ success: true });
    } catch (error) {
      console.error('[PartnerRoutineController] delete error:', error);
      res.status(500).json({ error: 'Failed to delete routine' });
    }
  }
}
