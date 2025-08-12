"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorAlertService = void 0;
exports.captureError = captureError;
const events_1 = require("events");
const logger_1 = __importDefault(require("../utils/logger"));
const emailService_1 = require("./emailService");
const webhookService_1 = require("./webhookService");
class ErrorAlertService extends events_1.EventEmitter {
    constructor() {
        super();
        this.alerts = [];
        this.lastNotification = {};
        this.errorCounts = {};
        this.isInitialized = false;
        this.config = this.loadConfig();
    }
    loadConfig() {
        return {
            enabled: process.env.ERROR_ALERTS_ENABLED !== 'false',
            emailNotifications: {
                enabled: process.env.ERROR_EMAIL_ENABLED === 'true',
                recipients: (process.env.ERROR_EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
                minLevel: process.env.ERROR_EMAIL_MIN_LEVEL || 'error',
                throttleMinutes: parseInt(process.env.ERROR_EMAIL_THROTTLE || '5')
            },
            webhookNotifications: {
                enabled: process.env.ERROR_WEBHOOK_ENABLED === 'true',
                url: process.env.ERROR_WEBHOOK_URL || '',
                minLevel: process.env.ERROR_WEBHOOK_MIN_LEVEL || 'error'
            },
            slackNotifications: process.env.SLACK_WEBHOOK_URL ? {
                enabled: true,
                webhookUrl: process.env.SLACK_WEBHOOK_URL,
                channel: process.env.SLACK_CHANNEL || '#alerts',
                minLevel: process.env.SLACK_MIN_LEVEL || 'critical'
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
    async initialize() {
        if (this.isInitialized)
            return;
        logger_1.default.info('🚨 Initializing Error Alert Service...');
        // Setup error handlers
        this.setupGlobalErrorHandlers();
        // Load previous alerts
        await this.loadAlerts();
        // Start auto-resolve timer
        setInterval(() => this.autoResolveAlerts(), 60000); // Check every minute
        this.isInitialized = true;
        logger_1.default.info('✅ Error Alert Service initialized');
    }
    setupGlobalErrorHandlers() {
        // Catch unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.captureError(new Error((reason === null || reason === void 0 ? void 0 : reason.message) || 'Unhandled Promise Rejection'), {
                category: 'system',
                level: 'critical',
                details: { reason, promise }
            });
        });
        // Catch uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.captureError(error, {
                category: 'system',
                level: 'critical'
            });
        });
    }
    async captureError(error, options = {}) {
        const { category = 'general', level = 'error', details, affectedUsers, skipNotification = false } = options;
        const alert = {
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
            logger_1.default.error(logMessage, details);
        }
        else {
            logger_1.default.warn(logMessage, details);
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
    checkThresholds(alert) {
        const key = `${alert.category}:${alert.message}`;
        const now = Date.now();
        if (!this.errorCounts[key]) {
            this.errorCounts[key] = { count: 0, firstSeen: new Date() };
        }
        this.errorCounts[key].count++;
        // Check if threshold exceeded
        const threshold = this.config.errorThresholds[alert.category];
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
        Object.keys(this.errorCounts).forEach((k) => {
            const timeDiff = now - this.errorCounts[k].firstSeen.getTime();
            if (timeDiff > 3600000) { // 1 hour
                delete this.errorCounts[k];
            }
        });
    }
    shouldNotify(alert) {
        var _a;
        if (!this.config.enabled)
            return false;
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
        if ((_a = this.config.slackNotifications) === null || _a === void 0 ? void 0 : _a.enabled) {
            const minPriority = levelPriority[this.config.slackNotifications.minLevel];
            if (alertPriority >= minPriority) {
                return true;
            }
        }
        return false;
    }
    async sendNotifications(alert) {
        var _a;
        const notifications = [];
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
        if ((_a = this.config.slackNotifications) === null || _a === void 0 ? void 0 : _a.enabled) {
            notifications.push(this.sendSlackNotification(alert));
        }
        await Promise.allSettled(notifications);
    }
    async sendEmailNotification(alert) {
        var _a;
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
            await emailService_1.emailService.sendEmail({
                to: this.config.emailNotifications.recipients,
                subject: `[${alert.level.toUpperCase()}] O4O Platform: ${alert.message.substring(0, 50)}${alert.message.length > 50 ? '...' : ''}`,
                html
            });
            (_a = alert.notificationsSent) === null || _a === void 0 ? void 0 : _a.push('email');
        }
        catch (error) {
            logger_1.default.error('Failed to send email notification:', error);
        }
    }
    async sendWebhookNotification(alert) {
        var _a;
        try {
            await webhookService_1.webhookService.sendWebhook(this.config.webhookNotifications.url, {
                type: 'error_alert',
                alert
            });
            (_a = alert.notificationsSent) === null || _a === void 0 ? void 0 : _a.push('webhook');
        }
        catch (error) {
            logger_1.default.error('Failed to send webhook notification:', error);
        }
    }
    async sendSlackNotification(alert) {
        var _a;
        if (!this.config.slackNotifications)
            return;
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
            (_a = alert.notificationsSent) === null || _a === void 0 ? void 0 : _a.push('slack');
        }
        catch (error) {
            logger_1.default.error('Failed to send Slack notification:', error);
        }
    }
    autoResolveAlerts() {
        const now = Date.now();
        const autoResolveMs = this.config.autoResolveMinutes * 60000;
        this.alerts.forEach((alert) => {
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
    getAlerts(options = {}) {
        let filtered = [...this.alerts];
        if (options.category) {
            filtered = filtered.filter((a) => a.category === options.category);
        }
        if (options.level) {
            filtered = filtered.filter((a) => a.level === options.level);
        }
        if (options.resolved !== undefined) {
            filtered = filtered.filter((a) => a.resolved === options.resolved);
        }
        if (options.startDate) {
            filtered = filtered.filter((a) => a.timestamp >= options.startDate);
        }
        if (options.endDate) {
            filtered = filtered.filter((a) => a.timestamp <= options.endDate);
        }
        if (options.limit) {
            filtered = filtered.slice(0, options.limit);
        }
        return filtered;
    }
    getStats() {
        const stats = {
            total: this.alerts.length,
            critical: 0,
            error: 0,
            warning: 0,
            info: 0,
            byCategory: {},
            recent: [],
            topErrors: []
        };
        const errorCounts = {};
        this.alerts.forEach((alert) => {
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
    resolveAlert(alertId) {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (alert && !alert.resolved) {
            alert.resolved = true;
            alert.resolvedAt = new Date();
            this.saveAlerts();
            return true;
        }
        return false;
    }
    clearAlerts(options = {}) {
        const before = this.alerts.length;
        if (options.category) {
            this.alerts = this.alerts.filter((a) => a.category !== options.category);
        }
        if (options.olderThan) {
            this.alerts = this.alerts.filter((a) => a.timestamp > options.olderThan);
        }
        const removed = before - this.alerts.length;
        if (removed > 0) {
            this.saveAlerts();
        }
        return removed;
    }
    async loadAlerts() {
        // In production, load from database
        // For now, just initialize empty
        this.alerts = [];
    }
    async saveAlerts() {
        // In production, save to database
        // For now, just keep in memory
    }
}
// Singleton instance
exports.errorAlertService = new ErrorAlertService();
// Convenience function for capturing errors
function captureError(error, options) {
    return exports.errorAlertService.captureError(error, options);
}
//# sourceMappingURL=ErrorAlertService.js.map