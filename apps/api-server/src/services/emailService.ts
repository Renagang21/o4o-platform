import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import path from 'path';
import fs from 'fs/promises';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Mail.Attachment[];
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private config: SMTPConfig;
  private templatesPath: string;

  private constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.templatesPath = path.join(__dirname, '..', 'templates', 'emails');
    this.initializeTransporter();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async initializeTransporter(): Promise<void> {
    try {
      // Create transporter
      this.transporter = nodemailer.createTransport(this.config);

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      this.transporter = null;
    }
  }

  /**
   * Send email with options
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
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

      const mailOptions: Mail.Options = {
        from: `"${process.env.EMAIL_FROM_NAME || 'O4O Platform'}" <${process.env.SMTP_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: text || this.htmlToText(html || ''),
        html: html,
        attachments: options.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
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
  async sendEmailVerification(email: string, verificationToken: string): Promise<boolean> {
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
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
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
  async sendAccountApprovalEmail(email: string, name: string, approved: boolean): Promise<boolean> {
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
  async sendOrderConfirmation(email: string, orderData: any): Promise<boolean> {
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
  private async loadTemplate(templateName: string, data: Record<string, any>): Promise<{ html: string; text?: string }> {
    try {
      const htmlPath = path.join(this.templatesPath, `${templateName}.html`);
      const textPath = path.join(this.templatesPath, `${templateName}.txt`);

      // Load HTML template
      let html = await fs.readFile(htmlPath, 'utf-8');
      
      // Load text template if exists
      let text: string | undefined;
      try {
        text = await fs.readFile(textPath, 'utf-8');
      } catch {
        // Text template is optional
      }

      // Replace template variables
      Object.keys(data).forEach(key => {
        const value = data[key];
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        html = html.replace(regex, value);
        if (text) {
          text = text.replace(regex, value);
        }
      });

      return { html, text };
    } catch (error) {
      console.error(`Failed to load template ${templateName}:`, error);
      // Fallback to simple HTML
      return {
        html: this.generateSimpleTemplate(templateName, data)
      };
    }
  }

  /**
   * Generate simple template as fallback
   */
  private generateSimpleTemplate(templateName: string, data: Record<string, any>): string {
    const templates: Record<string, (data: any) => string> = {
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
  private htmlToText(html: string): string {
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
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();