/**
 * Mail Template Service — Template loading, inline templates, file template rendering
 *
 * WO-O4O-MAIL-SERVICE-SPLIT-V1
 * Extracted from mail.service.ts
 *
 * Responsibilities:
 *   - File-based template loading with inline fallback
 *   - Standardized file template rendering (renderFileTemplate)
 *   - Inline email templates (verification, welcome, accountLocked)
 *     WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: passwordReset 템플릿은 은퇴했다.
 *   - Simple HTML wrapper for inline templates
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import path from 'path';
import fs from 'fs/promises';
import type { EmailTemplateData } from './types.js';
import { replaceTemplatePlaceholders, removeConditionalBlocks } from './mail-render.helper.js';

export class MailTemplateService {
  private templatesPath: string;

  constructor(templatesPath?: string) {
    this.templatesPath = templatesPath || path.join(__dirname, '..', 'templates', 'email');
  }

  /**
   * Load template: try file-based first (templates/email/{name}.html),
   * then fall back to inline templates. Replaces {{key}} placeholders.
   */
  async loadTemplateWithFallback(
    templateName: string,
    data: Record<string, any>,
  ): Promise<{ html: string; text?: string }> {
    // 1. Try file-based template
    try {
      const htmlPath = path.join(this.templatesPath, `${templateName}.html`);
      let html = await fs.readFile(htmlPath, 'utf-8');

      // Try optional text template
      let text: string | undefined;
      try {
        const textPath = path.join(this.templatesPath, `${templateName}.txt`);
        text = await fs.readFile(textPath, 'utf-8');
      } catch { /* text template is optional */ }

      // Replace {{key}} placeholders
      html = replaceTemplatePlaceholders(html, data);
      if (text) text = replaceTemplatePlaceholders(text, data);

      return { html, text };
    } catch {
      // File not found — fall through to inline
    }

    // 2. Inline template fallback
    const inlineTemplates: Record<string, (d: any) => string> = {
      welcome: this.welcomeEmailTemplate,
      accountLocked: this.accountLockedTemplate,
      // WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: 'email-verification' 템플릿 은퇴 — 발송 경로가 없다.
      'account-approved': (d) => this.wrapSimpleTemplate(`
        <h2>Account Approved!</h2>
        <p>Hi ${d.name},</p>
        <p>Your account has been approved. You can now login to access all features.</p>
        <p><a href="${d.loginUrl}">Login Now</a></p>
      `),
      'account-rejected': (d) => this.wrapSimpleTemplate(`
        <h2>Account Application Update</h2>
        <p>Hi ${d.name},</p>
        <p>Unfortunately, your account application was not approved at this time.</p>
        <p>If you have questions, please contact our support team.</p>
      `),
      'order-confirmation': (d) => this.wrapSimpleTemplate(`
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p>Order Number: <strong>${d.orderNumber}</strong></p>
        <p>Total: <strong>${d.total}</strong></p>
      `),
      'security-alert': (d) => this.wrapSimpleTemplate(`
        <h2>Security Alert</h2>
        <p>${d.message}</p>
        ${d.recommendation ? `<p><strong>Recommendation:</strong> ${d.recommendation}</p>` : ''}
        ${d.ipAddress ? `<p>IP: ${d.ipAddress}</p>` : ''}
      `),
    };

    const inlineFn = inlineTemplates[templateName];
    if (inlineFn) {
      return { html: inlineFn(data) };
    }

    throw new Error(`Email template "${templateName}" not found`);
  }

  /**
   * Render a file-based template with placeholder replacement and conditional block removal.
   * Standardized pattern used by business email methods.
   */
  async renderFileTemplate(
    templateName: string,
    replacements: Record<string, string>,
    conditionalFields?: string[],
  ): Promise<string> {
    const templatePath = path.join(this.templatesPath, `${templateName}.html`);
    let html = await fs.readFile(templatePath, 'utf8');

    // Replace {{key}} placeholders
    for (const [key, value] of Object.entries(replacements)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Remove conditional blocks for empty fields
    if (conditionalFields) {
      const emptyFields = conditionalFields.filter(field => !replacements[field] || replacements[field] === '');
      if (emptyFields.length > 0) {
        html = removeConditionalBlocks(html, emptyFields);
      }
    }

    return html;
  }

  wrapSimpleTemplate(body: string): string {
    return `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      h2 { color: #2c3e50; } a { color: #3498db; text-decoration: none; }
    </style></head><body>${body}<hr>
    <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} O4O Platform. All rights reserved.</p>
    </body></html>`;
  }

  // ── Inline templates ──

  private welcomeEmailTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>환영합니다!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #27AE60; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 15px 30px; background-color: #27AE60; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .features { margin: 30px 0; }
    .feature { margin: 15px 0; padding-left: 30px; position: relative; }
    .feature:before { content: "✓"; position: absolute; left: 0; color: #27AE60; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>환영합니다! 🎉</h1>
    </div>
    <div class="content">
      <h2>${data.name}님, ${data.companyName}에 오신 것을 환영합니다!</h2>
      <p>이메일 인증이 완료되었습니다. 이제 모든 서비스를 자유롭게 이용하실 수 있습니다.</p>

      <div class="features">
        <h3>이용 가능한 서비스:</h3>
        <div class="feature">모든 콘텐츠 접근</div>
        <div class="feature">프로필 커스터마이징</div>
        <div class="feature">소셜 기능 사용</div>
        <div class="feature">프리미엄 기능 체험</div>
      </div>

      <div style="text-align: center;">
        <a href="${data.actionUrl}" class="button">서비스 시작하기</a>
      </div>
    </div>
    <div class="footer">
      <p>이 이메일은 ${data.companyName}에서 발송되었습니다.</p>
      <p>문의사항이 있으시면 ${data.supportEmail}로 연락주세요.</p>
      <p>&copy; ${data.year} ${data.companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private accountLockedTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>계정 보안 알림</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #F39C12; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 15px 30px; background-color: #F39C12; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>계정 보안 알림 ⚠️</h1>
    </div>
    <div class="content">
      <h2>${data.name}님</h2>
      <div class="alert">
        <p><strong>보안 알림:</strong> 비정상적인 로그인 시도가 감지되어 귀하의 계정이 일시적으로 잠겼습니다.</p>
      </div>
      <p>계정 보안을 위해 다음 조치를 취해주세요:</p>
      <ol>
        <li>아래 버튼을 클릭하여 계정을 확인하세요</li>
        <li>비밀번호를 재설정하세요</li>
        <li>2단계 인증을 활성화하세요</li>
      </ol>
      <div style="text-align: center;">
        <a href="${data.actionUrl}" class="button">계정 확인하기</a>
      </div>
      <p>이 활동이 본인의 것이 아니라면 즉시 고객 지원팀에 연락해주세요.</p>
    </div>
    <div class="footer">
      <p>이 이메일은 ${data.companyName}에서 발송되었습니다.</p>
      <p>문의사항이 있으시면 ${data.supportEmail}로 연락주세요.</p>
      <p>&copy; ${data.year} ${data.companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }
}
