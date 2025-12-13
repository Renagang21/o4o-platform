/**
 * PartnerOps Routines Controller
 *
 * 파트너 루틴(콘텐츠) 컨트롤러
 *
 * @package @o4o/partnerops
 */

import { Request, Response } from 'express';
import type { RoutineService } from '../services/RoutineService.js';
import type { ApiResponseDto, CreateRoutineDto, UpdateRoutineDto } from '../dto/index.js';

export class RoutinesController {
  constructor(private routineService: RoutineService) {}

  /**
   * GET /partnerops/routines
   * 루틴 목록 조회
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const routines = await this.routineService.list(partnerId, {
        status: req.query.status as string | undefined,
        productType: req.query.productType as string | undefined,
      });

      const response: ApiResponseDto<typeof routines> = {
        success: true,
        data: routines,
      };
      res.json(response);
    } catch (error: any) {
      console.error('List routines error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/routines/:id
   * 루틴 상세 조회
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const routineId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const routine = await this.routineService.getById(partnerId, routineId);

      if (!routine) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Routine not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof routine> = {
        success: true,
        data: routine,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Get routine error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /partnerops/routines
   * 루틴 생성
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const dto: CreateRoutineDto = {
        title: req.body.title,
        description: req.body.description,
        productIds: req.body.productIds || [],
        productType: req.body.productType,
      };

      const routine = await this.routineService.create(partnerId, dto);

      const response: ApiResponseDto<typeof routine> = {
        success: true,
        data: routine,
        message: 'Routine created successfully',
      };
      res.status(201).json(response);
    } catch (error: any) {
      console.error('Create routine error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * PUT /partnerops/routines/:id
   * 루틴 수정
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const routineId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const dto: UpdateRoutineDto = {
        title: req.body.title,
        description: req.body.description,
        productIds: req.body.productIds,
        status: req.body.status,
      };

      const routine = await this.routineService.update(partnerId, routineId, dto);

      if (!routine) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Routine not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof routine> = {
        success: true,
        data: routine,
        message: 'Routine updated successfully',
      };
      res.json(response);
    } catch (error: any) {
      console.error('Update routine error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * DELETE /partnerops/routines/:id
   * 루틴 삭제
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const routineId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const deleted = await this.routineService.delete(partnerId, routineId);

      if (!deleted) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Routine not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<null> = {
        success: true,
        message: 'Routine deleted successfully',
      };
      res.json(response);
    } catch (error: any) {
      console.error('Delete routine error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /partnerops/routines/:id/publish
   * 루틴 발행
   */
  async publish(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const routineId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const routine = await this.routineService.publish(partnerId, routineId);

      if (!routine) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Routine not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof routine> = {
        success: true,
        data: routine,
        message: 'Routine published successfully',
      };
      res.json(response);
    } catch (error: any) {
      console.error('Publish routine error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * POST /partnerops/routines/:id/archive
   * 루틴 아카이브
   */
  async archive(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;
      const routineId = req.params.id;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const routine = await this.routineService.archive(partnerId, routineId);

      if (!routine) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Routine not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto<typeof routine> = {
        success: true,
        data: routine,
        message: 'Routine archived successfully',
      };
      res.json(response);
    } catch (error: any) {
      console.error('Archive routine error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }
}

export default RoutinesController;
