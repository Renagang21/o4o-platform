import { Request, Response } from 'express';
import { presetService } from '../services/preset.service.js';
import logger from '../../../utils/logger.js';

/**
 * Preset Controller - HTTP handlers for preset endpoints
 */
export class PresetController {
  // ==================== Form Presets ====================

  async getAllFormPresets(req: Request, res: Response) {
    try {
      const { cptSlug, isActive, page, limit, orderBy, order } = req.query;

      const result = await presetService.getAllFormPresets({
        cptSlug: cptSlug as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        orderBy: orderBy as string,
        order: order as 'ASC' | 'DESC'
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error in getAllFormPresets:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async getFormPresetById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.getFormPresetById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in getFormPresetById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async createFormPreset(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const result = await presetService.createFormPreset(req.body, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error in createFormPreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async updateFormPreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.updateFormPreset(id, req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in updateFormPreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async deleteFormPreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.deleteFormPreset(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in deleteFormPreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async cloneFormPreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const result = await presetService.cloneFormPreset(id, userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error in cloneFormPreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // ==================== View Presets ====================

  async getAllViewPresets(req: Request, res: Response) {
    try {
      const { cptSlug, isActive, page, limit, orderBy, order } = req.query;

      const result = await presetService.getAllViewPresets({
        cptSlug: cptSlug as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        orderBy: orderBy as string,
        order: order as 'ASC' | 'DESC'
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error in getAllViewPresets:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async getViewPresetById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.getViewPresetById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in getViewPresetById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async createViewPreset(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const result = await presetService.createViewPreset(req.body, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error in createViewPreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async updateViewPreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.updateViewPreset(id, req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in updateViewPreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async deleteViewPreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.deleteViewPreset(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in deleteViewPreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async cloneViewPreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const result = await presetService.cloneViewPreset(id, userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error in cloneViewPreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // ==================== Template Presets ====================

  async getAllTemplatePresets(req: Request, res: Response) {
    try {
      const { cptSlug, isActive, page, limit, orderBy, order } = req.query;

      const result = await presetService.getAllTemplatePresets({
        cptSlug: cptSlug as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        orderBy: orderBy as string,
        order: order as 'ASC' | 'DESC'
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error in getAllTemplatePresets:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async getTemplatePresetById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.getTemplatePresetById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in getTemplatePresetById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async createTemplatePreset(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const result = await presetService.createTemplatePreset(req.body, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error in createTemplatePreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async updateTemplatePreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.updateTemplatePreset(id, req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in updateTemplatePreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async deleteTemplatePreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await presetService.deleteTemplatePreset(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error in deleteTemplatePreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async cloneTemplatePreset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const result = await presetService.cloneTemplatePreset(id, userId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error in cloneTemplatePreset:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
}

// Export singleton instance
export const presetController = new PresetController();
