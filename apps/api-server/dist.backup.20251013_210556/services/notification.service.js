"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const connection_1 = require("../database/connection");
const Notification_1 = require("../entities/Notification");
const NotificationTemplate_1 = require("../entities/NotificationTemplate");
const email_service_1 = require("./email.service");
const cache_service_1 = require("./cache.service");
const logger_1 = __importDefault(require("../utils/logger"));
const events_1 = require("events");
class NotificationService extends events_1.EventEmitter {
    constructor() {
        super();
        this.notificationRepository = connection_1.AppDataSource.getRepository(Notification_1.Notification);
        this.templateRepository = connection_1.AppDataSource.getRepository(NotificationTemplate_1.NotificationTemplate);
        // Notification queue management
        this.processingQueue = new Map();
        this.retryQueue = new Map();
        this.emailService = new email_service_1.EmailService();
        this.startQueueProcessor();
    }
    async sendNotification(notificationData) {
        try {
            const errors = [];
            let notificationId;
            // Validate notification data
            const validationResult = this.validateNotificationData(notificationData);
            if (!validationResult.valid) {
                return { success: false, errors: validationResult.errors };
            }
            // Create notification record
            const notification = this.notificationRepository.create({
                type: notificationData.type,
                title: notificationData.template || 'Notification',
                message: JSON.stringify(notificationData.data) || 'Notification message',
                recipientId: notificationData.recipients[0] || '',
                data: {
                    ...notificationData.data,
                    recipients: notificationData.recipients,
                    template: notificationData.template,
                    priority: notificationData.priority,
                    source: notificationData.source,
                    status: 'pending'
                }
            });
            const savedNotification = await this.notificationRepository.save(notification);
            notificationId = savedNotification.id;
            // If scheduled for future, add to scheduled queue
            if (notificationData.scheduledAt && notificationData.scheduledAt > new Date()) {
                await this.scheduleNotification(notificationData, notificationId);
                return { success: true, notificationId };
            }
            // Process immediately based on priority
            if (notificationData.priority === 'urgent') {
                const result = await this.processNotificationImmediately(notificationData, notificationId);
                return { success: result.success, notificationId, errors: result.errors };
            }
            else {
                // Add to processing queue
                await this.addToQueue(notificationData, notificationId);
                return { success: true, notificationId };
            }
        }
        catch (error) {
            logger_1.default.error('Error sending notification:', error);
            return { success: false, errors: [error.message] };
        }
    }
    async sendBulkNotifications(notifications) {
        try {
            const results = [];
            for (const notificationData of notifications) {
                const result = await this.sendNotification(notificationData);
                results.push(result);
            }
            const successCount = results.filter(r => r.success).length;
            const overallSuccess = successCount === notifications.length;
            logger_1.default.info('Bulk notifications processed', {
                total: notifications.length,
                successful: successCount,
                failed: notifications.length - successCount
            });
            return {
                success: overallSuccess,
                results
            };
        }
        catch (error) {
            logger_1.default.error('Error sending bulk notifications:', error);
            throw error;
        }
    }
    async processNotificationImmediately(notificationData, notificationId) {
        try {
            const template = await this.getTemplate(notificationData.template);
            if (!template) {
                throw new Error(`Template not found: ${notificationData.template}`);
            }
            const processedRecipients = await this.resolveRecipients(notificationData.recipients);
            const errors = [];
            for (const recipient of processedRecipients) {
                try {
                    await this.sendToRecipient(notificationData.type, recipient, template, notificationData.data);
                }
                catch (error) {
                    errors.push(`Failed to send to ${recipient.id}: ${error.message}`);
                    logger_1.default.error(`Notification failed for recipient ${recipient.id}:`, error);
                }
            }
            // Update notification status
            const status = errors.length === 0 ? 'sent' :
                errors.length < processedRecipients.length ? 'partial' : 'failed';
            // Update notification status in the data field
            const currentNotification = await this.notificationRepository.findOne({ where: { id: notificationId } });
            if (currentNotification) {
                await this.notificationRepository.update(notificationId, {
                    data: {
                        ...currentNotification.data,
                        status,
                        sentAt: status !== 'failed' ? new Date() : undefined,
                        failureReason: errors.length > 0 ? errors.join('; ') : undefined,
                        attemptCount: 1
                    }
                });
            }
            this.emit('notification_processed', {
                notificationId,
                status,
                recipientCount: processedRecipients.length,
                errorCount: errors.length
            });
            return {
                success: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };
        }
        catch (error) {
            // Update notification status in the data field for failed notifications
            const currentNotification = await this.notificationRepository.findOne({ where: { id: notificationId } });
            if (currentNotification) {
                await this.notificationRepository.update(notificationId, {
                    data: {
                        ...currentNotification.data,
                        failedAt: new Date(),
                        failureReason: error.message,
                        attemptCount: 1
                    }
                });
            }
            logger_1.default.error('Error processing notification immediately:', error);
            return { success: false, errors: [error.message] };
        }
    }
    async sendToRecipient(type, recipient, template, data) {
        const compiledContent = this.compileTemplate(template, { ...data, recipient });
        switch (type) {
            case 'email':
                await this.sendEmail(recipient, template, compiledContent);
                break;
            case 'sms':
                await this.sendSMS(recipient, compiledContent);
                break;
            case 'push':
                await this.sendPushNotification(recipient, template, compiledContent);
                break;
            case 'in_app':
                await this.sendInAppNotification(recipient, compiledContent);
                break;
            case 'webhook':
                await this.sendWebhook(recipient, template, compiledContent);
                break;
            case 'tracking':
                await this.sendTrackingNotification(recipient, compiledContent);
                break;
            default:
                throw new Error(`Unsupported notification type: ${type}`);
        }
    }
    async sendEmail(recipient, template, content) {
        await this.emailService.sendEmail({
            to: recipient.email,
            subject: content.subject,
            html: content.emailBody
        });
    }
    async sendSMS(recipient, content) {
        // SMS service integration would go here
        logger_1.default.info('SMS notification sent', {
            phone: recipient.phone,
            message: content.smsBody
        });
    }
    async sendPushNotification(recipient, template, content) {
        // Push notification service integration would go here
        logger_1.default.info('Push notification sent', {
            userId: recipient.id,
            title: content.pushTitle,
            body: content.pushBody
        });
    }
    async sendInAppNotification(recipient, content) {
        // Save in-app notification to database
        const inAppNotification = this.notificationRepository.create({
            type: 'in_app',
            recipient: recipient.id,
            data: content,
            createdAt: new Date()
        });
        await this.notificationRepository.save(inAppNotification);
    }
    async sendWebhook(recipient, template, content) {
        // Webhook delivery service integration
        const webhookData = {
            ...content.webhookPayload,
            recipient: recipient.id,
            timestamp: new Date().toISOString()
        };
        logger_1.default.info('Webhook notification sent', {
            url: recipient.webhookUrl,
            data: webhookData
        });
    }
    async sendTrackingNotification(recipient, content) {
        await this.emailService.sendEmail({
            to: recipient.email,
            subject: `Order Tracking Update - ${content.trackingNumber}`,
            html: `
        <div>
          <h2>Your order is on the way!</h2>
          <p>Tracking Number: <strong>${content.trackingNumber}</strong></p>
          <p>Carrier: ${content.carrierName}</p>
          <p>Status: ${content.status}</p>
          <p><a href="${content.trackingUrl}" target="_blank">Track Your Package</a></p>
        </div>
      `
        });
    }
    compileTemplate(template, data) {
        const compiled = {};
        if (template.subject) {
            compiled.subject = this.interpolateString(template.subject, data);
        }
        if (template.emailBody) {
            compiled.emailBody = this.interpolateString(template.emailBody, data);
        }
        if (template.smsBody) {
            compiled.smsBody = this.interpolateString(template.smsBody, data);
        }
        if (template.pushTitle) {
            compiled.pushTitle = this.interpolateString(template.pushTitle, data);
        }
        if (template.pushBody) {
            compiled.pushBody = this.interpolateString(template.pushBody, data);
        }
        if (template.webhookPayload) {
            compiled.webhookPayload = this.interpolateObject(template.webhookPayload, data);
        }
        return compiled;
    }
    interpolateString(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = this.getNestedValue(data, key);
            return value !== undefined ? String(value) : match;
        });
    }
    interpolateObject(template, data) {
        const result = {};
        for (const [key, value] of Object.entries(template)) {
            if (typeof value === 'string') {
                result[key] = this.interpolateString(value, data);
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = this.interpolateObject(value, data);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current === null || current === void 0 ? void 0 : current[key], obj);
    }
    async resolveRecipients(recipients) {
        const resolved = [];
        for (const recipient of recipients) {
            if (recipient.startsWith('customer:')) {
                const customerId = recipient.replace('customer:', '');
                const customer = await this.getCustomerDetails(customerId);
                if (customer)
                    resolved.push(customer);
            }
            else if (recipient.startsWith('vendor:')) {
                const vendorId = recipient.replace('vendor:', '');
                const vendor = await this.getVendorDetails(vendorId);
                if (vendor)
                    resolved.push(vendor);
            }
            else if (recipient.startsWith('supplier:')) {
                const supplierId = recipient.replace('supplier:', '');
                const supplier = await this.getSupplierDetails(supplierId);
                if (supplier)
                    resolved.push(supplier);
            }
            else if (recipient === 'admin') {
                const adminUsers = await this.getAdminUsers();
                resolved.push(...adminUsers);
            }
            else {
                // Assume it's an email address
                resolved.push({ id: recipient, email: recipient });
            }
        }
        return resolved;
    }
    async getCustomerDetails(customerId) {
        try {
            const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database/connection')));
            const userRepository = AppDataSource.getRepository('User');
            return await userRepository.findOne({
                where: { id: customerId },
                select: ['id', 'email', 'phone', 'firstName', 'lastName']
            });
        }
        catch (error) {
            logger_1.default.error('Error getting customer details:', error);
            return null;
        }
    }
    async getVendorDetails(vendorId) {
        try {
            const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database/connection')));
            const vendorRepository = AppDataSource.getRepository('VendorInfo');
            const vendor = await vendorRepository.findOne({
                where: { id: vendorId },
                relations: ['user']
            });
            return (vendor === null || vendor === void 0 ? void 0 : vendor.user) ? {
                id: vendor.user.id,
                email: vendor.user.email,
                phone: vendor.user.phone,
                firstName: vendor.user.firstName,
                lastName: vendor.user.lastName,
                vendorName: vendor.businessName
            } : null;
        }
        catch (error) {
            logger_1.default.error('Error getting vendor details:', error);
            return null;
        }
    }
    async getSupplierDetails(supplierId) {
        try {
            const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database/connection')));
            const supplierRepository = AppDataSource.getRepository('Supplier');
            const supplier = await supplierRepository.findOne({
                where: { id: supplierId },
                relations: ['user']
            });
            return (supplier === null || supplier === void 0 ? void 0 : supplier.user) ? {
                id: supplier.user.id,
                email: supplier.user.email,
                phone: supplier.user.phone,
                firstName: supplier.user.firstName,
                lastName: supplier.user.lastName,
                supplierName: supplier.name
            } : null;
        }
        catch (error) {
            logger_1.default.error('Error getting supplier details:', error);
            return null;
        }
    }
    async getAdminUsers() {
        try {
            const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../database/connection')));
            const userRepository = AppDataSource.getRepository('User');
            const adminUsers = await userRepository.find({
                where: { role: 'admin' },
                select: ['id', 'email', 'phone', 'firstName', 'lastName']
            });
            return adminUsers;
        }
        catch (error) {
            logger_1.default.error('Error getting admin users:', error);
            return [];
        }
    }
    async getTemplate(templateName) {
        try {
            const cacheKey = `notification_template:${templateName}`;
            let template = await cache_service_1.cacheService.get(cacheKey);
            if (!template) {
                template = await this.templateRepository.findOne({
                    where: { name: templateName, isActive: true }
                });
                if (template) {
                    await cache_service_1.cacheService.set(cacheKey, template, { ttl: 3600 });
                }
            }
            return template;
        }
        catch (error) {
            logger_1.default.error('Error getting notification template:', error);
            return null;
        }
    }
    validateNotificationData(data) {
        const errors = [];
        if (!data.type) {
            errors.push('Notification type is required');
        }
        if (!data.recipients || data.recipients.length === 0) {
            errors.push('At least one recipient is required');
        }
        if (!data.template) {
            errors.push('Template is required');
        }
        if (!data.priority) {
            errors.push('Priority is required');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    async addToQueue(data, notificationId) {
        const queueKey = `${data.priority}_${data.type}`;
        if (!this.processingQueue.has(queueKey)) {
            this.processingQueue.set(queueKey, []);
        }
        this.processingQueue.get(queueKey).push({ ...data, notificationId });
    }
    async scheduleNotification(data, notificationId) {
        const delay = data.scheduledAt.getTime() - Date.now();
        setTimeout(async () => {
            try {
                await this.processNotificationImmediately(data, notificationId);
            }
            catch (error) {
                logger_1.default.error('Error processing scheduled notification:', error);
            }
        }, delay);
    }
    startQueueProcessor() {
        // Process high priority queue every 10 seconds
        setInterval(async () => {
            await this.processQueue('urgent_email');
            await this.processQueue('urgent_sms');
            await this.processQueue('urgent_push');
        }, 10000);
        // Process medium priority queue every 30 seconds
        setInterval(async () => {
            await this.processQueue('high_email');
            await this.processQueue('high_sms');
            await this.processQueue('high_push');
        }, 30000);
        // Process low priority queue every 2 minutes
        setInterval(async () => {
            await this.processQueue('medium_email');
            await this.processQueue('medium_sms');
            await this.processQueue('medium_push');
            await this.processQueue('low_email');
            await this.processQueue('low_sms');
            await this.processQueue('low_push');
        }, 120000);
        // Process retry queue every 5 minutes
        setInterval(async () => {
            await this.processRetryQueue();
        }, 300000);
    }
    async processQueue(queueKey) {
        const queue = this.processingQueue.get(queueKey);
        if (!queue || queue.length === 0)
            return;
        const batchSize = this.getBatchSize(queueKey);
        const batch = queue.splice(0, batchSize);
        for (const notification of batch) {
            try {
                await this.processNotificationImmediately(notification, notification.notificationId);
            }
            catch (error) {
                logger_1.default.error(`Error processing queued notification:`, error);
                await this.addToRetryQueue(notification);
            }
        }
    }
    getBatchSize(queueKey) {
        if (queueKey.startsWith('urgent'))
            return 50;
        if (queueKey.startsWith('high'))
            return 30;
        if (queueKey.startsWith('medium'))
            return 20;
        return 10;
    }
    async addToRetryQueue(notification) {
        var _a, _b;
        const retryKey = notification.notificationId || `retry_${Date.now()}`;
        const existing = this.retryQueue.get(retryKey);
        const attempts = existing ? existing.attempts + 1 : 1;
        const maxRetries = ((_a = notification.retryPolicy) === null || _a === void 0 ? void 0 : _a.maxRetries) || 3;
        if (attempts > maxRetries) {
            // Mark as permanently failed
            if (notification.notificationId) {
                await this.notificationRepository.update(notification.notificationId, {
                    updatedAt: new Date(),
                    failureReason: `Max retries exceeded (${maxRetries})`
                });
            }
            return;
        }
        const backoffMs = ((_b = notification.retryPolicy) === null || _b === void 0 ? void 0 : _b.backoffMs) || 5000;
        const nextRetry = new Date(Date.now() + (backoffMs * attempts));
        this.retryQueue.set(retryKey, {
            notification,
            attempts,
            nextRetry
        });
    }
    async processRetryQueue() {
        const now = new Date();
        for (const [key, retryData] of this.retryQueue.entries()) {
            if (retryData.nextRetry <= now) {
                try {
                    await this.processNotificationImmediately(retryData.notification, retryData.notification.notificationId);
                    this.retryQueue.delete(key);
                }
                catch (error) {
                    logger_1.default.error('Error processing retry notification:', error);
                    await this.addToRetryQueue(retryData.notification);
                    this.retryQueue.delete(key);
                }
            }
        }
    }
    async getNotificationStats() {
        try {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const [todayStats, weekStats] = await Promise.all([
                this.notificationRepository.find({
                    where: { createdAt: { $gte: oneDayAgo } }
                }),
                this.notificationRepository.find({
                    where: { createdAt: { $gte: sevenDaysAgo } }
                })
            ]);
            const totalSent = todayStats.filter((n) => n.sentAt).length;
            const totalFailed = todayStats.filter((n) => n.failedAt).length;
            const queueSizes = {};
            for (const [key, queue] of this.processingQueue.entries()) {
                queueSizes[key] = queue.length;
            }
            // Calculate recent activity for the last 7 days
            const recentActivity = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayNotifications = weekStats.filter(n => n.createdAt.toISOString().split('T')[0] === dateStr);
                recentActivity.push({
                    date: dateStr,
                    sent: dayNotifications.filter((n) => n.sentAt).length,
                    failed: dayNotifications.filter((n) => n.failedAt).length
                });
            }
            return {
                totalSent,
                totalFailed,
                queueSizes,
                retryQueueSize: this.retryQueue.size,
                recentActivity
            };
        }
        catch (error) {
            logger_1.default.error('Error getting notification stats:', error);
            throw error;
        }
    }
    async createTemplate(templateData) {
        try {
            const template = this.templateRepository.create(templateData);
            const savedTemplate = await this.templateRepository.save(template);
            // Invalidate template cache
            const cacheKey = `notification_template:${templateData.name}`;
            await cache_service_1.cacheService.delete(cacheKey);
            logger_1.default.info('Notification template created', { templateId: savedTemplate.id, name: savedTemplate.name });
            return savedTemplate;
        }
        catch (error) {
            logger_1.default.error('Error creating notification template:', error);
            throw error;
        }
    }
    async getNotificationHistory(filters = {}) {
        try {
            const queryBuilder = this.notificationRepository.createQueryBuilder('notification');
            if (filters.type) {
                queryBuilder.andWhere('notification.type = :type', { type: filters.type });
            }
            if (filters.status) {
                queryBuilder.andWhere('notification.status = :status', { status: filters.status });
            }
            if (filters.recipient) {
                queryBuilder.andWhere('notification.recipients @> :recipient', {
                    recipient: JSON.stringify([filters.recipient])
                });
            }
            if (filters.startDate) {
                queryBuilder.andWhere('notification.createdAt >= :startDate', { startDate: filters.startDate });
            }
            if (filters.endDate) {
                queryBuilder.andWhere('notification.createdAt <= :endDate', { endDate: filters.endDate });
            }
            queryBuilder.orderBy('notification.createdAt', 'DESC');
            if (filters.limit) {
                queryBuilder.limit(filters.limit);
            }
            if (filters.offset) {
                queryBuilder.offset(filters.offset);
            }
            const [notifications, total] = await queryBuilder.getManyAndCount();
            return { notifications, total };
        }
        catch (error) {
            logger_1.default.error('Error getting notification history:', error);
            throw error;
        }
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=notification.service.js.map