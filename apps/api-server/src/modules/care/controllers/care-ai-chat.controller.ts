import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CareAiChatService } from '../services/llm/care-ai-chat.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { createPharmacyContextMiddleware } from '../care-pharmacy-context.middleware.js';
import type { PharmacyContextRequest } from '../care-pharmacy-context.middleware.js';

/**
 * Care AI Chat Controller — WO-GLYCOPHARM-CARE-AI-CHAT-SYSTEM-V1
 *
 * POST /ai-chat — Care Copilot 질의
 *   body: { message: string, patientId?: string }
 */
export function createCareAiChatRouter(dataSource: DataSource): Router {
  const router = Router();
  const chatService = new CareAiChatService(dataSource);
  const requirePharmacyContext = createPharmacyContextMiddleware(dataSource);

  router.post('/ai-chat', authenticate, requirePharmacyContext, async (req, res) => {
    try {
      const pcReq = req as PharmacyContextRequest;
      const { message, patientId } = req.body;

      // Input validation
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_MESSAGE', message: 'Message is required' },
        });
      }

      if (message.length > 500) {
        return res.status(400).json({
          success: false,
          error: { code: 'MESSAGE_TOO_LONG', message: 'Message must be 500 characters or less' },
        });
      }

      const pharmacyId = pcReq.pharmacyId ?? null;

      // Patient scope guard: verify patient belongs to this pharmacy
      if (patientId && pharmacyId) {
        const check = await dataSource.query(
          `SELECT id FROM glucoseview_customers WHERE id = $1 AND organization_id = $2 LIMIT 1`,
          [patientId, pharmacyId],
        );
        if (check.length === 0) {
          return res.status(403).json({
            success: false,
            error: { code: 'PATIENT_NOT_IN_PHARMACY', message: 'Patient not found in your pharmacy' },
          });
        }
      }

      const result = await chatService.chat(message.trim(), pharmacyId, patientId || null);

      res.json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          error: { code: 'AI_NOT_CONFIGURED', message: 'AI service is not configured' },
        });
      }

      console.error('[CareAiChat] endpoint error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'AI_CHAT_ERROR', message: 'AI chat processing failed', debug: msg },
      });
    }
  });

  return router;
}
