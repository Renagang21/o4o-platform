import { Request, Response } from 'express';
import { settingsService, SettingsType } from '../services/settingsService.js';
import logger from '../utils/logger.js';

export class SettingsController {
  private readonly validTypes: SettingsType[] = ['general', 'reading', 'theme', 'email', 'customizer', 'permalink'];

  // GET /api/settings/:type
  async getSettings(req: Request, res: Response) {
    try {
      const { type } = req.params;

      if (!this.validTypes.includes(type as SettingsType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid settings type'
        });
      }

      const settings = await settingsService.getSettings(type as SettingsType);

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error fetching settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/settings/:type
  async updateSettings(req: Request, res: Response) {
    try {
      const { type } = req.params;

      if (!this.validTypes.includes(type as SettingsType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid settings type'
        });
      }

      // Extract settings from request body
      // Frontend sends: { settings: {...} } for customizer type
      // We need to unwrap it to get the actual settings object
      const settingsData = req.body.settings || req.body;

      const settings = await settingsService.updateSettings(type as SettingsType, settingsData);

      res.json({
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/settings/homepage (public endpoint for frontend)
  async getHomepageSettings(req: Request, res: Response) {
    try {
      const settings = await settingsService.getHomepageSettings();

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error fetching homepage settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch homepage settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/settings/general (public endpoint for frontend)
  async getGeneralSettings(req: Request, res: Response) {
    try {
      const settings = await settingsService.getSettings('general');

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error fetching general settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch general settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/settings/customizer (public endpoint for frontend)
  async getCustomizerSettings(req: Request, res: Response) {
    try {
      const settings = await settingsService.getSettings('customizer');

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error fetching customizer settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch customizer settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/settings/initialize (admin only)
  async initializeSettings(req: Request, res: Response) {
    try {
      await settingsService.initializeSettings();

      res.json({
        success: true,
        message: 'Settings initialized successfully'
      });
    } catch (error) {
      logger.error('Error initializing settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/settings/header-builder
  async getHeaderBuilder(req: Request, res: Response) {
    try {
      const settings = await settingsService.getHeaderBuilder();

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error fetching header builder settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch header builder settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/settings/header-builder
  async updateHeaderBuilder(req: Request, res: Response) {
    try {
      const settings = await settingsService.updateHeaderBuilder(req.body);

      res.json({
        success: true,
        data: settings,
        message: 'Header builder settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating header builder settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update header builder settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/settings/customizer (admin only - cleanup legacy Astra data)
  async deleteCustomizerSettings(req: Request, res: Response) {
    try {
      const result = await settingsService.deleteCustomizerSettings();

      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      logger.error('Error deleting customizer settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete customizer settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}