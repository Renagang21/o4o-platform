import { Request, Response, NextFunction } from 'express';
import { securityAuditService, isIPBlocked, logSecurityEvent } from '../services/SecurityAuditService';

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
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|into|where|table)\b)/i,
    /(\b(or|and)\b.*=.*)/i,
    /(--|\||;|\/\*|\*\/|xp_|sp_)/i,
    /('|")\s*(or|and)\s*('|")\s*=/i
  ];
  
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
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
    
    logSecurityEvent({
      type: 'security.sql_injection',
      severity: 'critical',
      ipAddress,
      userAgent: req.get('user-agent'),
      action: 'SQL injection attempt detected',
      resource: req.path,
      result: 'blocked',
      details: {
        query: req.query,
        body: req.body,
        params: req.params
      }
    });
    
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Your request contains invalid characters'
    });
  }
  
  next();
}