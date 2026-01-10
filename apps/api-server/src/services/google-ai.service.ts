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
}

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
   */
  async executeGemini(
    apiKey: string,
    options: GeminiGenerateOptions
  ): Promise<GeminiResponse> {
    const {
      prompt,
      model = 'gemini-3.0-flash',
      temperature = 0.7,
      maxOutputTokens = 2048
    } = options;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract text from response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract usage metadata
      const usageMetadata = data.usageMetadata || {};

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
      logger.error('❌ Gemini API error:', error);
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
