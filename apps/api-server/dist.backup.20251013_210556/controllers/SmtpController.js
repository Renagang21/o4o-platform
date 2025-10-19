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
Object.defineProperty(exports, "__esModule", { value: true });
exports.smtpController = exports.SmtpController = void 0;
const connection_1 = require("../database/connection");
const SmtpSettings_1 = require("../entities/SmtpSettings");
const EmailLog_1 = require("../entities/EmailLog");
const nodemailer = __importStar(require("nodemailer"));
class SmtpController {
    constructor() {
        /**
         * Get SMTP settings
         */
        this.getSettings = async (req, res) => {
            try {
                // Get the latest SMTP settings
                const settings = await this.smtpRepository.findOne({
                    order: { id: 'DESC' }
                });
                if (!settings) {
                    // Return default settings if none exist
                    return res.json({
                        enabled: false,
                        provider: 'smtp',
                        smtpHost: '',
                        smtpPort: 587,
                        smtpSecure: false,
                        smtpUser: '',
                        fromEmail: '',
                        fromName: '',
                        authMethod: 'login'
                    });
                }
                // Remove sensitive data
                const { password, clientSecret, refreshToken, accessToken, apiKey, apiSecret, ...safeSettings } = settings;
                // Add flag to indicate if credentials are set
                const response = {
                    ...safeSettings,
                    hasPassword: !!password,
                    hasApiKey: !!apiKey
                };
                res.json(response);
            }
            catch (error) {
                // Error log removed
                res.status(500).json({ error: 'Failed to get SMTP settings' });
            }
        };
        /**
         * Update SMTP settings
         */
        this.updateSettings = async (req, res) => {
            try {
                const { enabled, provider, fromName, fromEmail, replyToEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, authMethod, apiKey, apiSecret, region, maxEmailsPerHour, maxEmailsPerMinute } = req.body;
                // Find existing settings or create new
                let settings = await this.smtpRepository.findOne({
                    order: { id: 'DESC' }
                });
                if (!settings) {
                    settings = new SmtpSettings_1.SmtpSettings();
                }
                // Update settings
                settings.enabled = enabled !== null && enabled !== void 0 ? enabled : settings.enabled;
                settings.provider = provider || settings.provider;
                settings.fromName = fromName || settings.fromName;
                settings.fromEmail = fromEmail || settings.fromEmail;
                settings.replyToEmail = replyToEmail || settings.replyToEmail;
                // SMTP settings
                if (provider === 'smtp' || provider === 'custom') {
                    settings.host = smtpHost || settings.host;
                    settings.port = smtpPort || settings.port;
                    settings.secure = smtpSecure ? 'tls' : 'none';
                    settings.username = smtpUser || settings.username;
                    // Only update password if provided
                    if (smtpPass) {
                        settings.password = smtpPass;
                    }
                    settings.authMethod = authMethod || settings.authMethod;
                }
                // API-based providers
                if (['sendgrid', 'mailgun', 'ses'].includes(provider)) {
                    if (apiKey) {
                        settings.apiKey = apiKey;
                    }
                    if (apiSecret) {
                        settings.apiSecret = apiSecret;
                    }
                    if (region) {
                        settings.region = region;
                    }
                }
                // Rate limiting
                if (maxEmailsPerHour) {
                    settings.maxEmailsPerHour = maxEmailsPerHour;
                }
                if (maxEmailsPerMinute) {
                    settings.maxEmailsPerMinute = maxEmailsPerMinute;
                }
                // Save settings
                await this.smtpRepository.save(settings);
                // Return safe settings
                const { password, clientSecret, refreshToken, accessToken, ...safeSettings } = settings;
                res.json({
                    ...safeSettings,
                    hasPassword: !!password,
                    hasApiKey: !!apiKey,
                    message: 'SMTP settings updated successfully'
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({ error: 'Failed to update SMTP settings' });
            }
        };
        /**
         * Test SMTP connection and send test email
         */
        this.testConnection = async (req, res) => {
            try {
                const { testEmail } = req.body;
                if (!testEmail) {
                    return res.status(400).json({ error: 'Test email address is required' });
                }
                // Get current settings
                const settings = await this.smtpRepository.findOne({
                    order: { id: 'DESC' }
                });
                if (!settings || !settings.enabled) {
                    return res.status(400).json({ error: 'SMTP is not configured or disabled' });
                }
                // Create transporter based on provider
                let transporter;
                try {
                    if (settings.provider === 'smtp' || settings.provider === 'custom') {
                        transporter = nodemailer.createTransport({
                            host: settings.host,
                            port: settings.port,
                            secure: settings.secure === 'ssl',
                            auth: {
                                user: settings.username,
                                pass: settings.password
                            },
                            tls: {
                                rejectUnauthorized: false
                            }
                        });
                    }
                    else if (settings.provider === 'gmail') {
                        transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: settings.username,
                                pass: settings.password
                            }
                        });
                    }
                    else if (settings.provider === 'naver') {
                        transporter = nodemailer.createTransport({
                            host: 'smtp.naver.com',
                            port: 587,
                            secure: false,
                            auth: {
                                user: settings.username,
                                pass: settings.password
                            }
                        });
                    }
                    else if (settings.provider === 'daum') {
                        transporter = nodemailer.createTransport({
                            host: 'smtp.daum.net',
                            port: 465,
                            secure: true,
                            auth: {
                                user: settings.username,
                                pass: settings.password
                            }
                        });
                    }
                    else {
                        return res.status(400).json({ error: `Provider ${settings.provider} not supported` });
                    }
                    // Verify connection
                    await transporter.verify();
                    // Send test email
                    const info = await transporter.sendMail({
                        from: `"${settings.fromName || 'O4O Platform'}" <${settings.fromEmail}>`,
                        to: testEmail,
                        subject: 'SMTP 테스트 이메일',
                        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">SMTP 설정 테스트</h2>
              <p>이 이메일은 O4O Platform의 SMTP 설정 테스트 메일입니다.</p>
              <p>이메일이 정상적으로 수신되었다면 SMTP 설정이 올바르게 구성되었습니다.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <div style="color: #666; font-size: 12px;">
                <p><strong>설정 정보:</strong></p>
                <ul>
                  <li>Provider: ${settings.provider}</li>
                  <li>Host: ${settings.host || 'N/A'}</li>
                  <li>Port: ${settings.port || 'N/A'}</li>
                  <li>From: ${settings.fromEmail}</li>
                </ul>
              </div>
            </div>
          `,
                        text: 'SMTP 설정 테스트 - 이메일이 정상적으로 수신되었습니다.'
                    });
                    // Update test result
                    settings.testEmailAddress = testEmail;
                    settings.lastTestDate = new Date();
                    settings.lastTestSuccess = true;
                    settings.lastTestError = null;
                    await this.smtpRepository.save(settings);
                    // Log the test email
                    const log = new EmailLog_1.EmailLog();
                    log.recipient = testEmail;
                    log.sender = settings.fromEmail;
                    log.subject = 'SMTP 테스트 이메일';
                    log.status = 'sent';
                    log.messageId = info.messageId;
                    log.provider = settings.provider;
                    log.emailType = 'test';
                    log.sentAt = new Date();
                    await this.emailLogRepository.save(log);
                    res.json({
                        success: true,
                        message: '테스트 이메일이 성공적으로 발송되었습니다.',
                        messageId: info.messageId
                    });
                }
                catch (error) {
                    // Update test failure
                    settings.lastTestDate = new Date();
                    settings.lastTestSuccess = false;
                    settings.lastTestError = error.message;
                    await this.smtpRepository.save(settings);
                    // Log failed attempt
                    const log = new EmailLog_1.EmailLog();
                    log.recipient = testEmail;
                    log.subject = 'SMTP 테스트 이메일';
                    log.status = 'failed';
                    log.error = error.message;
                    log.provider = settings.provider;
                    log.emailType = 'test';
                    await this.emailLogRepository.save(log);
                    throw error;
                }
            }
            catch (error) {
                // Error log removed
                res.status(500).json({
                    error: 'SMTP 테스트 실패',
                    details: error.message
                });
            }
        };
        /**
         * Get email logs
         */
        this.getEmailLogs = async (req, res) => {
            try {
                const { page = 1, limit = 20, status, recipient, emailType, startDate, endDate } = req.query;
                const query = this.emailLogRepository.createQueryBuilder('log');
                // Apply filters
                if (status) {
                    query.andWhere('log.status = :status', { status });
                }
                if (recipient) {
                    query.andWhere('log.recipient LIKE :recipient', { recipient: `%${recipient}%` });
                }
                if (emailType) {
                    query.andWhere('log.emailType = :emailType', { emailType });
                }
                if (startDate) {
                    query.andWhere('log.createdAt >= :startDate', { startDate });
                }
                if (endDate) {
                    query.andWhere('log.createdAt <= :endDate', { endDate });
                }
                // Pagination
                const skip = (Number(page) - 1) * Number(limit);
                query.skip(skip).take(Number(limit));
                // Order by latest first
                query.orderBy('log.createdAt', 'DESC');
                const [logs, total] = await query.getManyAndCount();
                res.json({
                    data: logs,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        pages: Math.ceil(total / Number(limit))
                    }
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({ error: 'Failed to get email logs' });
            }
        };
        /**
         * Resend failed email
         */
        this.resendEmail = async (req, res) => {
            try {
                const { id } = req.params;
                const log = await this.emailLogRepository.findOne({
                    where: { id: Number(id) }
                });
                if (!log) {
                    return res.status(404).json({ error: 'Email log not found' });
                }
                // TODO: Implement resend logic based on original email type
                // This would require storing the original email template and data
                res.json({
                    message: 'Email resend functionality not yet implemented',
                    logId: id
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({ error: 'Failed to resend email' });
            }
        };
        /**
         * Get email statistics
         */
        this.getEmailStats = async (req, res) => {
            try {
                const { period = '7d' } = req.query;
                // Calculate date range
                const endDate = new Date();
                const startDate = new Date();
                switch (period) {
                    case '24h':
                        startDate.setHours(startDate.getHours() - 24);
                        break;
                    case '7d':
                        startDate.setDate(startDate.getDate() - 7);
                        break;
                    case '30d':
                        startDate.setDate(startDate.getDate() - 30);
                        break;
                    default:
                        startDate.setDate(startDate.getDate() - 7);
                }
                // Get statistics
                const stats = await this.emailLogRepository
                    .createQueryBuilder('log')
                    .select('log.status', 'status')
                    .addSelect('COUNT(*)', 'count')
                    .where('log.createdAt >= :startDate', { startDate })
                    .andWhere('log.createdAt <= :endDate', { endDate })
                    .groupBy('log.status')
                    .getRawMany();
                // Get total count
                const total = stats.reduce((sum, stat) => sum + Number(stat.count), 0);
                // Format response
                const formattedStats = {
                    total,
                    sent: 0,
                    failed: 0,
                    pending: 0,
                    bounced: 0
                };
                stats.forEach(stat => {
                    formattedStats[stat.status] = Number(stat.count);
                });
                res.json({
                    period,
                    startDate,
                    endDate,
                    stats: formattedStats
                });
            }
            catch (error) {
                // Error log removed
                res.status(500).json({ error: 'Failed to get email statistics' });
            }
        };
        this.smtpRepository = connection_1.AppDataSource.getRepository(SmtpSettings_1.SmtpSettings);
        this.emailLogRepository = connection_1.AppDataSource.getRepository(EmailLog_1.EmailLog);
    }
}
exports.SmtpController = SmtpController;
exports.smtpController = new SmtpController();
//# sourceMappingURL=SmtpController.js.map