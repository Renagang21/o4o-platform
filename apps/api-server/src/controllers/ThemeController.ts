import { Request, Response } from 'express';
import { ThemeService } from '../services/ThemeService';
import { hooks } from '../services/HookSystem';
import multer from 'multer';
import * as path from 'path';

const upload = multer({
  dest: 'uploads/themes/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname) !== '.zip') {
      cb(new Error('Only ZIP files are allowed'));
    } else {
      cb(null, true);
    }
  }
});

export class ThemeController {
  private themeService: ThemeService;

  constructor() {
    this.themeService = new ThemeService();
  }

  /**
   * Get all themes
   */
  getAllThemes = async (req: Request, res: Response) => {
    try {
      const themes = await this.themeService.getAllThemes();
      
      res.json({
        success: true,
        data: themes,
        count: themes.length
      });
    } catch (error: any) {
      console.error('Error fetching themes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch themes',
        error: error.message
      });
    }
  };

  /**
   * Get theme by ID
   */
  getThemeById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const theme = await this.themeService.getThemeById(id);
      
      if (!theme) {
        return res.status(404).json({
          success: false,
          message: 'Theme not found'
        });
      }
      
      res.json({
        success: true,
        data: theme
      });
    } catch (error: any) {
      console.error('Error fetching theme:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch theme',
        error: error.message
      });
    }
  };

  /**
   * Install theme from marketplace
   */
  installTheme = async (req: Request, res: Response) => {
    try {
      const { themeUrl, siteId } = req.body;
      
      if (!themeUrl || !siteId) {
        return res.status(400).json({
          success: false,
          message: 'Theme URL and site ID are required'
        });
      }
      
      const installation = await this.themeService.installTheme(themeUrl, siteId);
      
      res.json({
        success: true,
        message: 'Theme installed successfully',
        data: installation
      });
    } catch (error: any) {
      console.error('Error installing theme:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to install theme',
        error: error.message
      });
    }
  };

  /**
   * Upload and install theme
   */
  uploadTheme: any[] = [
    upload.single('theme'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'No theme file uploaded'
          });
        }
        
        const { siteId } = req.body;
        if (!siteId) {
          return res.status(400).json({
            success: false,
            message: 'Site ID is required'
          });
        }
        
        // Process uploaded theme file
        const themeUrl = `file://${req.file.path}`;
        const installation = await this.themeService.installTheme(themeUrl, siteId);
        
        res.json({
          success: true,
          message: 'Theme uploaded and installed successfully',
          data: installation
        });
      } catch (error: any) {
        console.error('Error uploading theme:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to upload theme',
          error: error.message
        });
      }
    }
  ];

  /**
   * Activate theme
   */
  activateTheme = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { siteId } = req.body;
      
      if (!siteId) {
        return res.status(400).json({
          success: false,
          message: 'Site ID is required'
        });
      }
      
      await this.themeService.activateTheme(id, siteId);
      
      res.json({
        success: true,
        message: 'Theme activated successfully'
      });
    } catch (error: any) {
      console.error('Error activating theme:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate theme',
        error: error.message
      });
    }
  };

  /**
   * Deactivate theme
   */
  deactivateTheme = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { siteId } = req.body;
      
      if (!siteId) {
        return res.status(400).json({
          success: false,
          message: 'Site ID is required'
        });
      }
      
      await this.themeService.deactivateTheme(id, siteId);
      
      res.json({
        success: true,
        message: 'Theme deactivated successfully'
      });
    } catch (error: any) {
      console.error('Error deactivating theme:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate theme',
        error: error.message
      });
    }
  };

  /**
   * Uninstall theme
   */
  uninstallTheme = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { siteId } = req.body;
      
      if (!siteId) {
        return res.status(400).json({
          success: false,
          message: 'Site ID is required'
        });
      }
      
      await this.themeService.uninstallTheme(id, siteId);
      
      res.json({
        success: true,
        message: 'Theme uninstalled successfully'
      });
    } catch (error: any) {
      console.error('Error uninstalling theme:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to uninstall theme',
        error: error.message
      });
    }
  };

  /**
   * Update theme
   */
  updateTheme = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { updateUrl } = req.body;
      
      if (!updateUrl) {
        return res.status(400).json({
          success: false,
          message: 'Update URL is required'
        });
      }
      
      const theme = await this.themeService.updateTheme(id, updateUrl);
      
      res.json({
        success: true,
        message: 'Theme updated successfully',
        data: theme
      });
    } catch (error: any) {
      console.error('Error updating theme:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update theme',
        error: error.message
      });
    }
  };

  /**
   * Get theme preview
   */
  getThemePreview = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const preview = await this.themeService.getThemePreview(id);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error: any) {
      console.error('Error getting theme preview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get theme preview',
        error: error.message
      });
    }
  };

  /**
   * Save theme customizations
   */
  saveCustomizations = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { siteId, customizations } = req.body;
      
      if (!siteId || !customizations) {
        return res.status(400).json({
          success: false,
          message: 'Site ID and customizations are required'
        });
      }
      
      await this.themeService.saveCustomizations(id, siteId, customizations);
      
      res.json({
        success: true,
        message: 'Customizations saved successfully'
      });
    } catch (error: any) {
      console.error('Error saving customizations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save customizations',
        error: error.message
      });
    }
  };

  /**
   * Get active theme
   */
  getActiveTheme = async (req: Request, res: Response) => {
    try {
      const { siteId } = req.query;
      
      if (!siteId) {
        return res.status(400).json({
          success: false,
          message: 'Site ID is required'
        });
      }
      
      const theme = await this.themeService.getActiveTheme(siteId as string);
      
      res.json({
        success: true,
        data: theme
      });
    } catch (error: any) {
      console.error('Error getting active theme:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active theme',
        error: error.message
      });
    }
  };

  /**
   * Search marketplace
   */
  searchMarketplace = async (req: Request, res: Response) => {
    try {
      const { q, type, isPremium, minRating, maxPrice } = req.query;
      
      const themes = await this.themeService.searchMarketplace(
        q as string,
        {
          type: type as string,
          isPremium: isPremium === 'true',
          minRating: minRating ? parseFloat(minRating as string) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined
        }
      );
      
      res.json({
        success: true,
        data: themes,
        count: themes.length
      });
    } catch (error: any) {
      console.error('Error searching marketplace:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search marketplace',
        error: error.message
      });
    }
  };

  /**
   * Execute hook (for testing)
   */
  executeHook = async (req: Request, res: Response) => {
    try {
      const { hookName, args } = req.body;
      
      if (!hookName) {
        return res.status(400).json({
          success: false,
          message: 'Hook name is required'
        });
      }
      
      await hooks.doAction(hookName, ...(args || []));
      
      res.json({
        success: true,
        message: `Hook ${hookName} executed successfully`
      });
    } catch (error: any) {
      console.error('Error executing hook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute hook',
        error: error.message
      });
    }
  };
}