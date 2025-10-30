import nodemailer from 'nodemailer';
import { config } from '../config/config.js';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass
  }
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const mailOptions = {
    from: options.from || `${config.smtp.fromName} <${config.smtp.fromEmail}>`,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo,
    cc: options.cc?.join(', '),
    bcc: options.bcc?.join(', '),
    attachments: options.attachments
  };

  await transporter.sendMail(mailOptions);
}

// Verify SMTP connection
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error: any) {
    // Error log removed
    return false;
  }
}