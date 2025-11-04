/**
 * Customizer Presets API Routes
 * Endpoints for managing customizer presets (save/load/apply/rollback)
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import { SettingsService } from '../../services/settingsService.js';
import { AppDataSource } from '../../database/connection.js';
import { CustomizerPreset } from '../../entities/CustomizerPreset.js';

const router: Router = Router();
const settingsService = new SettingsService();

// Store last applied settings for rollback
let lastAppliedSettings: any = null;

/**
 * GET /api/v1/customizer-presets
 * List all presets (public)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const presetRepo = AppDataSource.getRepository(CustomizerPreset);
    const presets = await presetRepo.find({
      select: ['id', 'name', 'slug', 'description', 'createdAt', 'isDefault'],
      order: { createdAt: 'DESC' },
      take: 10, // Limit to recent 10
    });

    res.json({
      success: true,
      data: presets,
    });
  } catch (error: any) {
    console.error('Error fetching presets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch presets',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/customizer-presets/:id
 * Get single preset details (public)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const presetRepo = AppDataSource.getRepository(CustomizerPreset);
    
    const preset = await presetRepo.findOne({
      where: { id },
    });

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'Preset not found',
      });
    }

    res.json({
      success: true,
      data: preset,
    });
  } catch (error: any) {
    console.error('Error fetching preset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preset',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/customizer-presets
 * Save current settings as new preset (admin only)
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Preset name is required',
      });
    }

    // Get current customizer settings
    const currentSettings = await settingsService.getSettings('customizer');
    
    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Create preset
    const presetRepo = AppDataSource.getRepository(CustomizerPreset);
    const preset = presetRepo.create({
      name,
      slug: `${slug}-${Date.now()}`, // Ensure uniqueness
      description,
      settings: currentSettings || {},
      meta: {
        sourceVersion: (currentSettings as any)?._version,
        author: (req as any).user?.email,
      },
    });

    await presetRepo.save(preset);

    res.json({
      success: true,
      data: preset,
      message: `Preset '${name}' saved successfully`,
    });
  } catch (error: any) {
    console.error('Error saving preset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save preset',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/customizer-presets/:id/apply
 * Apply preset to current settings (admin only)
 */
router.post('/:id/apply', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const presetRepo = AppDataSource.getRepository(CustomizerPreset);
    
    const preset = await presetRepo.findOne({
      where: { id },
    });

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'Preset not found',
      });
    }

    // Store current settings for rollback
    const currentSettings = await settingsService.getSettings('customizer');
    lastAppliedSettings = currentSettings;

    // Apply preset settings with version increment
    const updatedSettings = {
      ...preset.settings,
      _version: ((currentSettings as any)?._version || 0) + 1,
      _meta: {
        ...(preset.settings as any)?._meta,
        lastModified: new Date().toISOString(),
        appliedPreset: preset.id,
        isDirty: false,
      },
    };

    await settingsService.updateSettings('customizer', updatedSettings);

    const changedKeys = Object.keys(preset.settings).filter(key => !key.startsWith('_'));

    res.json({
      success: true,
      data: updatedSettings,
      message: `Preset '${preset.name}' applied successfully`,
      changes: {
        presetId: preset.id,
        itemsChanged: changedKeys.length,
        oldVersion: (currentSettings as any)?._version,
        newVersion: updatedSettings._version,
      },
    });
  } catch (error: any) {
    console.error('Error applying preset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply preset',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/customizer-presets/rollback
 * Rollback to previous settings (admin only)
 */
router.post('/rollback', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!lastAppliedSettings) {
      return res.status(400).json({
        success: false,
        error: 'No previous settings to rollback to',
      });
    }

    // Get current version for logging
    const currentSettings = await settingsService.getSettings('customizer');
    
    // Rollback with version increment
    const rollbackSettings = {
      ...lastAppliedSettings,
      _version: ((currentSettings as any)?._version || 0) + 1,
      _meta: {
        ...(lastAppliedSettings as any)?._meta,
        lastModified: new Date().toISOString(),
        rolledBack: true,
        isDirty: false,
      },
    };

    await settingsService.updateSettings('customizer', rollbackSettings);

    // Clear rollback state
    lastAppliedSettings = null;

    res.json({
      success: true,
      data: rollbackSettings,
      message: 'Settings rolled back successfully',
      changes: {
        oldVersion: (currentSettings as any)?._version,
        newVersion: rollbackSettings._version,
      },
    });
  } catch (error: any) {
    console.error('Error during rollback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rollback settings',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/v1/customizer-presets/:id
 * Delete preset (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const presetRepo = AppDataSource.getRepository(CustomizerPreset);
    
    const preset = await presetRepo.findOne({
      where: { id },
    });

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'Preset not found',
      });
    }

    await presetRepo.remove(preset);

    res.json({
      success: true,
      message: `Preset '${preset.name}' deleted successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting preset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete preset',
      message: error.message,
    });
  }
});

export default router;
