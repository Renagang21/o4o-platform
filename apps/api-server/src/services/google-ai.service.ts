/**
 * Google AI Service
 * Handles Google AI API integrations (Gemini, Imagen, etc.)
 */

import { appRegistry } from './app-registry.service.js';
import logger from '../utils/logger.js';

interface GeminiGenerateOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

// 상수 정의 (WO-AI-GEMINI-FLASH-INTEGRATION-V1)
const DEFAULT_MODEL = 'gemini-2.0-flash'; // Note: 2.0-flash is stable; 3.0-flash available in settingsSchema
const DEFAULT_TIMEOUT_MS = 30000; // 30초
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_OUTPUT_TOKENS = 2048;

interface GeminiResponse {
  data: {
    text: string;
    candidates?: any[];
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  model: string;
}

class GoogleAIService {
  private static instance: GoogleAIService;

  private constructor() {}

  static getInstance(): GoogleAIService {
    if (!GoogleAIService.instance) {
      GoogleAIService.instance = new GoogleAIService();
    }
    return GoogleAIService.instance;
  }

  /**
   * Execute Gemini text generation
   * WO-AI-GEMINI-FLASH-INTEGRATION-V1: 타임아웃 및 안정성 강화
   */
  async executeGemini(
    apiKey: string,
    options: GeminiGenerateOptions
  ): Promise<GeminiResponse> {
    const {
      prompt,
      model = DEFAULT_MODEL,
      temperature = DEFAULT_TEMPERATURE,
      maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
      timeoutMs = DEFAULT_TIMEOUT_MS
    } = options;

    // AbortController로 타임아웃 처리
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      logger.debug(`Gemini API call: model=${model}, timeout=${timeoutMs}ms`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature,
            maxOutputTokens
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMessage = error.error?.message || `Gemini API error: ${response.status}`;
        logger.error(`Gemini API error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Extract text from response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Safety check - 응답이 비어있는 경우
      if (!text) {
        logger.warn('Gemini returned empty response');
        throw new Error('AI 응답을 생성하지 못했습니다.');
      }

      // Extract usage metadata
      const usageMetadata = data.usageMetadata || {};

      logger.debug(`Gemini response: ${text.length} chars, input=${usageMetadata.promptTokenCount}, output=${usageMetadata.candidatesTokenCount}`);

      return {
        data: {
          text,
          candidates: data.candidates
        },
        usage: {
          inputTokens: usageMetadata.promptTokenCount,
          outputTokens: usageMetadata.candidatesTokenCount
        },
        model
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      // 타임아웃 에러 처리
      if (error.name === 'AbortError') {
        logger.error(`Gemini API timeout after ${timeoutMs}ms`);
        throw new Error('AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      }

      // API 키 관련 에러
      if (error.message?.includes('API key')) {
        logger.error('Gemini API key error:', error.message);
        throw new Error('AI 서비스 설정에 문제가 있습니다. 관리자에게 문의하세요.');
      }

      // 일반 에러
      logger.error('Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Initialize and register Google AI apps
   */
  async initializeApps(): Promise<void> {
    try {
      // Register Gemini Text Generation App
      const geminiApp = await appRegistry.getBySlug('google-gemini-text');

      if (!geminiApp) {
        await appRegistry.register({
          slug: 'google-gemini-text',
          name: 'Gemini 텍스트 생성',
          provider: 'google',
          category: 'text-generation',
          type: 'integration',
          description: 'Google Gemini API를 사용한 텍스트 생성',
          icon: 'sparkles',
          version: '1.0.0',
          status: 'active',
          isSystem: true,
          manifest: {
            displayName: 'Gemini Text Generation',
            category: 'AI Text',
            provides: {
              apis: [
                {
                  path: '/execute',
                  method: 'POST',
                  description: 'Generate text using Gemini'
                }
              ]
            },
            settingsSchema: {
              apiKey: {
                type: 'string',
                required: true,
                description: 'Google AI API Key',
                secret: true
              },
              model: {
                type: 'select',
                options: ['gemini-3.0-flash', 'gemini-3.0-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
                default: 'gemini-3.0-flash',
                description: 'Gemini model to use'
              },
              temperature: {
                type: 'number',
                default: 0.7,
                min: 0,
                max: 2,
                description: 'Sampling temperature'
              }
            }
          }
        });

        logger.info('✅ Google Gemini app registered');
      }

    } catch (error) {
      logger.error('❌ Failed to initialize Google AI apps:', error);
      throw error;
    }
  }

  /**
   * Execute Google AI app action
   */
  async execute(config: Record<string, any>, action: string, payload: any): Promise<any> {
    const apiKey = config.apiKey;

    if (!apiKey) {
      throw new Error('Google AI API key not configured');
    }

    switch (action) {
      case 'generate-text':
        return await this.executeGemini(apiKey, {
          prompt: payload.prompt,
          model: config.model || payload.model,
          temperature: config.temperature || payload.temperature,
          maxOutputTokens: payload.maxOutputTokens
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

export const googleAI = GoogleAIService.getInstance();
export default GoogleAIService;
