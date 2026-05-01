/**
 * requireSurveyOwner — 작성자 또는 admin 검증
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 */

import type { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { Survey } from '@o4o/lms-core';

export async function requireSurveyOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const roles: string[] = (req as any).user?.roles ?? [];
    const surveyId = (req.params as any).id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'login required' });
      return;
    }
    if (!surveyId) {
      res.status(400).json({ success: false, error: 'survey id missing' });
      return;
    }

    // admin/super_admin 통과
    if (roles.includes('platform:super_admin') || roles.some((r) => r.endsWith(':admin'))) {
      next();
      return;
    }

    const survey = await AppDataSource.getRepository(Survey).findOne({
      where: { id: surveyId },
      select: ['id', 'createdBy', 'ownerId'] as any,
    });
    if (!survey) {
      res.status(404).json({ success: false, error: 'Survey not found' });
      return;
    }
    if (survey.createdBy === userId || survey.ownerId === userId) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'You can only modify your own surveys' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'internal error' });
  }
}
