/**
 * TTS Narration API — WO-O4O-AUTOMATION-TTS-NARROW-ENDPOINT-V1
 *
 * POST /automation/tts   {provider:'openai'|'gemini', text, voice?, style?, format?:'mp3'|'wav'}
 *   → audio 바이너리 (Content-Type audio/mpeg | audio/wav · X-Tts-Provider/Model/Voice/Format 헤더)
 *
 * guard 는 VIDEO Job(automation-jobs) 과 같은 플랫폼 관리자 경계(requireMediaPlatformAdmin).
 * key 는 resolveAiApiKey 재사용 — 응답 어디에도 싣지 않는다. 저장 없음(클라이언트가 파일로 보관).
 */
import { Router, type Request, type Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import logger from '../../../utils/logger.js';
import { resolveAiApiKey } from '../../../utils/ai-key.util.js';
import { requireMediaPlatformAdmin } from '../../media/controllers/media-catalog.controller.js';
import { MediaCatalogError } from '../../media/services/media-catalog.service.js';
import { TtsNarrationService, validateTtsRequest } from '../services/tts-narration.service.js';

export function createTtsNarrationRouter(ds: DataSource): Router {
  const router = Router();
  const service = new TtsNarrationService((provider) => resolveAiApiKey(ds, provider));
  router.post('/automation/tts', [authenticate, requireMediaPlatformAdmin], async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new MediaCatalogError('INVALID_BODY');
      const request = validateTtsRequest(req.body);
      const result = await service.synthesize(request);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', String(result.audio.length));
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Tts-Provider', result.provider);
      res.setHeader('X-Tts-Model', result.model);
      res.setHeader('X-Tts-Voice', result.voice);
      res.setHeader('X-Tts-Format', result.format);
      res.status(200).send(result.audio);
    } catch (error) {
      if (error instanceof MediaCatalogError) {
        res.status(error.status).json({ success: false, error: error.message, code: error.code });
        return;
      }
      logger.error('[TTS] synthesize failed:', error);
      res.status(500).json({ success: false, code: 'TTS_FAILED' });
    }
  });
  return router;
}
