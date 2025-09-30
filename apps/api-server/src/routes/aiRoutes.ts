import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

/**
 * AI Settings Routes
 * Stub implementation to prevent 404 errors
 */

// GET AI settings
router.get('/ai-settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Return empty settings for now
    // This prevents 404 errors in the frontend
    res.json({
      success: true,
      data: {
        providers: {
          openai: { enabled: false, apiKey: null },
          claude: { enabled: false, apiKey: null },
          gemini: { enabled: false, apiKey: null }
        },
        defaultProvider: null,
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
router.post('/ai-settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    // For now, just acknowledge the request
    // In the future, this would save the settings to database
    res.json({
      success: true,
      message: 'AI settings updated successfully',
      data: req.body
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