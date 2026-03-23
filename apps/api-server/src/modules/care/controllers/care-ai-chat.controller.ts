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
      const userId = pcReq.user?.id;

      // Patient scope guard: verify patient belongs to this pharmacy
      if (patientId && pharmacyId) {
        // Primary: organization_id match
        const check = await dataSource.query(
          `SELECT id, organization_id, pharmacist_id FROM glucoseview_customers WHERE id = $1 LIMIT 1`,
          [patientId],
        );
        if (check.length === 0) {
          console.warn('[CareAiChat] scope-guard: patient not found at all', { patientId, pharmacyId, userId });
          return res.status(403).json({
            success: false,
            error: { code: 'PATIENT_NOT_IN_PHARMACY', message: 'Patient not found in your pharmacy' },
          });
        }
        const patient = check[0];
        const orgMatch = patient.organization_id === pharmacyId;
        // Fallback: pharmacist_id → organization mapping (for patients with NULL organization_id)
        const pharmacistFallback = !orgMatch && patient.pharmacist_id === userId;

        if (!orgMatch && !pharmacistFallback) {
          console.warn('[CareAiChat] scope-guard: ownership mismatch', {
            patientId,
            pharmacyId,
            patientOrgId: patient.organization_id,
            pharmacistId: patient.pharmacist_id,
            userId,
          });
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

      // Gemini API errors — return 502 with specific detail
      if (msg.includes('Gemini API error') || msg.includes('AI_CHAT_FAILED')) {
        console.error('[CareAiChat] Gemini provider error:', msg);
        return res.status(502).json({
          success: false,
          error: { code: 'AI_PROVIDER_ERROR', message: 'AI provider returned an error. Please try again later.' },
        });
      }

      // Gemini timeout
      if (msg.includes('timeout')) {
        console.error('[CareAiChat] Gemini timeout:', msg);
        return res.status(504).json({
          success: false,
          error: { code: 'AI_TIMEOUT', message: 'AI response timed out. Please try again.' },
        });
      }

      console.error('[CareAiChat] endpoint error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'AI_CHAT_ERROR', message: 'AI chat processing failed' },
      });
    }
  });

  // ══════════════════════════════════════════════════════════
  // POST /ai-chat/stream — SSE Streaming (WO-O4O-AI-STREAMING-SSE-IMPLEMENTATION-V1)
  // ══════════════════════════════════════════════════════════
  router.post('/ai-chat/stream', authenticate, requirePharmacyContext, async (req, res) => {
    const pcReq = req as PharmacyContextRequest;
    const { message, patientId } = req.body;

    // Input validation (동일)
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
    const userId = pcReq.user?.id;

    // Patient scope guard (동일)
    if (patientId && pharmacyId) {
      const check = await dataSource.query(
        `SELECT id, organization_id, pharmacist_id FROM glucoseview_customers WHERE id = $1 LIMIT 1`,
        [patientId],
      );
      if (check.length === 0) {
        return res.status(403).json({
          success: false,
          error: { code: 'PATIENT_NOT_IN_PHARMACY', message: 'Patient not found in your pharmacy' },
        });
      }
      const patient = check[0];
      const orgMatch = patient.organization_id === pharmacyId;
      const pharmacistFallback = !orgMatch && patient.pharmacist_id === userId;
      if (!orgMatch && !pharmacistFallback) {
        return res.status(403).json({
          success: false,
          error: { code: 'PATIENT_NOT_IN_PHARMACY', message: 'Patient not found in your pharmacy' },
        });
      }
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const { event, data } of chatService.chatStream(message.trim(), pharmacyId, patientId || null)) {
        res.write(`event: ${event}\ndata: ${data}\n\n`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[CareAiChat] stream error:', msg);
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'STREAM_ERROR', message: msg })}\n\n`);
      res.write(`event: done\ndata: \n\n`);
    }

    res.end();
  });

  return router;
}
