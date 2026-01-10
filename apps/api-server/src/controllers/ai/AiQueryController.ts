/**
 * AI Query Controller
 * Phase 1 - AI 질의 API 엔드포인트
 *
 * Endpoints:
 * - POST /api/ai/query - AI 질의 처리
 * - GET /api/ai/usage - 일 사용량 조회
 * - GET /api/ai/policy - 정책 조회 (관리자)
 * - PUT /api/ai/policy - 정책 수정 (관리자)
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { aiQueryService, AiQueryRequest, AiQueryContextType } from '../../services/ai-query.service.js';
import logger from '../../utils/logger.js';

export class AiQueryController {
  /**
   * POST /api/ai/query
   * AI 질의 처리
   */
  query = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '로그인이 필요합니다.'
        });
      }

      const {
        question,
        contextType = 'free',
        contextId,
        contextData,
        // Phase 2: B2C 컨텍스트 정보
        serviceId,
        storeId,
        productId,
        categoryId,
        pageType
      } = req.body;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: '질문을 입력해주세요.'
        });
      }

      if (question.length > 2000) {
        return res.status(400).json({
          success: false,
          error: '질문은 2000자 이내로 입력해주세요.'
        });
      }

      // Validate contextType
      const validContextTypes: AiQueryContextType[] = ['service', 'free'];
      if (!validContextTypes.includes(contextType)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 contextType입니다.'
        });
      }

      // Check if user is paid (simplified - can be extended)
      const isPaidUser = req.user?.subscriptionStatus === 'active' || false;

      const request: AiQueryRequest = {
        userId,
        question: question.trim(),
        contextType,
        contextId: contextId || null,
        contextData: contextData || null,
        isPaidUser,
        // Phase 2: B2C 컨텍스트 정보
        serviceId,
        storeId,
        productId,
        categoryId,
        pageType
      };

      const response = await aiQueryService.query(request);

      if (!response.success) {
        const statusCode = response.errorCode === 'LIMIT_EXCEEDED' ? 429 : 500;
        return res.status(statusCode).json(response);
      }

      return res.json(response);

    } catch (error: any) {
      logger.error('AI Query Controller error:', error);
      return res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.'
      });
    }
  };

  /**
   * GET /api/ai/usage
   * 일 사용량 조회
   */
  getUsage = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '로그인이 필요합니다.'
        });
      }

      const isPaidUser = req.user?.subscriptionStatus === 'active' || false;
      const usage = await aiQueryService.getDailyUsage(userId, isPaidUser);

      return res.json({
        success: true,
        data: usage
      });

    } catch (error: any) {
      logger.error('AI Usage Controller error:', error);
      return res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.'
      });
    }
  };

  /**
   * GET /api/ai/history
   * 질문 히스토리 조회
   */
  getHistory = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '로그인이 필요합니다.'
        });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const { logs, total } = await aiQueryService.getUserLogs(userId, limit, offset);

      return res.json({
        success: true,
        data: {
          logs,
          total,
          limit,
          offset
        }
      });

    } catch (error: any) {
      logger.error('AI History Controller error:', error);
      return res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.'
      });
    }
  };

  /**
   * GET /api/ai/policy
   * 정책 조회 (관리자)
   */
  getPolicy = async (req: AuthRequest, res: Response) => {
    try {
      const policy = await aiQueryService.getPolicy();

      return res.json({
        success: true,
        data: {
          freeDailyLimit: policy.freeDailyLimit,
          paidDailyLimit: policy.paidDailyLimit,
          aiEnabled: policy.aiEnabled,
          defaultModel: policy.defaultModel,
          systemPrompt: policy.systemPrompt,
          updatedAt: policy.updatedAt
        }
      });

    } catch (error: any) {
      logger.error('AI Policy Get Controller error:', error);
      return res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.'
      });
    }
  };

  /**
   * PUT /api/ai/policy
   * 정책 수정 (관리자)
   */
  updatePolicy = async (req: AuthRequest, res: Response) => {
    try {
      const {
        freeDailyLimit,
        paidDailyLimit,
        aiEnabled,
        defaultModel,
        systemPrompt
      } = req.body;

      const updates: Record<string, any> = {};

      if (typeof freeDailyLimit === 'number' && freeDailyLimit >= 0) {
        updates.freeDailyLimit = freeDailyLimit;
      }
      if (typeof paidDailyLimit === 'number' && paidDailyLimit >= 0) {
        updates.paidDailyLimit = paidDailyLimit;
      }
      if (typeof aiEnabled === 'boolean') {
        updates.aiEnabled = aiEnabled;
      }
      if (typeof defaultModel === 'string') {
        updates.defaultModel = defaultModel;
      }
      if (typeof systemPrompt === 'string') {
        updates.systemPrompt = systemPrompt;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: '변경할 항목이 없습니다.'
        });
      }

      const policy = await aiQueryService.updatePolicy(updates);

      return res.json({
        success: true,
        data: {
          freeDailyLimit: policy.freeDailyLimit,
          paidDailyLimit: policy.paidDailyLimit,
          aiEnabled: policy.aiEnabled,
          defaultModel: policy.defaultModel,
          systemPrompt: policy.systemPrompt,
          updatedAt: policy.updatedAt
        }
      });

    } catch (error: any) {
      logger.error('AI Policy Update Controller error:', error);
      return res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다.'
      });
    }
  };
}

export const aiQueryController = new AiQueryController();
