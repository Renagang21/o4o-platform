import { Request, Response, NextFunction } from 'express';
import { securityAuditService, isIPBlocked, logSecurityEvent } from '../services/SecurityAuditService.js';
// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
import { suspiciousFieldNames } from '../utils/security-log-redaction.js';
import { getTrustedClientIp } from '../utils/trusted-client-ip.js';

/**
 * Security middleware to check blocked IPs and log security events
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  const ipAddress = getTrustedClientIp(req);
  
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
  const ipAddress = getTrustedClientIp(req);
  
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
const socialProofPaths = new Set([
  '/api/v1/auth/social/kakao/complete',
  '/api/v1/auth/social/reauth/complete',
  '/api/v1/auth/social/link/verify',
]);
const socialTokenPaths = new Set([
  ...socialProofPaths,
  '/api/v1/auth/social/kakao/signup',
  '/api/v1/auth/social/link/start',
  '/api/v1/auth/social/link/confirm',
]);

/** Opaque proofs can contain `--`/`sp_`; SQL punctuation scanning is not their validator.
 * This only excludes exact method/path/field + bounded URL-safe shapes from this heuristic.
 * Controllers still validate origin, hashed one-use flow, browser binding and provider proof.
 * These values are hashed/parameter-bound or sent as encoded provider data, never SQL text.
 */
function isOpaqueSocialProof(req: Request, section: string, field: string, value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const flowToken = /^[A-Za-z0-9_-]{43}$/.test(value);
  const providerCode = value.length > 0 && value.length <= 2048 && /^[A-Za-z0-9._~-]+$/.test(value);
  if (req.method === 'GET' && req.path === '/api/v1/auth/social/kakao/callback' && section === 'query') {
    return (field === 'state' && flowToken) || (field === 'code' && providerCode);
  }
  if (req.method !== 'POST' || section !== 'body') return false;
  if (field === 'token' && socialTokenPaths.has(req.path)) return flowToken;
  if (!socialProofPaths.has(req.path)) return false;
  if (field === 'code') return providerCode;
  return field === 'idToken' && value.length <= 16384 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

export function sqlInjectionDetection(req: Request, res: Response, next: NextFunction) {
  // Retired Passport `/api/v1/social/*` routes remain excluded from the proof contract above.

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

  // Preserve the request for downstream validation; only filter this heuristic's candidates.
  const candidates = (section: string, fields: Record<string, unknown>) => Object.fromEntries(
    Object.entries(fields || {}).filter(([field, value]) => !isOpaqueSocialProof(req, section, field, value))
  );
  const query = candidates('query', req.query);
  const body = candidates('body', req.body);
  const params = candidates('params', req.params);
  const suspicious = 
    Object.values(query).some(checkValue) ||
    Object.values(body).some(checkValue) ||
    Object.values(params).some(checkValue);
  
  if (suspicious) {
    const ipAddress = getTrustedClientIp(req);

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
          query: suspiciousFieldNames(query, checkValue),
          body: suspiciousFieldNames(body, checkValue),
          params: suspiciousFieldNames(params, checkValue)
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
