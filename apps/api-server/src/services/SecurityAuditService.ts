import logger from '../utils/logger.js';
import { AppDataSource } from '../database/connection.js';
// WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1
import { normalizeIp } from '../utils/trusted-client-ip.js';

/** TTL 이 붙은 IP 차단 레코드 */
export interface BlockedIpRecord {
  ip: string;
  blockedAt: number;
  blockedUntil: number;
  reason?: string;
  source?: string;
}

/** 기본 차단 유지 시간 — 60분 */
export const DEFAULT_IP_BLOCK_TTL_MS = 60 * 60 * 1000;

/**
 * 차단 TTL. `SECURITY_IP_BLOCK_TTL_MS` 로 조정하되, 0 이하·비정수·과도한 값은
 * 기본값으로 폴백한다(상한 24시간) — 잘못된 설정이 사실상 영구 차단이 되지 않게 한다.
 */
export function resolveIpBlockTtlMs(raw = process.env.SECURITY_IP_BLOCK_TTL_MS): number {
  const n = Number(raw);
  const MAX = 24 * 60 * 60 * 1000;
  if (!raw || !Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > MAX) {
    return DEFAULT_IP_BLOCK_TTL_MS;
  }
  return n;
}

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
    coordinates?: { lat: number; lng: number };
  };
}

export type SecurityEventType = 
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed_login'
  | 'auth.password_reset'
  | 'auth.permission_denied'
  | 'auth.token_expired'
  | 'auth.suspicious_activity'
  | 'data.access'
  | 'data.create'
  | 'data.update'
  | 'data.delete'
  | 'data.export'
  | 'data.import'
  | 'admin.settings_change'
  | 'admin.user_created'
  | 'admin.user_updated'
  | 'admin.user_deleted'
  | 'admin.role_changed'
  | 'system.file_upload'
  | 'system.file_download'
  | 'system.backup'
  | 'system.restore'
  | 'api.rate_limit'
  | 'api.invalid_request'
  | 'security.intrusion_attempt'
  | 'security.malware_detected'
  | 'security.sql_injection'
  | 'security.xss_attempt';

export interface SecurityStats {
  totalEvents: number;
  failedLogins: number;
  suspiciousActivities: number;
  blockedRequests: number;
  uniqueIPs: number;
  topIPs: Array<{ ip: string; count: number; risk: string }>;
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
    threshold?: { count: number; minutes: number };
  };
  action: 'alert' | 'block' | 'challenge' | 'log';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityAuditService {
  private events: SecurityEvent[] = [];
  private rules: SecurityRule[] = [];
  private ipRiskCache: Map<string, { risk: string; timestamp: Date }> = new Map();
  /**
   * WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1:
   *   기존 `Set<string>` 은 만료 개념이 없어 한 번 차단되면 인스턴스가 교체될 때까지
   *   무기한 유지됐다(해제 수단도 없었다). 만료시각을 가진 Map 으로 교체한다.
   *   키는 `normalizeIp` 로 정규화해 표기 차이로 중복 레코드가 생기지 않게 한다.
   */
  private blockedIPs: Map<string, BlockedIpRecord> = new Map();
  private failedLoginAttempts: Map<string, { count: number; firstAttempt: Date }> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
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
          eventType: ['security.sql_injection'],
          // WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1:
          //   기존에는 임계값이 없어 **오탐 1회로 즉시 차단**됐다. 탐지 패턴이
          //   `(or|and).*=` · `--` · `;` 처럼 넓어 정상 요청도 걸릴 수 있다.
          //   1회 탐지는 해당 요청만 400 으로 막고(미들웨어가 처리), 반복될 때만 차단한다.
          threshold: { count: 3, minutes: 5 }
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

  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<SecurityEvent> {
    const securityEvent: SecurityEvent = {
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
      logger.error(`[SECURITY] ${securityEvent.type}: ${securityEvent.action}`, {
        userId: securityEvent.userId,
        ip: securityEvent.ipAddress,
        details: securityEvent.details
      });
    } else {
      logger.info(`[SECURITY] ${securityEvent.type}: ${securityEvent.action}`);
    }

    // Persist to database (async, don't wait)
    this.persistEvent(securityEvent).catch(err => 
      logger.error('Failed to persist security event:', err)
    );

    return securityEvent;
  }

  private async checkRules(event: SecurityEvent): Promise<void> {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.matchesRule(event, rule)) {
        await this.executeRuleAction(event, rule);
      }
    }
  }

  private matchesRule(event: SecurityEvent, rule: SecurityRule): boolean {
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
      const count = this.countRecentEvents(
        event.ipAddress,
        condition.eventType,
        condition.threshold.minutes
      );
      if (count < condition.threshold.count) {
        return false;
      }
    }

    return true;
  }

  private async executeRuleAction(event: SecurityEvent, rule: SecurityRule): Promise<void> {
    switch (rule.action) {
      case 'block':
        this.blockIP(event.ipAddress, { reason: rule.name, source: rule.id });
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

  private countRecentEvents(
    ipAddress: string,
    eventTypes?: SecurityEventType[],
    minutes: number = 60
  ): number {
    const cutoff = new Date(Date.now() - minutes * 60000);
    
    return this.events.filter((e: any) => 
      e.ipAddress === ipAddress &&
      e.timestamp > cutoff &&
      (!eventTypes || eventTypes.includes(e.type))
    ).length;
  }

  private trackFailedLogin(ipAddress: string, email?: string): void {
    const key = email || ipAddress;
    const attempts = this.failedLoginAttempts.get(key) || { count: 0, firstAttempt: new Date() };
    
    attempts.count++;
    this.failedLoginAttempts.set(key, attempts);

    // Auto-block after too many attempts
    if (attempts.count >= 5) {
      const timeDiff = Date.now() - attempts.firstAttempt.getTime();
      if (timeDiff < 15 * 60000) { // 15 minutes
        this.blockIP(ipAddress, { reason: 'Multiple failed login attempts', source: 'trackFailedLogin' });
      }
    }

    // Clean old entries
    this.cleanFailedLoginAttempts();
  }

  private cleanFailedLoginAttempts(): void {
    const cutoff = Date.now() - 60 * 60000; // 1 hour
    
    for (const [key, attempts] of this.failedLoginAttempts.entries()) {
      if (attempts.firstAttempt.getTime() < cutoff) {
        this.failedLoginAttempts.delete(key);
      }
    }
  }

  /**
   * IP 차단 — TTL 이 붙는다. 이미 차단된 IP 가 재탐지되면 **만료시각을 연장**하고
   * 중복 레코드를 만들지 않는다.
   */
  blockIP(ipAddress: string, meta?: { reason?: string; source?: string }): void {
    const key = normalizeIp(ipAddress) || 'unknown';
    const now = Date.now();
    const ttl = resolveIpBlockTtlMs();
    const existing = this.blockedIPs.get(key);
    const blockedUntil = Math.max(existing?.blockedUntil ?? 0, now + ttl);

    this.blockedIPs.set(key, {
      ip: key,
      blockedAt: existing?.blockedAt ?? now,
      blockedUntil,
      reason: meta?.reason ?? existing?.reason,
      source: meta?.source ?? existing?.source,
    });

    logger.warn(
      `[SECURITY] ${existing ? 'Re-blocked (TTL extended)' : 'Blocked'} IP: ${key} until ${new Date(blockedUntil).toISOString()}`,
    );
  }

  /** 관리자 수동 해제. 실제로 제거됐는지(`changed`) 돌려줘 멱등 응답을 만들 수 있게 한다. */
  unblockIP(ipAddress: string): boolean {
    const key = normalizeIp(ipAddress) || 'unknown';
    const changed = this.blockedIPs.delete(key);
    if (changed) logger.info(`[SECURITY] Unblocked IP: ${key}`);
    return changed;
  }

  /** 차단 판정 — 만료된 레코드는 이 시점에 제거한다 (lazy expiration, 별도 cron 없음). */
  isIPBlocked(ipAddress: string): boolean {
    const key = normalizeIp(ipAddress) || 'unknown';
    const record = this.blockedIPs.get(key);
    if (!record) return false;
    if (record.blockedUntil <= Date.now()) {
      this.blockedIPs.delete(key);
      logger.info(`[SECURITY] IP block expired: ${key}`);
      return false;
    }
    return true;
  }

  /**
   * 현재 인스턴스의 차단 목록 (관리자 조회용). 조회 시 만료분을 함께 정리한다.
   * ⚠️ in-memory 라 **현재 Cloud Run 인스턴스 범위**다 — 인스턴스 간 공유되지 않는다.
   */
  getBlockedIPs(): Array<{
    ip: string;
    blockedAt: string;
    blockedUntil: string;
    remainingSeconds: number;
    reason?: string;
    source?: string;
  }> {
    const now = Date.now();
    const out: Array<{
      ip: string; blockedAt: string; blockedUntil: string;
      remainingSeconds: number; reason?: string; source?: string;
    }> = [];

    for (const [key, record] of this.blockedIPs.entries()) {
      if (record.blockedUntil <= now) {
        this.blockedIPs.delete(key);
        continue;
      }
      out.push({
        ip: record.ip,
        blockedAt: new Date(record.blockedAt).toISOString(),
        blockedUntil: new Date(record.blockedUntil).toISOString(),
        remainingSeconds: Math.ceil((record.blockedUntil - now) / 1000),
        reason: record.reason,
        source: record.source,
      });
    }
    return out.sort((a, b) => b.remainingSeconds - a.remainingSeconds);
  }

  getIPRisk(ipAddress: string): 'low' | 'medium' | 'high' | 'blocked' {
    if (this.isIPBlocked(ipAddress)) return 'blocked';
    
    const cached = this.ipRiskCache.get(ipAddress);
    if (cached && Date.now() - cached.timestamp.getTime() < 3600000) {
      return cached.risk as any;
    }

    // Calculate risk based on recent activity
    const recentEvents = this.countRecentEvents(ipAddress);
    const failedLogins = this.countRecentEvents(ipAddress, ['auth.failed_login'], 60);
    const suspiciousEvents = this.countRecentEvents(ipAddress, [
      'security.sql_injection',
      'security.xss_attempt',
      'security.intrusion_attempt'
    ], 60);

    let risk: 'low' | 'medium' | 'high' = 'low';
    
    if (suspiciousEvents > 0 || failedLogins > 3) {
      risk = 'high';
    } else if (recentEvents > 50 || failedLogins > 1) {
      risk = 'medium';
    }

    this.ipRiskCache.set(ipAddress, { risk, timestamp: new Date() });
    return risk;
  }

  getStats(options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): SecurityStats {
    let filtered = [...this.events];

    if (options.startDate) {
      filtered = filtered.filter((e: any) => e.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter((e: any) => e.timestamp <= options.endDate!);
    }

    const stats: SecurityStats = {
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

    const ipCounts: Record<string, number> = {};

    filtered.forEach((event: any) => {
      // Count by type
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      
      // Count by severity
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
      
      // Count IPs
      ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1;
      
      // Specific counts
      if (event.type === 'auth.failed_login') stats.failedLogins++;
      if (event.type.startsWith('security.')) stats.suspiciousActivities++;
      if (event.result === 'blocked') stats.blockedRequests++;
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

  getEvents(options: {
    type?: SecurityEventType | SecurityEventType[];
    severity?: string;
    userId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): SecurityEvent[] {
    let filtered = [...this.events];

    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      filtered = filtered.filter((e: any) => types.includes(e.type));
    }

    if (options.severity) {
      filtered = filtered.filter((e: any) => e.severity === options.severity);
    }

    if (options.userId) {
      filtered = filtered.filter((e: any) => e.userId === options.userId);
    }

    if (options.ipAddress) {
      filtered = filtered.filter((e: any) => e.ipAddress === options.ipAddress);
    }

    if (options.startDate) {
      filtered = filtered.filter((e: any) => e.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter((e: any) => e.timestamp <= options.endDate!);
    }

    return filtered.slice(0, options.limit || 100);
  }

  getRules(): SecurityRule[] {
    return [...this.rules];
  }

  updateRule(ruleId: string, updates: Partial<SecurityRule>): boolean {
    const rule = this.rules.find((r: any) => r.id === ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    return true;
  }

  addRule(rule: Omit<SecurityRule, 'id'>): SecurityRule {
    const newRule: SecurityRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.rules.push(newRule);
    return newRule;
  }

  private async persistEvent(event: SecurityEvent): Promise<void> {
    // In production, save to database
    // For now, just keep in memory
  }

  private sendSecurityAlert(event: SecurityEvent, rule: SecurityRule): void {
    // In production, send email/Slack notification
    logger.warn(`[SECURITY ALERT] ${rule.name} triggered`, {
      event,
      rule
    });
  }
}

// Singleton instance
export const securityAuditService = new SecurityAuditService();

// Convenience functions
export function logSecurityEvent(
  event: Omit<SecurityEvent, 'id' | 'timestamp'>
): Promise<SecurityEvent> {
  return securityAuditService.logEvent(event);
}

export function isIPBlocked(ipAddress: string): boolean {
  return securityAuditService.isIPBlocked(ipAddress);
}