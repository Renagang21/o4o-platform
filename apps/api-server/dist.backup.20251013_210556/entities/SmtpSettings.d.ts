export declare class SmtpSettings {
    id: number;
    enabled: boolean;
    fromName?: string;
    fromEmail?: string;
    replyToEmail?: string;
    host?: string;
    port?: number;
    secure: string;
    authMethod: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    accessToken?: string;
    tokenExpiry?: Date;
    provider: string;
    apiKey?: string;
    apiSecret?: string;
    region?: string;
    maxEmailsPerHour: number;
    maxEmailsPerMinute: number;
    testEmailAddress?: string;
    lastTestDate?: Date;
    lastTestSuccess: boolean;
    lastTestError?: string;
    enableLogging: boolean;
    logErrors: boolean;
    headerHtml?: string;
    footerHtml?: string;
    signatureHtml?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=SmtpSettings.d.ts.map