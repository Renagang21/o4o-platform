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

      // WO-GLYCOPHARM-CARE-AI-CHAT-ERROR-HANDLING-FIX-V1: includes 기반 매칭
      if (msg.includes('AI_NOT_CONFIGURED') || msg.includes('not configured')) {
        console.error('[CareAiChat] AI not configured:', msg);
        return res.status(503).json({
          success: false,
          error: { code: 'AI_NOT_CONFIGURED', message: 'AI 서비스가 설정되지 않았습니다.' },
        });
      }

      // Gemini timeout
      if (msg.includes('timeout')) {
        console.error('[CareAiChat] Gemini timeout:', msg);
        return res.status(504).json({
          success: false,
          error: { code: 'AI_TIMEOUT', message: 'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.' },
        });
      }

      // Gemini empty response / parse failure / provider failure
      if (msg.includes('empty response') || msg.includes('no candidates') || msg.includes('JSON parse failed') || msg.includes('provider failed')) {
        console.error('[CareAiChat] Gemini response error:', msg);
        return res.status(502).json({
          success: false,
          error: { code: 'AI_RESPONSE_ERROR', message: 'AI 응답 처리 중 문제가 발생했습니다. 다시 시도해 주세요.' },
        });
      }

      // Gemini API HTTP errors (4xx/5xx)
      if (msg.includes('Gemini API error') || msg.includes('AI_CHAT_FAILED')) {
        console.error('[CareAiChat] Gemini provider error:', msg);
        return res.status(502).json({
          success: false,
          error: { code: 'AI_PROVIDER_ERROR', message: 'AI 서비스에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
        });
      }

      console.error('[CareAiChat] unexpected error:', msg, error);
      res.status(500).json({
        success: false,
        error: { code: 'AI_CHAT_ERROR', message: 'AI 채팅 처리 중 예기치 않은 오류가 발생했습니다.' },
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
      // WO-GLYCOPHARM-CARE-AI-CHAT-ERROR-HANDLING-FIX-V1: classify stream errors
      const code = msg.includes('AI_NOT_CONFIGURED') || msg.includes('not configured') ? 'AI_NOT_CONFIGURED'
        : msg.includes('timeout') ? 'AI_TIMEOUT'
        : msg.includes('empty response') || msg.includes('no candidates') || msg.includes('JSON parse failed') || msg.includes('provider failed') ? 'AI_RESPONSE_ERROR'
        : msg.includes('Gemini API error') ? 'AI_PROVIDER_ERROR'
        : 'STREAM_ERROR';
      console.error(`[CareAiChat] stream error [${code}]:`, msg);
      res.write(`event: error\ndata: ${JSON.stringify({ code, message: msg })}\n\n`);
      res.write(`event: done\ndata: \n\n`);
    }

    res.end();
  });

  return router;
}
