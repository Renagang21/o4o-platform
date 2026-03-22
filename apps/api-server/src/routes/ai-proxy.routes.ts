/**
 * AI Proxy Routes
 * WO-O4O-AI-SECURITY-APIKEY-REMEDIATION
 *
 * Server-side proxy endpoints for AI generation:
 * - POST /api/ai/generate — Text generation proxy (wraps aiProxyService.generateContent)
 * - POST /api/ai/vision/analyze — Vision AI proxy (Gemini Vision API)
 *
 * All LLM API keys are server-side only. Frontend never touches provider APIs directly.
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { aiProxyService } from '../services/ai-proxy.service.js';
import { AppDataSource } from '../database/connection.js';
import { AiSettings } from '../entities/AiSettings.js';
import type { AuthRequest } from '../types/auth.js';
import type { AIProvider } from '../types/ai-proxy.types.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// ===========================================
// POST /api/ai/generate — Text Generation Proxy
// ===========================================
router.post('/generate', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { provider, model, systemPrompt, userPrompt, temperature, maxTokens, topP, topK } = req.body;

  if (!provider || !systemPrompt || !userPrompt) {
    return res.status(400).json({
      success: false,
      error: 'provider, systemPrompt, userPrompt are required',
      type: 'VALIDATION_ERROR',
    });
  }

  const requestId = crypto.randomUUID();

  try {
    const response = await aiProxyService.generateContent(
      { provider, model, systemPrompt, userPrompt, temperature, maxTokens, topP, topK },
      userId,
      requestId
    );
    return res.json({ ...response, requestId });
  } catch (error: any) {
    const status = error.type === 'RATE_LIMIT_ERROR' ? 429
                 : error.type === 'AUTH_ERROR' ? 401
                 : error.type === 'VALIDATION_ERROR' ? 400
                 : error.type === 'TIMEOUT_ERROR' ? 504
                 : 500;

    logger.error('AI generate error', { requestId, error: error.message, type: error.type });

    return res.status(status).json({
      success: false,
      error: error.message || 'AI 생성 중 오류가 발생했습니다.',
      type: error.type || 'PROVIDER_ERROR',
      retryable: error.retryable || false,
      requestId,
    });
  }
});

// ===========================================
// POST /api/ai/vision/analyze — Vision AI Proxy
// ===========================================
router.post('/vision/analyze', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { imageBase64, mimeType = 'image/jpeg', prompt } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'imageBase64 is required' });
  }

  // Limit image size (10MB base64 ≈ 7.5MB raw)
  if (imageBase64.length > 10 * 1024 * 1024) {
    return res.status(400).json({ success: false, error: '이미지 크기가 너무 큽니다 (최대 10MB).' });
  }

  try {
    const apiKey = await getGeminiApiKey();

    const systemPrompt = prompt || `이미지를 분석하고 다음 JSON 형식으로 응답하세요:
{
  "description": "이미지에 대한 상세 설명",
  "objects": ["감지된 객체 목록"],
  "colors": ["주요 색상"],
  "mood": "이미지의 분위기",
  "style": "이미지 스타일",
  "suggestions": ["이미지 활용 제안"],
  "context": "추가 맥락 정보"
}`;

    const model = 'gemini-3.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Vision AI provider error', { status: response.status, body: errorBody });
      throw new Error(`Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini Vision API');
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      description: text,
      objects: [],
      colors: [],
      mood: '',
      style: '',
      suggestions: [],
    };

    logger.info('Vision AI analysis completed', { userId, model });

    return res.json({ success: true, result });
  } catch (error: any) {
    logger.error('Vision AI error', { userId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'Vision AI 분석 중 오류가 발생했습니다.',
    });
  }
});

/**
 * Get Gemini API key (same pattern as ai-proxy.service.ts)
 * 1. Check database (AiSettings)
 * 2. Fallback to GEMINI_API_KEY env var
 */
async function getGeminiApiKey(): Promise<string> {
  try {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(AiSettings);
      const setting = await repo.findOne({
        where: { provider: 'gemini' as any, isActive: true },
      });
      if (setting?.apiKey) return setting.apiKey;
    }
  } catch (error) {
    logger.warn('Failed to load Gemini API key from database:', error);
  }

  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) return envKey;

  throw new Error('Gemini API key not configured. Set GEMINI_API_KEY or configure in AI Settings.');
}

export default router;
