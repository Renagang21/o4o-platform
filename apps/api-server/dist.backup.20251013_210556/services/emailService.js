"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const logger_1 = __importDefault(require("../utils/logger"));
class EmailService {
    constructor() {
        this.transporter = null;
        this.config = null;
        // Check if email service should be enabled
        this.isEnabled = process.env.EMAIL_SERVICE_ENABLED !== 'false';
        if (!this.isEnabled) {
            logger_1.default.info('Email service is disabled via EMAIL_SERVICE_ENABLED=false');
            this.templatesPath = path_1.default.join(__dirname, '..', 'templates', 'emails');
            return;
        }
        // Only configure if enabled
        const hasConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
        if (hasConfig) {
            this.config = {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            };
        }
        else {
            logger_1.default.warn('Email service: SMTP configuration incomplete');
            logger_1.default.warn('Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
            logger_1.default.warn('To disable this warning, set EMAIL_SERVICE_ENABLED=false');
        }
        this.templatesPath = path_1.default.join(__dirname, '..', 'templates', 'emails');
        this.initializeTransporter();
    }
    static getInstance() {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }
    async initializeTransporter() {
        // Skip if service is disabled
        if (!this.isEnabled) {
            this.transporter = null;
            return;
        }
        // Skip if config is not available
        if (!this.config) {
            this.transporter = null;
            return;
        }
        try {
            // Create transporter with timeout settings
            this.transporter = nodemailer_1.default.createTransport({
                ...this.config,
                connectionTimeout: 5000,
                greetingTimeout: 5000,
                socketTimeout: 5000
            });
            // Verify connection with timeout
            const verifyPromise = this.transporter.verify();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email verification timeout')), 10000));
            await Promise.race([verifyPromise, timeoutPromise]);
            logger_1.default.info('Email service connected successfully');
        }
        catch (error) {
            logger_1.default.error('Email service initialization failed:', error.message || error);
            logger_1.default.warn('Email functionality will be disabled');
            logger_1.default.info('To suppress this message, set EMAIL_SERVICE_ENABLED=false');
            this.transporter = null;
        }
    }
    /**
     * Send email with options
     */
    async sendEmail(options) {
        // Check if service is enabled
        if (!this.isEnabled) {
            logger_1.default.debug('Email service disabled - skipping email:', options.subject);
            return false;
        }
        if (!this.transporter) {
            logger_1.default.warn('Email transporter not available - skipping email:', options.subject);
            return false;
        }
        try {
            let html = options.html;
            let text = options.text;
            // Load template if specified
            if (options.template && options.templateData) {
                const template = await this.loadTemplate(options.template, options.templateData);
                html = template.html;
                text = template.text || text;
            }
            const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'noreply@o4o.com';
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'O4O Platform'}" <${fromEmail}>`,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                text: text || this.htmlToText(html || ''),
                html: html,
                attachments: options.attachments
            };
            // Send with timeout
            const sendPromise = this.transporter.sendMail(mailOptions);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 30000));
            const info = await Promise.race([sendPromise, timeoutPromise]);
            logger_1.default.info('Email sent successfully:', info.messageId);
            return true;
        }
        catch (error) {
            logger_1.default.error('Failed to send email:', error.message || error);
            return false;
        }
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, resetToken) {
        const resetUrl = `${process.env.ADMIN_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
        return this.sendEmail({
            to: email,
            subject: 'Password Reset Request - O4O Platform',
            template: 'password-reset',
            templateData: {
                resetUrl,
                expiresIn: '1 hour',
                year: new Date().getFullYear()
            }
        });
    }
    /**
     * Send email verification
     */
    async sendEmailVerification(email, verificationToken) {
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
        return this.sendEmail({
            to: email,
            subject: 'Verify Your Email - O4O Platform',
            template: 'email-verification',
            templateData: {
                verifyUrl,
                year: new Date().getFullYear()
            }
        });
    }
    /**
     * Send security alert email
     */
    async sendSecurityAlert(email, alertData) {
        const subject = {
            suspicious_login_attempts: 'Security Alert: Suspicious Login Attempts',
            account_locked: 'Security Alert: Account Locked',
            password_changed: 'Security Alert: Password Changed',
            new_device_login: 'Security Alert: New Device Login'
        };
        return this.sendEmail({
            to: email,
            subject: subject[alertData.type] || 'Security Alert - O4O Platform',
            template: 'security-alert',
            templateData: {
                alertType: alertData.type,
                message: alertData.details.message,
                recommendation: alertData.details.recommendation,
                ipAddress: alertData.details.ipAddress,
                deviceInfo: alertData.details.deviceInfo,
                timestamp: alertData.details.timestamp || new Date(),
                year: new Date().getFullYear()
            }
        });
    }
    /**
     * Send welcome email
     */
    async sendWelcomeEmail(email, name) {
        return this.sendEmail({
            to: email,
            subject: 'Welcome to O4O Platform!',
            template: 'welcome',
            templateData: {
                name: name || 'User',
                loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
                year: new Date().getFullYear()
            }
        });
    }
    /**
     * Send account approval notification
     */
    async sendAccountApprovalEmail(email, name, approved) {
        return this.sendEmail({
            to: email,
            subject: `Account ${approved ? 'Approved' : 'Rejected'} - O4O Platform`,
            template: approved ? 'account-approved' : 'account-rejected',
            templateData: {
                name: name || 'User',
                loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
            }
        });
    }
    /**
     * Send order confirmation email
     */
    async sendOrderConfirmation(email, orderData) {
        return this.sendEmail({
            to: email,
            subject: `Order Confirmation #${orderData.orderNumber} - O4O Platform`,
            template: 'order-confirmation',
            templateData: orderData
        });
    }
    /**
     * Load and process email template
     */
    async loadTemplate(templateName, data) {
        try {
            const htmlPath = path_1.default.join(this.templatesPath, `${templateName}.html`);
            const textPath = path_1.default.join(this.templatesPath, `${templateName}.txt`);
            // Load HTML template
            let html = await promises_1.default.readFile(htmlPath, 'utf-8');
            // Load text template if exists
            let text;
            try {
                text = await promises_1.default.readFile(textPath, 'utf-8');
            }
            catch (_a) {
                // Text template is optional
            }
            // Replace template variables
            Object.keys(data).forEach((key) => {
                const value = data[key];
                const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                html = html.replace(regex, value);
                if (text) {
                    text = text.replace(regex, value);
                }
            });
            return { html, text };
        }
        catch (error) {
            logger_1.default.error(`Failed to load template ${templateName}:`, error);
            // Fallback to simple HTML
            return {
                html: this.generateSimpleTemplate(templateName, data)
            };
        }
    }
    /**
     * Generate simple template as fallback
     */
    generateSimpleTemplate(templateName, data) {
        const templates = {
            'password-reset': (d) => `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${d.resetUrl}">Reset Password</a></p>
        <p>This link will expire in ${d.expiresIn}.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
            'email-verification': (d) => `
        <h2>Verify Your Email</h2>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${d.verifyUrl}">Verify Email</a></p>
      `,
            'welcome': (d) => `
        <h2>Welcome to O4O Platform!</h2>
        <p>Hi ${d.name},</p>
        <p>Thank you for joining O4O Platform. We're excited to have you!</p>
        <p><a href="${d.loginUrl}">Login to Your Account</a></p>
      `,
            'account-approved': (d) => `
        <h2>Account Approved!</h2>
        <p>Hi ${d.name},</p>
        <p>Your account has been approved. You can now login to access all features.</p>
        <p><a href="${d.loginUrl}">Login Now</a></p>
      `,
            'account-rejected': (d) => `
        <h2>Account Application Update</h2>
        <p>Hi ${d.name},</p>
        <p>Unfortunately, your account application was not approved at this time.</p>
        <p>If you have questions, please contact our support team.</p>
      `,
            'order-confirmation': (d) => `
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p>Order Number: <strong>${d.orderNumber}</strong></p>
        <p>Total: <strong>${d.total}</strong></p>
      `
        };
        const template = templates[templateName];
        if (!template) {
            return '<p>Email content</p>';
        }
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h2 { color: #2c3e50; }
          a { color: #3498db; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        ${template(data)}
        <hr>
        <p style="font-size: 12px; color: #999;">
          © ${new Date().getFullYear()} O4O Platform. All rights reserved.
        </p>
      </body>
      </html>
    `;
    }
    /**
     * Convert HTML to plain text
     */
    htmlToText(html) {
        return html
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Test email configuration
     */
    async testConnection() {
        if (!this.isEnabled) {
            return false;
        }
        if (!this.transporter) {
            return false;
        }
        try {
            await this.transporter.verify();
            return true;
        }
        catch (error) {
            logger_1.default.error('Email connection test failed:', error);
            return false;
        }
    }
    /**
     * Check if email service is available
     */
    isServiceAvailable() {
        return this.isEnabled && this.transporter !== null;
    }
    /**
     * Get service status
     */
    getServiceStatus() {
        return {
            enabled: this.isEnabled,
            configured: this.config !== null,
            connected: this.transporter !== null
        };
    }
}
exports.EmailService = EmailService;
// Export singleton instance
exports.emailService = EmailService.getInstance();
//# sourceMappingURL=emailService.js.map