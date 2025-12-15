/**
 * AI Routine Generator Controller
 *
 * Phase 6-F: Influencer Tools Expansion
 * POST /api/v1/partner/ai/routine - AI 기반 스킨케어 루틴 생성
 * GET /api/v1/partner/ai/routine/templates - 루틴 템플릿 목록
 */

import { Request, Response } from 'express';
import { AIRoutineService, GenerateRoutineDto } from '../services/ai-routine.service.js';

export class AIRoutineController {
  constructor(private aiRoutineService: AIRoutineService) {}

  /**
   * Generate AI-powered skincare routine
   * POST /ai/routine
   */
  async generateRoutine(req: Request, res: Response): Promise<void> {
    try {
      const dto: GenerateRoutineDto = req.body;

      // Validate required fields
      if (!dto.skinTypes || dto.skinTypes.length === 0) {
        res.status(400).json({
          success: false,
          error: 'skinTypes is required and must not be empty',
        });
        return;
      }

      if (!dto.concerns || dto.concerns.length === 0) {
        res.status(400).json({
          success: false,
          error: 'concerns is required and must not be empty',
        });
        return;
      }

      const routine = await this.aiRoutineService.generateRoutine(dto);

      res.status(200).json({
        success: true,
        data: routine,
      });
    } catch (error) {
      console.error('Error generating routine:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate routine',
      });
    }
  }

  /**
   * Get routine templates for quick generation
   * GET /ai/routine/templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await this.aiRoutineService.getRoutineTemplates();

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch templates',
      });
    }
  }
}
