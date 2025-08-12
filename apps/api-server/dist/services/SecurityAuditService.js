"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityAuditService = void 0;
exports.logSecurityEvent = logSecurityEvent;
exports.isIPBlocked = isIPBlocked;
const logger_1 = __importDefault(require("../utils/logger"));
class SecurityAuditService {
    constructor() {
        this.events = [];
        this.rules = [];
        this.ipRiskCache = new Map();
        this.blockedIPs = new Set();
        this.failedLoginAttempts = new Map();
        this.initializeDefaultRules();
    }
    initializeDefaultRules() {
        this.rules = [
            {
                id: 'rule_failed_logins',
                name: 'Multiple Failed Login Attempts',
                enabled: true,
                condition: {
                    eventType: ['auth.failed_login'],
                    threshold: { count: 5, minutes: 15 }
                },
                action: 'block',
                severity: 'high'
            },
            {
                id: 'rule_sql_injection',
                name: 'SQL Injection Attempt',
                enabled: true,
                condition: {
                    eventType: ['security.sql_injection']
                },
                action: 'block',
                severity: 'critical'
            },
            {
                id: 'rule_rapid_requests',
                name: 'Rapid API Requests',
                enabled: true,
                condition: {
                    threshold: { count: 100, minutes: 1 }
                },
                action: 'challenge',
                severity: 'medium'
            },
            {
                id: 'rule_data_export',
                name: 'Large Data Export',
                enabled: true,
                condition: {
                    eventType: ['data.export']
                },
                action: 'alert',
                severity: 'medium'
            }
        ];
    }
    async logEvent(event) {
        const securityEvent = {
            ...event,
            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };
        // Add to events
        this.events.unshift(securityEvent);
        if (this.events.length > 10000) {
            this.events = this.events.slice(0, 10000);
        }
        // Check rules
        await this.checkRules(securityEvent);
        // Track failed login attempts
        if (event.type === 'auth.failed_login') {
            this.trackFailedLogin(event.ipAddress, event.userEmail);
        }
        // Log based on severity
        if (securityEvent.severity === 'critical' || securityEvent.severity === 'high') {
            logger_1.default.error(`[SECURITY] ${securityEvent.type}: ${securityEvent.action}`, {
                userId: securityEvent.userId,
                ip: securityEvent.ipAddress,
                details: securityEvent.details
            });
        }
        else {
            logger_1.default.info(`[SECURITY] ${securityEvent.type}: ${securityEvent.action}`);
        }
        // Persist to database (async, don't wait)
        this.persistEvent(securityEvent).catch(err => logger_1.default.error('Failed to persist security event:', err));
        return securityEvent;
    }
    async checkRules(event) {
        for (const rule of this.rules) {
            if (!rule.enabled)
                continue;
            if (this.matchesRule(event, rule)) {
                await this.executeRuleAction(event, rule);
            }
        }
    }
    matchesRule(event, rule) {
        const { condition } = rule;
        // Check event type
        if (condition.eventType && !condition.eventType.includes(event.type)) {
            return false;
        }
        // Check IP pattern
        if (condition.ipPattern) {
            const pattern = new RegExp(condition.ipPattern);
            if (!pattern.test(event.ipAddress)) {
                return false;
            }
        }
        // Check user pattern
        if (condition.userPattern && event.userEmail) {
            const pattern = new RegExp(condition.userPattern);
            if (!pattern.test(event.userEmail)) {
                return false;
            }
        }
        // Check threshold
        if (condition.threshold) {
            const count = this.countRecentEvents(event.ipAddress, condition.eventType, condition.threshold.minutes);
            if (count < condition.threshold.count) {
                return false;
            }
        }
        return true;
    }
    async executeRuleAction(event, rule) {
        switch (rule.action) {
            case 'block':
                this.blockIP(event.ipAddress);
                await this.logEvent({
                    type: 'security.intrusion_attempt',
                    severity: rule.severity,
                    userId: event.userId,
                    userEmail: event.userEmail,
                    ipAddress: event.ipAddress,
                    userAgent: event.userAgent,
                    action: `Blocked by rule: ${rule.name}`,
                    result: 'blocked',
                    details: { triggeredRule: rule.id, originalEvent: event.id }
                });
                break;
            case 'alert':
                // Send alert notification
                this.sendSecurityAlert(event, rule);
                break;
            case 'challenge':
                // Mark IP for additional verification
                this.ipRiskCache.set(event.ipAddress, {
                    risk: 'high',
                    timestamp: new Date()
                });
                break;
            case 'log':
                // Already logged
                break;
        }
    }
    countRecentEvents(ipAddress, eventTypes, minutes = 60) {
        const cutoff = new Date(Date.now() - minutes * 60000);
        return this.events.filter((e) => e.ipAddress === ipAddress &&
            e.timestamp > cutoff &&
            (!eventTypes || eventTypes.includes(e.type))).length;
    }
    trackFailedLogin(ipAddress, email) {
        const key = email || ipAddress;
        const attempts = this.failedLoginAttempts.get(key) || { count: 0, firstAttempt: new Date() };
        attempts.count++;
        this.failedLoginAttempts.set(key, attempts);
        // Auto-block after too many attempts
        if (attempts.count >= 5) {
            const timeDiff = Date.now() - attempts.firstAttempt.getTime();
            if (timeDiff < 15 * 60000) { // 15 minutes
                this.blockIP(ipAddress);
            }
        }
        // Clean old entries
        this.cleanFailedLoginAttempts();
    }
    cleanFailedLoginAttempts() {
        const cutoff = Date.now() - 60 * 60000; // 1 hour
        for (const [key, attempts] of this.failedLoginAttempts.entries()) {
            if (attempts.firstAttempt.getTime() < cutoff) {
                this.failedLoginAttempts.delete(key);
            }
        }
    }
    blockIP(ipAddress) {
        this.blockedIPs.add(ipAddress);
        logger_1.default.warn(`[SECURITY] Blocked IP: ${ipAddress}`);
    }
    unblockIP(ipAddress) {
        this.blockedIPs.delete(ipAddress);
        logger_1.default.info(`[SECURITY] Unblocked IP: ${ipAddress}`);
    }
    isIPBlocked(ipAddress) {
        return this.blockedIPs.has(ipAddress);
    }
    getIPRisk(ipAddress) {
        if (this.isIPBlocked(ipAddress))
            return 'blocked';
        const cached = this.ipRiskCache.get(ipAddress);
        if (cached && Date.now() - cached.timestamp.getTime() < 3600000) {
            return cached.risk;
        }
        // Calculate risk based on recent activity
        const recentEvents = this.countRecentEvents(ipAddress);
        const failedLogins = this.countRecentEvents(ipAddress, ['auth.failed_login'], 60);
        const suspiciousEvents = this.countRecentEvents(ipAddress, [
            'security.sql_injection',
            'security.xss_attempt',
            'security.intrusion_attempt'
        ], 60);
        let risk = 'low';
        if (suspiciousEvents > 0 || failedLogins > 3) {
            risk = 'high';
        }
        else if (recentEvents > 50 || failedLogins > 1) {
            risk = 'medium';
        }
        this.ipRiskCache.set(ipAddress, { risk, timestamp: new Date() });
        return risk;
    }
    getStats(options = {}) {
        let filtered = [...this.events];
        if (options.startDate) {
            filtered = filtered.filter((e) => e.timestamp >= options.startDate);
        }
        if (options.endDate) {
            filtered = filtered.filter((e) => e.timestamp <= options.endDate);
        }
        const stats = {
            totalEvents: filtered.length,
            failedLogins: 0,
            suspiciousActivities: 0,
            blockedRequests: 0,
            uniqueIPs: 0,
            topIPs: [],
            eventsByType: {},
            eventsBySeverity: {},
            recentEvents: []
        };
        const ipCounts = {};
        filtered.forEach((event) => {
            // Count by type
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
            // Count by severity
            stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
            // Count IPs
            ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1;
            // Specific counts
            if (event.type === 'auth.failed_login')
                stats.failedLogins++;
            if (event.type.startsWith('security.'))
                stats.suspiciousActivities++;
            if (event.result === 'blocked')
                stats.blockedRequests++;
        });
        stats.uniqueIPs = Object.keys(ipCounts).length;
        // Top IPs
        stats.topIPs = Object.entries(ipCounts)
            .map(([ip, count]) => ({ ip, count, risk: this.getIPRisk(ip) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // Recent events
        stats.recentEvents = filtered.slice(0, options.limit || 20);
        return stats;
    }
    getEvents(options = {}) {
        let filtered = [...this.events];
        if (options.type) {
            const types = Array.isArray(options.type) ? options.type : [options.type];
            filtered = filtered.filter((e) => types.includes(e.type));
        }
        if (options.severity) {
            filtered = filtered.filter((e) => e.severity === options.severity);
        }
        if (options.userId) {
            filtered = filtered.filter((e) => e.userId === options.userId);
        }
        if (options.ipAddress) {
            filtered = filtered.filter((e) => e.ipAddress === options.ipAddress);
        }
        if (options.startDate) {
            filtered = filtered.filter((e) => e.timestamp >= options.startDate);
        }
        if (options.endDate) {
            filtered = filtered.filter((e) => e.timestamp <= options.endDate);
        }
        return filtered.slice(0, options.limit || 100);
    }
    getRules() {
        return [...this.rules];
    }
    updateRule(ruleId, updates) {
        const rule = this.rules.find((r) => r.id === ruleId);
        if (!rule)
            return false;
        Object.assign(rule, updates);
        return true;
    }
    addRule(rule) {
        const newRule = {
            ...rule,
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        this.rules.push(newRule);
        return newRule;
    }
    async persistEvent(event) {
        // In production, save to database
        // For now, just keep in memory
    }
    sendSecurityAlert(event, rule) {
        // In production, send email/Slack notification
        logger_1.default.warn(`[SECURITY ALERT] ${rule.name} triggered`, {
            event,
            rule
        });
    }
}
// Singleton instance
exports.securityAuditService = new SecurityAuditService();
// Convenience functions
function logSecurityEvent(event) {
    return exports.securityAuditService.logEvent(event);
}
function isIPBlocked(ipAddress) {
    return exports.securityAuditService.isIPBlocked(ipAddress);
}
//# sourceMappingURL=SecurityAuditService.js.map