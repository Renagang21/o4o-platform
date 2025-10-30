import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import AppDataSource from '../database/data-source.js';
import { AiSettings } from '../entities/AiSettings.js';

const router: Router = Router();

/**
 * AI Settings Routes
 * Full implementation with database support
 */

// GET AI settings
router.get('/ai-settings', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if data source is initialized
    if (!AppDataSource.isInitialized) {
      console.error('Database not initialized for AI settings');
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }
    
    const aiSettingsRepo = AppDataSource.getRepository(AiSettings);
    
    // Get all AI provider settings
    const settings = await aiSettingsRepo.find({
      order: { provider: 'ASC' }
    });
    
    // Transform to frontend format
    const providers: any = {};
    let defaultProvider: string | null = null;
    
    // Initialize with default providers if they don't exist
    const defaultProviders = ['openai', 'claude', 'gemini'];
    
    for (const providerName of defaultProviders) {
      const setting = settings.find(s => s.provider === providerName);
      if (setting) {
        providers[providerName] = {
          enabled: setting.isActive,
          apiKey: setting.apiKey ? '***' : null, // Mask API key for security
          model: setting.defaultModel
        };
        if (setting.isActive && setting.apiKey && !defaultProvider) {
          defaultProvider = providerName;
        }
      } else {
        providers[providerName] = {
          enabled: false,
          apiKey: null,
          model: null
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        providers,
        defaultProvider,
        settings: {
          maxTokens: 4096,
          temperature: 0.7
        }
      }
    });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI settings'
    });
  }
});

// POST AI settings (update)
router.post('/ai-settings', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if data source is initialized
    if (!AppDataSource.isInitialized) {
      console.error('Database not initialized for AI settings');
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      });
    }
    
    const aiSettingsRepo = AppDataSource.getRepository(AiSettings);
    const { provider, apiKey, model, enabled } = req.body;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required'
      });
    }
    
    // Find or create provider settings
    let settings = await aiSettingsRepo.findOne({ where: { provider } });
    
    if (!settings) {
      settings = new AiSettings();
      settings.provider = provider;
    }
    
    // Update settings
    if (apiKey !== undefined && apiKey !== '***') {
      settings.apiKey = apiKey || null;
    }
    if (model !== undefined) {
      settings.defaultModel = model;
    }
    if (enabled !== undefined) {
      settings.isActive = enabled;
    }
    
    await aiSettingsRepo.save(settings);
    
    res.json({
      success: true,
      message: 'AI settings updated successfully',
      data: {
        provider,
        enabled: settings.isActive,
        model: settings.defaultModel,
        apiKey: settings.apiKey ? '***' : null
      }
    });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI settings'
    });
  }
});

export default router;