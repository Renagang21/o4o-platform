import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { AiSettings } from '../../entities/AiSettings';
import { Repository } from 'typeorm';

export class AISettingsController {
  private getRepository(): Repository<AiSettings> {
    return AppDataSource.getRepository(AiSettings);
  }

  // Get all AI settings
  getSettings = async (req: Request, res: Response) => {
    try {
      if (!AppDataSource.isInitialized) {
        return res.status(503).json({
          status: 'error',
          message: 'Database connection not available'
        });
      }

      const aiSettingRepository = this.getRepository();
      const settings = await aiSettingRepository.find({
        where: { isActive: true }
      });

      // Transform to object format for frontend
      const settingsObject: Record<string, any> = {};
      settings.forEach(setting => {
        settingsObject[setting.provider] = {
          apiKey: setting.apiKey,
          defaultModel: setting.defaultModel,
          settings: setting.settings
        };
      });

      return res.json({
        status: 'success',
        data: settingsObject
      });
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch AI settings'
      });
    }
  };

  // Save AI settings
  saveSettings = async (req: Request, res: Response) => {
    try {
      if (!AppDataSource.isInitialized) {
        return res.status(503).json({
          status: 'error',
          message: 'Database connection not available'
        });
      }

      const { provider, apiKey, defaultModel, settings } = req.body;

      if (!provider) {
        return res.status(400).json({
          status: 'error',
          message: 'Provider is required'
        });
      }

      const aiSettingRepository = this.getRepository();
      
      // Find existing setting or create new one
      let aiSetting = await aiSettingRepository.findOne({
        where: { provider }
      });

      if (aiSetting) {
        // Update existing
        aiSetting.apiKey = apiKey || null;
        aiSetting.defaultModel = defaultModel || null;
        aiSetting.settings = settings || {};
      } else {
        // Create new
        aiSetting = aiSettingRepository.create({
          provider,
          apiKey: apiKey || null,
          defaultModel: defaultModel || null,
          settings: settings || {},
          isActive: true
        });
      }

      await aiSettingRepository.save(aiSetting);

      return res.json({
        status: 'success',
        data: aiSetting,
        message: 'AI settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to save AI settings'
      });
    }
  };

  // Delete AI setting
  deleteSetting = async (req: Request, res: Response) => {
    try {
      if (!AppDataSource.isInitialized) {
        return res.status(503).json({
          status: 'error',
          message: 'Database connection not available'
        });
      }

      const { provider } = req.params;
      const aiSettingRepository = this.getRepository();

      const aiSetting = await aiSettingRepository.findOne({
        where: { provider }
      });

      if (!aiSetting) {
        return res.status(404).json({
          status: 'error',
          message: 'AI setting not found'
        });
      }

      // Soft delete by setting apiKey to null
      aiSetting.apiKey = null;
      aiSetting.isActive = false;
      await aiSettingRepository.save(aiSetting);

      return res.json({
        status: 'success',
        message: 'AI setting deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting AI setting:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete AI setting'
      });
    }
  };

  // Test API key
  testApiKey = async (req: Request, res: Response) => {
    try {
      const { provider, apiKey } = req.body;

      if (!provider || !apiKey) {
        return res.status(400).json({
          status: 'error',
          message: 'Provider and API key are required'
        });
      }

      let isValid = false;
      let message = '';

      // Test based on provider
      if (provider === 'gemini') {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          isValid = response.ok;
          message = isValid ? 'Gemini API key is valid' : 'Invalid Gemini API key';
        } catch {
          message = 'Failed to validate Gemini API key';
        }
      } else if (provider === 'openai') {
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          });
          isValid = response.ok;
          message = isValid ? 'OpenAI API key is valid' : 'Invalid OpenAI API key';
        } catch {
          message = 'Failed to validate OpenAI API key';
        }
      } else if (provider === 'claude') {
        // Simple format check for Claude
        isValid = apiKey.startsWith('sk-ant-');
        message = isValid ? 'Claude API key format is valid' : 'Invalid Claude API key format';
      }

      return res.json({
        status: isValid ? 'success' : 'error',
        valid: isValid,
        message
      });
    } catch (error) {
      console.error('Error testing API key:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to test API key'
      });
    }
  };
}