export interface SecurityEvent {
    id: string;
    timestamp: Date;
    type: SecurityEventType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    userEmail?: string;
    ipAddress: string;
    userAgent?: string;
    action: string;
    resource?: string;
    result: 'success' | 'failure' | 'blocked';
    details?: any;
    location?: {
        country?: string;
        city?: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
}
export type SecurityEventType = 'auth.login' | 'auth.logout' | 'auth.failed_login' | 'auth.password_reset' | 'auth.permission_denied' | 'auth.token_expired' | 'auth.suspicious_activity' | 'data.access' | 'data.create' | 'data.update' | 'data.delete' | 'data.export' | 'data.import' | 'admin.settings_change' | 'admin.user_created' | 'admin.user_updated' | 'admin.user_deleted' | 'admin.role_changed' | 'system.file_upload' | 'system.file_download' | 'system.backup' | 'system.restore' | 'api.rate_limit' | 'api.invalid_request' | 'security.intrusion_attempt' | 'security.malware_detected' | 'security.sql_injection' | 'security.xss_attempt';
export interface SecurityStats {
    totalEvents: number;
    failedLogins: number;
    suspiciousActivities: number;
    blockedRequests: number;
    uniqueIPs: number;
    topIPs: Array<{
        ip: string;
        count: number;
        risk: string;
    }>;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentEvents: SecurityEvent[];
}
export interface SecurityRule {
    id: string;
    name: string;
    enabled: boolean;
    condition: {
        eventType?: SecurityEventType[];
        ipPattern?: string;
        userPattern?: string;
        threshold?: {
            count: number;
            minutes: number;
        };
    };
    action: 'alert' | 'block' | 'challenge' | 'log';
    severity: 'low' | 'medium' | 'high' | 'critical';
}
declare class SecurityAuditService {
    private events;
    private rules;
    private ipRiskCache;
    private blockedIPs;
    private failedLoginAttempts;
    constructor();
    private initializeDefaultRules;
    logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<SecurityEvent>;
    private checkRules;
    private matchesRule;
    private executeRuleAction;
    private countRecentEvents;
    private trackFailedLogin;
    private cleanFailedLoginAttempts;
    blockIP(ipAddress: string): void;
    unblockIP(ipAddress: string): void;
    isIPBlocked(ipAddress: string): boolean;
    getIPRisk(ipAddress: string): 'low' | 'medium' | 'high' | 'blocked';
    getStats(options?: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): SecurityStats;
    getEvents(options?: {
        type?: SecurityEventType | SecurityEventType[];
        severity?: string;
        userId?: string;
        ipAddress?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): SecurityEvent[];
    getRules(): SecurityRule[];
    updateRule(ruleId: string, updates: Partial<SecurityRule>): boolean;
    addRule(rule: Omit<SecurityRule, 'id'>): SecurityRule;
    private persistEvent;
    private sendSecurityAlert;
}
export declare const securityAuditService: SecurityAuditService;
export declare function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<SecurityEvent>;
export declare function isIPBlocked(ipAddress: string): boolean;
export {};
//# sourceMappingURL=SecurityAuditService.d.ts.map