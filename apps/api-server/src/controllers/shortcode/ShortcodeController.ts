import { Request, Response } from 'express';
import { shortcodeService } from '../../services/shortcode.service';
import { ShortcodeCategory, ShortcodeStatus } from '../../entities/Shortcode';
import { ExecutionStatus, ExecutionContext } from '../../entities/ShortcodeExecution';
import logger from '../../utils/logger';

export class ShortcodeController {
  /**
   * GET /api/shortcodes - Get all shortcodes
   */
  getShortcodes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, status, isVisible, search } = req.query;
      
      const filters: any = {};
      
      if (category) {
        filters.category = category as ShortcodeCategory;
      }
      
      if (status) {
        filters.status = status as ShortcodeStatus;
      }
      
      if (isVisible !== undefined) {
        filters.isVisible = isVisible === 'true';
      }
      
      if (search) {
        filters.search = search as string;
      }

      const shortcodes = await shortcodeService.findAllShortcodes(filters);
      
      res.json({
        success: true,
        data: shortcodes
      });
    } catch (error) {
      logger.error('Error getting shortcodes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve shortcodes'
      });
    }
  };

  /**
   * GET /api/shortcodes/:name - Get shortcode by name
   */
  getShortcode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const shortcode = await shortcodeService.findShortcodeByName(name);
      
      if (!shortcode) {
        res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: shortcode
      });
    } catch (error) {
      logger.error('Error getting shortcode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve shortcode'
      });
    }
  };

  /**
   * POST /api/shortcodes - Create new shortcode
   */
  createShortcode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId = 'custom', ...data } = req.body;
      
      if (!data.name || !data.displayName) {
        res.status(400).json({
          success: false,
          error: 'Name and displayName are required'
        });
        return;
      }

      const shortcode = await shortcodeService.createShortcode({
        appId,
        ...data
      });
      
      res.status(201).json({
        success: true,
        data: shortcode,
        message: 'Shortcode created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating shortcode:', error);
      
      if (error.message?.includes('already exists')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create shortcode'
        });
      }
    }
  };

  /**
   * PUT /api/shortcodes/:name - Update shortcode
   */
  updateShortcode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const shortcode = await shortcodeService.updateShortcode(name, req.body);
      
      if (!shortcode) {
        res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: shortcode,
        message: 'Shortcode updated successfully'
      });
    } catch (error) {
      logger.error('Error updating shortcode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update shortcode'
      });
    }
  };

  /**
   * DELETE /api/shortcodes/:name - Delete shortcode
   */
  deleteShortcode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const deleted = await shortcodeService.deleteShortcode(name);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Shortcode not found'
        });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting shortcode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete shortcode'
      });
    }
  };

  /**
   * POST /api/shortcodes/parse - Parse content with shortcodes
   */
  parseContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { content, context, contextId, enableCache = true } = req.body;
      const userId = (req as any).user?.id;
      
      if (!content) {
        res.status(400).json({
          success: false,
          error: 'Content is required'
        });
        return;
      }

      const parsed = await shortcodeService.parseContent(content, {
        context,
        contextId,
        userId,
        enableCache
      });
      
      res.json({
        success: true,
        data: {
          original: content,
          parsed,
          hasShortcodes: content !== parsed
        }
      });
    } catch (error) {
      logger.error('Error parsing content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to parse content'
      });
    }
  };

  /**
   * POST /api/shortcodes/preview - Preview shortcode
   */
  previewShortcode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, attributes = {}, content = '' } = req.body;
      
      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Shortcode name is required'
        });
        return;
      }

      const preview = await shortcodeService.previewShortcode(
        name,
        attributes,
        content
      );
      
      res.json({
        success: true,
        data: {
          name,
          attributes,
          content,
          preview
        }
      });
    } catch (error: any) {
      logger.error('Error previewing shortcode:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to preview shortcode'
      });
    }
  };

  /**
   * GET /api/shortcodes/logs - Get execution logs
   */
  getExecutionLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        shortcodeName,
        userId,
        status,
        context,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      const filters: any = {
        page: Number(page),
        limit: Number(limit)
      };

      if (shortcodeName) {
        filters.shortcodeName = shortcodeName as string;
      }

      if (userId) {
        filters.userId = userId as string;
      }

      if (status) {
        filters.status = status as ExecutionStatus;
      }

      if (context) {
        filters.context = context as string;
      }

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const result = await shortcodeService.getExecutionLogs(filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting execution logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve execution logs'
      });
    }
  };

  /**
   * GET /api/shortcodes/statistics - Get shortcode statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.query;
      const statistics = await shortcodeService.getShortcodeStatistics(
        name as string | undefined
      );
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics'
      });
    }
  };

  /**
   * POST /api/shortcodes/cache/clear - Clear shortcode cache
   */
  clearCache = async (req: Request, res: Response): Promise<void> => {
    try {
      shortcodeService.clearCache();
      
      res.json({
        success: true,
        message: 'Shortcode cache cleared successfully'
      });
    } catch (error) {
      logger.error('Error clearing cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache'
      });
    }
  };

  /**
   * PUT /api/shortcodes/bulk/status - Bulk update shortcode status
   */
  bulkUpdateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { names, status } = req.body;
      
      if (!names || !Array.isArray(names) || names.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Names array is required'
        });
        return;
      }

      if (!status || !Object.values(ShortcodeStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Valid status is required'
        });
        return;
      }

      const affected = await shortcodeService.bulkUpdateStatus(names, status);
      
      res.json({
        success: true,
        data: { affected },
        message: `${affected} shortcodes updated`
      });
    } catch (error) {
      logger.error('Error bulk updating status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update shortcodes'
      });
    }
  };

  /**
   * GET /api/shortcodes/export - Export shortcodes
   */
  exportShortcodes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { names } = req.query;
      const nameArray = names 
        ? (Array.isArray(names) ? names : [names]).map(n => String(n))
        : undefined;

      const shortcodes = await shortcodeService.exportShortcodes(nameArray);
      
      res.json({
        success: true,
        data: shortcodes
      });
    } catch (error) {
      logger.error('Error exporting shortcodes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export shortcodes'
      });
    }
  };

  /**
   * POST /api/shortcodes/import - Import shortcodes
   */
  importShortcodes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { shortcodes, appId = 'imported', overwrite = false } = req.body;
      
      if (!shortcodes || !Array.isArray(shortcodes)) {
        res.status(400).json({
          success: false,
          error: 'Shortcodes array is required'
        });
        return;
      }

      const result = await shortcodeService.importShortcodes(
        shortcodes,
        appId,
        overwrite
      );
      
      res.json({
        success: true,
        data: result,
        message: `Imported ${result.imported} shortcodes`
      });
    } catch (error) {
      logger.error('Error importing shortcodes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import shortcodes'
      });
    }
  };
}