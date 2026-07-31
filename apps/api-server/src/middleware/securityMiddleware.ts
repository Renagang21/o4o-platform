import { Request, Response, NextFunction } from 'express';
import { securityAuditService, isIPBlocked, logSecurityEvent } from '../services/SecurityAuditService.js';
// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
import { suspiciousFieldNames } from '../utils/security-log-redaction.js';

/**
 * Security middleware to check blocked IPs and log security events
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Check if IP is blocked
  if (isIPBlocked(ipAddress)) {
    logSecurityEvent({
      type: 'security.intrusion_attempt',
      severity: 'high',
      ipAddress,
      userAgent: req.get('user-agent'),
      action: 'Blocked request from banned IP',
      resource: req.path,
      result: 'blocked'
    });
    
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been blocked due to suspicious activity'
    });
  }
  
  // Log API access for sensitive routes
  if (req.path.includes('/admin/') || req.path.includes('/api/v1/users/')) {
    const userId = (req as any).user?.id;
    logSecurityEvent({
      type: 'data.access',
      severity: 'low',
      userId,
      ipAddress,
      userAgent: req.get('user-agent'),
      action: `Accessed ${req.method} ${req.path}`,
      resource: req.path,
      result: 'success'
    });
  }
  
  next();
}

/**
 * Enhanced authentication failure handler
 */
export function handleAuthFailure(req: Request, error: string, userEmail?: string) {
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  
  logSecurityEvent({
    type: 'auth.failed_login',
    severity: 'medium',
    userEmail,
    ipAddress,
    userAgent: req.get('user-agent'),
    action: 'Failed login attempt',
    result: 'failure',
    details: { error }
  });
}

/**
 * SQL injection detection middleware
 */
export function sqlInjectionDetection(req: Request, res: Response, next: NextFunction) {
  // Whitelist OAuth callback routes - they contain authorization codes that look suspicious
  const oauthCallbackRoutes = [
    '/api/v1/social/google/callback',
    '/api/v1/social/kakao/callback',
    '/api/v1/social/naver/callback'
  ];

  if (oauthCallbackRoutes.includes(req.path)) {
    return next();
  }

  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|into|where|table)\b)/i,
    /(\b(or|and)\b.*=.*)/i,
    /(--|\||;|\/\*|\*\/|xp_|sp_)/i,
    /('|")\s*(or|and)\s*('|")\s*=/i
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some((pattern: any) => pattern.test(value));
    }
    return false;
  };

  // Check query params, body, and params
  const suspicious = 
    Object.values(req.query || {}).some(checkValue) ||
    Object.values(req.body || {}).some(checkValue) ||
    Object.values(req.params || {}).some(checkValue);
  
  if (suspicious) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    // WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1:
    //   기존에는 details 에 query/body/params **전문**을 담았다. 위 탐지 패턴에 `--` · `;` · `|`
    //   가 포함돼 있어 비밀번호에 그런 문자가 들어가면 로그인 요청이 걸리고 **비밀번호가
    //   그대로 로그에 적재**됐다 (이 경로의 winston 로거에는 redaction 이 없다).
    //   → 값은 남기지 않고 **걸린 필드 이름만** 기록한다.
    logSecurityEvent({
      type: 'security.sql_injection',
      severity: 'critical',
      ipAddress,
      userAgent: req.get('user-agent'),
      action: 'SQL injection attempt detected',
      resource: req.path,
      result: 'blocked',
      details: {
        method: req.method,
        matchedFields: {
          query: suspiciousFieldNames(req.query, checkValue),
          body: suspiciousFieldNames(req.body, checkValue),
          params: suspiciousFieldNames(req.params, checkValue)
        }
      }
    });
    
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Your request contains invalid characters'
    });
  }
  
  next();
}