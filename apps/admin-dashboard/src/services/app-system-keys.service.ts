/**
 * App System Key Service
 * Provides API keys from the App System for AI generation
 * This replaces the old AIApiKeyService
 */

import { appSystemApi } from '@/api/app-system.api';

export class AppSystemKeyService {
  /**
   * Get Gemini API key from the App System
   * @returns API key if installed, undefined otherwise
   */
  static async getGeminiKey(): Promise<string | undefined> {
    try {
      const instance = await appSystemApi.getInstance('google-gemini-text');
      if (instance && instance.config?.apiKey) {
        return instance.config.apiKey;
      }
      return undefined;
    } catch (error) {
      // App not installed or no API key configured
      return undefined;
    }
  }

  /**
   * Get Gemini model from the App System
   * @returns Model name if configured, undefined otherwise
   */
  static async getGeminiModel(): Promise<string | undefined> {
    try {
      const instance = await appSystemApi.getInstance('google-gemini-text');
      if (instance && instance.config?.model) {
        return instance.config.model;
      }
      return undefined;
    } catch (error) {
      // App not installed or no model configured
      return undefined;
    }
  }

  /**
   * Get Gemini temperature setting from the App System
   * @returns Temperature value if configured, undefined otherwise
   */
  static async getGeminiTemperature(): Promise<number | undefined> {
    try {
      const instance = await appSystemApi.getInstance('google-gemini-text');
      if (instance && instance.config?.temperature !== undefined) {
        return instance.config.temperature;
      }
      return undefined;
    } catch (error) {
      // App not installed or no temperature configured
      return undefined;
    }
  }

  /**
   * Check if Gemini app is installed
   * @returns true if installed, false otherwise
   */
  static async isGeminiInstalled(): Promise<boolean> {
    try {
      const instance = await appSystemApi.getInstance('google-gemini-text');
      return !!instance;
    } catch (error) {
      return false;
    }
  }
}
