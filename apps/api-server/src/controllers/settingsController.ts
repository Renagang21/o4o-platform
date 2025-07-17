import { Request, Response } from 'express';
import { settingsService, SettingsType } from '../services/settingsService';

export class SettingsController {
  // GET /api/settings/:type
  async getSettings(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const validTypes: SettingsType[] = ['general', 'reading', 'theme', 'email'];

      if (!validTypes.includes(type as SettingsType)) {
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
      console.error('Error fetching settings:', error);
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
      const validTypes: SettingsType[] = ['general', 'reading', 'theme', 'email'];

      if (!validTypes.includes(type as SettingsType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid settings type'
        });
      }

      const settings = await settingsService.updateSettings(type as SettingsType, req.body);

      res.json({
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
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
      console.error('Error fetching homepage settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch homepage settings',
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
      console.error('Error initializing settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}