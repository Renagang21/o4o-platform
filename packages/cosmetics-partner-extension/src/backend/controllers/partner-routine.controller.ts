/**
 * PartnerRoutineController
 *
 * 파트너 루틴 추천 관리 API 컨트롤러
 */

import type { Request, Response } from 'express';
import type {
  PartnerRoutineService,
  CreatePartnerRoutineDto,
  UpdatePartnerRoutineDto,
  RoutineFilter,
} from '../services/partner-routine.service.js';

export class PartnerRoutineController {
  constructor(private readonly routineService: PartnerRoutineService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreatePartnerRoutineDto = req.body;
      const routine = await this.routineService.createRoutine(dto);
      res.status(201).json({ success: true, data: routine });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.routineService.findById(id);
      if (!routine) {
        res.status(404).json({ success: false, message: 'Partner routine not found' });
        return;
      }
      res.json({ success: true, data: routine });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findByPartnerId(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const routines = await this.routineService.findByPartnerId(partnerId);
      res.json({ success: true, data: routines });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async findPublic(req: Request, res: Response): Promise<void> {
    try {
      const filter: RoutineFilter = {
        routineType: req.query.routineType as any,
        skinType: req.query.skinType as string,
        skinConcern: req.query.skinConcern as string,
      };
      const routines = await this.routineService.findPublicRoutines(filter);
      res.json({ success: true, data: routines });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdatePartnerRoutineDto = req.body;
      const routine = await this.routineService.updateRoutine(id, dto);
      res.json({ success: true, data: routine });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.routineService.publishRoutine(id);
      res.json({ success: true, data: routine });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async unpublish(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.routineService.unpublishRoutine(id);
      res.json({ success: true, data: routine });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async incrementView(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.routineService.incrementViewCount(id);
      res.json({ success: true, data: routine });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async like(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.routineService.incrementLikeCount(id);
      res.json({ success: true, data: routine });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async unlike(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.routineService.decrementLikeCount(id);
      res.json({ success: true, data: routine });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      const stats = await this.routineService.getRoutineStats(partnerId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getTrending(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const routines = await this.routineService.getTrendingRoutines(limit);
      res.json({ success: true, data: routines });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.routineService.delete(id);
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
