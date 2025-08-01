import { EventEmitter } from 'events';
import logger from '../utils/logger';
import { emailService } from './emailService';
import { webhookService } from './webhookService';

export interface ErrorAlert {
  id: string;
  timestamp: Date;
  level: 'critical' | 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: any;
  stack?: string;
  affectedUsers?: number;
  resolved?: boolean;
  resolvedAt?: Date;
  notificationsSent?: string[];
}

export interface ErrorAlertConfig {
  enabled: boolean;
  emailNotifications: {
    enabled: boolean;
    recipients: string[];
    minLevel: 'critical' | 'error' | 'warning' | 'info';
    throttleMinutes: number;
  };
  webhookNotifications: {
    enabled: boolean;
    url: string;
    minLevel: 'critical' | 'error' | 'warning' | 'info';
  };
  slackNotifications?: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    minLevel: 'critical' | 'error' | 'warning' | 'info';
  };
  errorThresholds: {
    database: { count: number; timeWindow: number }; // errors within minutes
    api: { count: number; timeWindow: number };
    auth: { count: number; timeWindow: number };
    payment: { count: number; timeWindow: number };
    file: { count: number; timeWindow: number };
  };
  autoResolveMinutes: number;
}

export interface ErrorStats {
  total: number;
  critical: number;
  error: number;
  warning: number;
  info: number;
  byCategory: Record<string, number>;
  recent: ErrorAlert[];
  topErrors: Array<{ message: string; count: number }>;
}

class ErrorAlertService extends EventEmitter {
  private alerts: ErrorAlert[] = [];
  private config: ErrorAlertConfig;
  private lastNotification: Record<string, Date> = {};
  private errorCounts: Record<string, { count: number; firstSeen: Date }> = {};
  private isInitialized = false;

  constructor() {
    super();
    this.config = this.loadConfig();
  }

  private loadConfig(): ErrorAlertConfig {
    return {
      enabled: process.env.ERROR_ALERTS_ENABLED !== 'false',
      emailNotifications: {
        enabled: process.env.ERROR_EMAIL_ENABLED === 'true',
        recipients: (process.env.ERROR_EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
        minLevel: (process.env.ERROR_EMAIL_MIN_LEVEL as any) || 'error',
        throttleMinutes: parseInt(process.env.ERROR_EMAIL_THROTTLE || '5')
      },
      webhookNotifications: {
        enabled: process.env.ERROR_WEBHOOK_ENABLED === 'true',
        url: process.env.ERROR_WEBHOOK_URL || '',
        minLevel: (process.env.ERROR_WEBHOOK_MIN_LEVEL as any) || 'error'
      },
      slackNotifications: process.env.SLACK_WEBHOOK_URL ? {
        enabled: true,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#alerts',
        minLevel: (process.env.SLACK_MIN_LEVEL as any) || 'critical'
      } : undefined,
      errorThresholds: {
        database: { count: 3, timeWindow: 5 },
        api: { count: 10, timeWindow: 5 },
        auth: { count: 5, timeWindow: 5 },
        payment: { count: 2, timeWindow: 10 },
        file: { count: 5, timeWindow: 5 }
      },
      autoResolveMinutes: 30
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('🚨 Initializing Error Alert Service...');

    // Setup error handlers
    this.setupGlobalErrorHandlers();

    // Load previous alerts
    await this.loadAlerts();

    // Start auto-resolve timer
    setInterval(() => this.autoResolveAlerts(), 60000); // Check every minute

    this.isInitialized = true;
    logger.info('✅ Error Alert Service initialized');
  }

  private setupGlobalErrorHandlers(): void {
    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise) => {
      this.captureError(new Error(reason?.message || 'Unhandled Promise Rejection'), {
        category: 'system',
        level: 'critical',
        details: { reason, promise }
      });
    });

    // Catch uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.captureError(error, {
        category: 'system',
        level: 'critical'
      });
    });
  }

  async captureError(
    error: Error | string,
    options: {
      category?: string;
      level?: 'critical' | 'error' | 'warning' | 'info';
      details?: any;
      affectedUsers?: number;
      skipNotification?: boolean;
    } = {}
  ): Promise<ErrorAlert> {
    const {
      category = 'general',
      level = 'error',
      details,
      affectedUsers,
      skipNotification = false
    } = options;

    const alert: ErrorAlert = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message: typeof error === 'string' ? error : error.message,
      details,
      stack: error instanceof Error ? error.stack : undefined,
      affectedUsers,
      resolved: false,
      notificationsSent: []
    };

    // Add to alerts
    this.alerts.unshift(alert);
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }

    // Check thresholds
    this.checkThresholds(alert);

    // Log the error
    const logMessage = `[${level.toUpperCase()}] ${category}: ${alert.message}`;
    if (level === 'critical' || level === 'error') {
      logger.error(logMessage, details);
    } else {
      logger.warn(logMessage, details);
    }

    // Send notifications
    if (!skipNotification && this.shouldNotify(alert)) {
      await this.sendNotifications(alert);
    }

    // Emit event
    this.emit('error', alert);

    // Save alerts
    await this.saveAlerts();

    return alert;
  }

  private checkThresholds(alert: ErrorAlert): void {
    const key = `${alert.category}:${alert.message}`;
    const now = Date.now();

    if (!this.errorCounts[key]) {
      this.errorCounts[key] = { count: 0, firstSeen: new Date() };
    }

    this.errorCounts[key].count++;

    // Check if threshold exceeded
    const threshold = this.config.errorThresholds[alert.category as keyof typeof this.config.errorThresholds];
    if (threshold) {
      const timeDiff = now - this.errorCounts[key].firstSeen.getTime();
      const minutesDiff = timeDiff / 60000;

      if (minutesDiff <= threshold.timeWindow && this.errorCounts[key].count >= threshold.count) {
        // Upgrade to critical
        alert.level = 'critical';
        alert.message = `THRESHOLD EXCEEDED: ${alert.message} (${this.errorCounts[key].count} times in ${Math.round(minutesDiff)} minutes)`;
      }
    }

    // Clean old entries
    Object.keys(this.errorCounts).forEach(k => {
      const timeDiff = now - this.errorCounts[k].firstSeen.getTime();
      if (timeDiff > 3600000) { // 1 hour
        delete this.errorCounts[k];
      }
    });
  }

  private shouldNotify(alert: ErrorAlert): boolean {
    if (!this.config.enabled) return false;

    const levelPriority = { critical: 4, error: 3, warning: 2, info: 1 };
    const alertPriority = levelPriority[alert.level];

    // Check email notifications
    if (this.config.emailNotifications.enabled) {
      const minPriority = levelPriority[this.config.emailNotifications.minLevel];
      if (alertPriority >= minPriority) {
        // Check throttling
        const lastEmail = this.lastNotification.email;
        if (!lastEmail || Date.now() - lastEmail.getTime() > this.config.emailNotifications.throttleMinutes * 60000) {
          return true;
        }
      }
    }

    // Check webhook notifications
    if (this.config.webhookNotifications.enabled) {
      const minPriority = levelPriority[this.config.webhookNotifications.minLevel];
      if (alertPriority >= minPriority) {
        return true;
      }
    }

    // Check Slack notifications
    if (this.config.slackNotifications?.enabled) {
      const minPriority = levelPriority[this.config.slackNotifications.minLevel];
      if (alertPriority >= minPriority) {
        return true;
      }
    }

    return false;
  }

  private async sendNotifications(alert: ErrorAlert): Promise<void> {
    const notifications: Promise<void>[] = [];

    // Email notification
    if (this.config.emailNotifications.enabled && this.config.emailNotifications.recipients.length > 0) {
      const lastEmail = this.lastNotification.email;
      if (!lastEmail || Date.now() - lastEmail.getTime() > this.config.emailNotifications.throttleMinutes * 60000) {
        notifications.push(this.sendEmailNotification(alert));
        this.lastNotification.email = new Date();
      }
    }

    // Webhook notification
    if (this.config.webhookNotifications.enabled && this.config.webhookNotifications.url) {
      notifications.push(this.sendWebhookNotification(alert));
    }

    // Slack notification
    if (this.config.slackNotifications?.enabled) {
      notifications.push(this.sendSlackNotification(alert));
    }

    await Promise.allSettled(notifications);
  }

  private async sendEmailNotification(alert: ErrorAlert): Promise<void> {
    try {
      const emoji = {
        critical: '🚨',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };

      const html = `
        <h2>${emoji[alert.level]} ${alert.level.toUpperCase()}: ${alert.category}</h2>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
        ${alert.affectedUsers ? `<p><strong>Affected Users:</strong> ${alert.affectedUsers}</p>` : ''}
        ${alert.details ? `<pre>${JSON.stringify(alert.details, null, 2)}</pre>` : ''}
        ${alert.stack ? `<h3>Stack Trace:</h3><pre>${alert.stack}</pre>` : ''}
        <hr>
        <p><a href="${process.env.APP_URL}/admin/monitoring/errors/${alert.id}">View in Dashboard</a></p>
      `;

      await emailService.sendEmail({
        to: this.config.emailNotifications.recipients,
        subject: `[${alert.level.toUpperCase()}] O4O Platform: ${alert.message.substring(0, 50)}${alert.message.length > 50 ? '...' : ''}`,
        html
      });

      alert.notificationsSent?.push('email');
    } catch (error) {
      logger.error('Failed to send email notification:', error);
    }
  }

  private async sendWebhookNotification(alert: ErrorAlert): Promise<void> {
    try {
      await webhookService.sendWebhook(this.config.webhookNotifications.url, {
        type: 'error_alert',
        alert
      });

      alert.notificationsSent?.push('webhook');
    } catch (error) {
      logger.error('Failed to send webhook notification:', error);
    }
  }

  private async sendSlackNotification(alert: ErrorAlert): Promise<void> {
    if (!this.config.slackNotifications) return;

    try {
      const emoji = {
        critical: '🚨',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };

      const color = {
        critical: '#ff0000',
        error: '#ff6600',
        warning: '#ffcc00',
        info: '#0099ff'
      };

      const payload = {
        channel: this.config.slackNotifications.channel,
        attachments: [{
          color: color[alert.level],
          title: `${emoji[alert.level]} ${alert.level.toUpperCase()}: ${alert.category}`,
          text: alert.message,
          fields: [
            { title: 'Time', value: alert.timestamp.toLocaleString(), short: true },
            { title: 'ID', value: alert.id, short: true }
          ],
          footer: 'O4O Platform Error Alert',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }]
      };

      if (alert.affectedUsers) {
        payload.attachments[0].fields.push({
          title: 'Affected Users',
          value: alert.affectedUsers.toString(),
          short: true
        });
      }

      await fetch(this.config.slackNotifications.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      alert.notificationsSent?.push('slack');
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
    }
  }

  private autoResolveAlerts(): void {
    const now = Date.now();
    const autoResolveMs = this.config.autoResolveMinutes * 60000;

    this.alerts.forEach(alert => {
      if (!alert.resolved && alert.level !== 'critical') {
        const age = now - alert.timestamp.getTime();
        if (age > autoResolveMs) {
          alert.resolved = true;
          alert.resolvedAt = new Date();
        }
      }
    });
  }

  // Public methods
  getAlerts(options: {
    limit?: number;
    category?: string;
    level?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}): ErrorAlert[] {
    let filtered = [...this.alerts];

    if (options.category) {
      filtered = filtered.filter(a => a.category === options.category);
    }

    if (options.level) {
      filtered = filtered.filter(a => a.level === options.level);
    }

    if (options.resolved !== undefined) {
      filtered = filtered.filter(a => a.resolved === options.resolved);
    }

    if (options.startDate) {
      filtered = filtered.filter(a => a.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter(a => a.timestamp <= options.endDate!);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  getStats(): ErrorStats {
    const stats: ErrorStats = {
      total: this.alerts.length,
      critical: 0,
      error: 0,
      warning: 0,
      info: 0,
      byCategory: {},
      recent: [],
      topErrors: []
    };

    const errorCounts: Record<string, number> = {};

    this.alerts.forEach(alert => {
      // Count by level
      stats[alert.level]++;

      // Count by category
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;

      // Count error messages
      if (!alert.resolved) {
        errorCounts[alert.message] = (errorCounts[alert.message] || 0) + 1;
      }
    });

    // Recent alerts
    stats.recent = this.alerts.slice(0, 10);

    // Top errors
    stats.topErrors = Object.entries(errorCounts)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.saveAlerts();
      return true;
    }
    return false;
  }

  clearAlerts(options: { category?: string; olderThan?: Date } = {}): number {
    const before = this.alerts.length;

    if (options.category) {
      this.alerts = this.alerts.filter(a => a.category !== options.category);
    }

    if (options.olderThan) {
      this.alerts = this.alerts.filter(a => a.timestamp > options.olderThan!);
    }

    const removed = before - this.alerts.length;
    if (removed > 0) {
      this.saveAlerts();
    }

    return removed;
  }

  private async loadAlerts(): Promise<void> {
    // In production, load from database
    // For now, just initialize empty
    this.alerts = [];
  }

  private async saveAlerts(): Promise<void> {
    // In production, save to database
    // For now, just keep in memory
  }
}

// Singleton instance
export const errorAlertService = new ErrorAlertService();

// Convenience function for capturing errors
export function captureError(
  error: Error | string,
  options?: Parameters<typeof errorAlertService.captureError>[1]
): Promise<ErrorAlert> {
  return errorAlertService.captureError(error, options);
}