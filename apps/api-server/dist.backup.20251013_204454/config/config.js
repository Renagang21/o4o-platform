"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        fromName: process.env.SMTP_FROM_NAME || 'O4O Platform',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@neture.co.kr'
    },
    app: {
        name: 'O4O Platform',
        url: process.env.APP_URL || 'https://neture.co.kr',
        env: process.env.NODE_ENV || 'development'
    }
};
//# sourceMappingURL=config.js.map