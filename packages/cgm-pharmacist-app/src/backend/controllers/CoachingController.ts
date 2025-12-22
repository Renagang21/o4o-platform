/**
 * Coaching Controller
 *
 * 상담/코칭 관리 API 엔드포인트
 */

import type { Request, Response } from 'express';
import { coachingService } from '../services/CoachingService.js';
import type { CreateCoachingSessionRequest } from '../dto/index.js';

export class CoachingController {
  /**
   * GET /api/v1/cgm-pharmacist/patients/:patientId/coaching
   * 환자의 코칭 세션 목록 조회
   */
  async getCoachingSessions(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const sessions = await coachingService.getCoachingSessions(patientId);
      res.json({ sessions });
    } catch (error) {
      console.error('[CoachingController] getCoachingSessions error:', error);
      res.status(500).json({ error: 'Failed to get coaching sessions' });
    }
  }

  /**
   * GET /api/v1/cgm-pharmacist/patients/:patientId/coaching/:sessionId
   * 코칭 세션 상세 조회
   */
  async getCoachingSession(req: Request, res: Response): Promise<void> {
    try {
      const { patientId, sessionId } = req.params;
      const session = await coachingService.getCoachingSession(patientId, sessionId);

      if (!session) {
        res.status(404).json({ error: 'Coaching session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('[CoachingController] getCoachingSession error:', error);
      res.status(500).json({ error: 'Failed to get coaching session' });
    }
  }

  /**
   * POST /api/v1/cgm-pharmacist/patients/:patientId/coaching
   * 코칭 세션 생성
   */
  async createCoachingSession(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const request: CreateCoachingSessionRequest = {
        ...req.body,
        patientId,
      };

      const session = await coachingService.createCoachingSession(request);
      res.status(201).json(session);
    } catch (error) {
      console.error('[CoachingController] createCoachingSession error:', error);
      res.status(500).json({ error: 'Failed to create coaching session' });
    }
  }

  /**
   * POST /api/v1/cgm-pharmacist/patients/:patientId/coaching/:sessionId/complete
   * 코칭 세션 완료 처리
   */
  async completeCoachingSession(req: Request, res: Response): Promise<void> {
    try {
      const { patientId, sessionId } = req.params;
      const { duration } = req.body;

      const session = await coachingService.completeCoachingSession(
        patientId,
        sessionId,
        duration
      );

      if (!session) {
        res.status(404).json({ error: 'Coaching session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('[CoachingController] completeCoachingSession error:', error);
      res.status(500).json({ error: 'Failed to complete coaching session' });
    }
  }

  /**
   * POST /api/v1/cgm-pharmacist/patients/:patientId/coaching/:sessionId/notes
   * 코칭 메모 추가
   */
  async addCoachingNote(req: Request, res: Response): Promise<void> {
    try {
      const { patientId, sessionId } = req.params;
      const { content, category, isPrivate } = req.body;

      const session = await coachingService.addCoachingNote(
        patientId,
        sessionId,
        content,
        category,
        isPrivate ?? false
      );

      if (!session) {
        res.status(404).json({ error: 'Coaching session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('[CoachingController] addCoachingNote error:', error);
      res.status(500).json({ error: 'Failed to add coaching note' });
    }
  }
}

export const coachingController = new CoachingController();
