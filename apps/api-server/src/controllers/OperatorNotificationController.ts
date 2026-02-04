/**
 * OperatorNotificationController
 * WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1
 *
 * 서비스별 운영자 알림 이메일 설정 관리 API
 */

import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { OperatorNotificationSettings, NotificationTypeSettings } from '../entities/OperatorNotificationSettings.js';

export class OperatorNotificationController {
  private settingsRepository: Repository<OperatorNotificationSettings>;

  constructor() {
    this.settingsRepository = AppDataSource.getRepository(OperatorNotificationSettings);
  }

  /**
   * Get operator notification settings for a service
   * GET /api/operator/settings/notifications
   * Query: ?serviceCode=neture (optional, defaults to user's service scope)
   */
  getSettings = async (req: Request, res: Response) => {
    try {
      // Determine service code from query or user's scope
      let serviceCode = req.query.serviceCode as string;

      // If no service code provided, try to get from user's scopes
      if (!serviceCode && req.user) {
        const userScopes = (req.user as any).scopes || [];
        // Find service-specific scope (e.g., 'neture:operator', 'glucoseview:operator')
        const serviceScope = userScopes.find((s: string) => s.includes(':operator'));
        if (serviceScope) {
          serviceCode = serviceScope.split(':')[0];
        }
      }

      // Default to 'neture' if still no service code
      serviceCode = serviceCode || 'neture';

      const settings = await this.settingsRepository.findOne({
        where: { serviceCode }
      });

      if (!settings) {
        // Return default settings if none exist
        return res.json({
          success: true,
          data: {
            operatorEmail: '',
            operatorEmailSecondary: '',
            notifications: OperatorNotificationSettings.getDefaultNotifications(),
            enabled: true,
            serviceCode,
          }
        });
      }

      return res.json({
        success: true,
        data: {
          operatorEmail: settings.operatorEmail,
          operatorEmailSecondary: settings.operatorEmailSecondary || '',
          notifications: settings.notifications,
          enabled: settings.enabled,
          serviceCode: settings.serviceCode,
          lastNotificationAt: settings.lastNotificationAt,
          updatedAt: settings.updatedAt,
        }
      });
    } catch (error) {
      console.error('Failed to get operator notification settings:', error);
      return res.status(500).json({
        success: false,
        error: '알림 설정을 불러오는데 실패했습니다.'
      });
    }
  };

  /**
   * Update operator notification settings for a service
   * PUT /api/operator/settings/notifications
   */
  updateSettings = async (req: Request, res: Response) => {
    try {
      const {
        operatorEmail,
        operatorEmailSecondary,
        notifications,
        enabled,
        serviceCode: bodyServiceCode,
      } = req.body;

      // Validate required fields
      if (!operatorEmail) {
        return res.status(400).json({
          success: false,
          error: '운영자 이메일 주소를 입력해주세요.'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(operatorEmail)) {
        return res.status(400).json({
          success: false,
          error: '올바른 이메일 형식을 입력해주세요.'
        });
      }

      if (operatorEmailSecondary && !emailRegex.test(operatorEmailSecondary)) {
        return res.status(400).json({
          success: false,
          error: '보조 이메일 형식이 올바르지 않습니다.'
        });
      }

      // Determine service code
      let serviceCode = bodyServiceCode || (req.query.serviceCode as string);

      if (!serviceCode && req.user) {
        const userScopes = (req.user as any).scopes || [];
        const serviceScope = userScopes.find((s: string) => s.includes(':operator'));
        if (serviceScope) {
          serviceCode = serviceScope.split(':')[0];
        }
      }

      serviceCode = serviceCode || 'neture';

      // Find existing settings or create new
      let settings = await this.settingsRepository.findOne({
        where: { serviceCode }
      });

      if (!settings) {
        settings = new OperatorNotificationSettings();
        settings.serviceCode = serviceCode;
        settings.notifications = OperatorNotificationSettings.getDefaultNotifications();
      }

      // Update settings
      settings.operatorEmail = operatorEmail;
      settings.operatorEmailSecondary = operatorEmailSecondary || undefined;
      settings.enabled = enabled !== undefined ? enabled : settings.enabled;

      // Merge notification settings
      if (notifications) {
        settings.notifications = {
          ...settings.notifications,
          ...notifications,
        };
      }

      // Track who updated
      if (req.user) {
        settings.updatedBy = (req.user as any).id;
      }

      await this.settingsRepository.save(settings);

      return res.json({
        success: true,
        data: {
          operatorEmail: settings.operatorEmail,
          operatorEmailSecondary: settings.operatorEmailSecondary || '',
          notifications: settings.notifications,
          enabled: settings.enabled,
          serviceCode: settings.serviceCode,
          updatedAt: settings.updatedAt,
        },
        message: '알림 설정이 저장되었습니다.'
      });
    } catch (error) {
      console.error('Failed to update operator notification settings:', error);
      return res.status(500).json({
        success: false,
        error: '알림 설정 저장에 실패했습니다.'
      });
    }
  };

  /**
   * Get operator email for a specific service
   * Used internally by email service when sending notifications
   */
  static async getOperatorEmail(serviceCode: string): Promise<{ primary: string; secondary?: string } | null> {
    try {
      const repository = AppDataSource.getRepository(OperatorNotificationSettings);
      const settings = await repository.findOne({
        where: { serviceCode, enabled: true }
      });

      if (!settings || !settings.operatorEmail) {
        return null;
      }

      return {
        primary: settings.operatorEmail,
        secondary: settings.operatorEmailSecondary,
      };
    } catch (error) {
      console.error(`Failed to get operator email for ${serviceCode}:`, error);
      return null;
    }
  }

  /**
   * Check if a specific notification type is enabled for a service
   */
  static async isNotificationEnabled(
    serviceCode: string,
    notificationType: keyof NotificationTypeSettings
  ): Promise<boolean> {
    try {
      const repository = AppDataSource.getRepository(OperatorNotificationSettings);
      const settings = await repository.findOne({
        where: { serviceCode, enabled: true }
      });

      if (!settings) {
        // Default to enabled for most notification types
        return notificationType !== 'dailyReport';
      }

      return settings.notifications[notificationType] ?? true;
    } catch (error) {
      console.error(`Failed to check notification enabled for ${serviceCode}:`, error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Update last notification timestamp
   */
  static async updateLastNotificationTime(serviceCode: string): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(OperatorNotificationSettings);
      await repository.update(
        { serviceCode },
        { lastNotificationAt: new Date() }
      );
    } catch (error) {
      console.error(`Failed to update last notification time for ${serviceCode}:`, error);
    }
  }
}
