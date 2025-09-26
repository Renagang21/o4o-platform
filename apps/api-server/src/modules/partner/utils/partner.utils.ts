import * as crypto from 'crypto';

/**
 * Generate a unique referral code
 * Format: PREFIX-RANDOM-CHECKSUM (e.g., AFF-X3K9M2-7B)
 */
export function generateReferralCode(prefix: string = 'AFF'): string {
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  const timestamp = Date.now().toString(36).slice(-2).toUpperCase();
  const checksum = generateChecksum(`${prefix}-${randomPart}`);
  
  return `${prefix}-${randomPart}${timestamp}-${checksum}`;
}

/**
 * Generate a simple checksum for validation
 */
function generateChecksum(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return hash.slice(0, 2).toUpperCase();
}

/**
 * Validate referral code format
 */
export function validateReferralCode(code: string): boolean {
  const pattern = /^[A-Z]+-[A-Z0-9]{6}-[A-Z0-9]{2}$/;
  return pattern.test(code);
}

/**
 * Generate partner link
 */
export function generatePartnerLink(
  baseUrl: string,
  referralCode: string,
  params?: Record<string, any>
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('ref', referralCode);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Parse partner parameters from URL
 */
export function parsePartnerParams(url: string): {
  referralCode?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  [key: string]: any;
} {
  try {
    const urlObj = new URL(url);
    const params: any = {};
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return {
      referralCode: params.ref || params.referral_code,
      source: params.utm_source || params.source,
      medium: params.utm_medium || params.medium,
      campaign: params.utm_campaign || params.campaign,
      ...params
    };
  } catch (error) {
    return {};
  }
}

/**
 * Calculate commission amount
 */
export function calculateCommission(
  orderAmount: number,
  commissionRate: number
): number {
  const commission = (orderAmount * commissionRate) / 100;
  return Math.round(commission * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate session ID for tracking
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create tracking cookie value
 */
export function createTrackingCookie(
  referralCode: string,
  sessionId: string
): string {
  const data = {
    ref: referralCode,
    sid: sessionId,
    ts: Date.now()
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Parse tracking cookie value
 */
export function parseTrackingCookie(cookieValue: string): {
  ref?: string;
  sid?: string;
  ts?: number;
} | null {
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Check if tracking cookie is expired (30 days)
 */
export function isTrackingCookieExpired(timestamp: number): boolean {
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > thirtyDaysInMs;
}

/**
 * Sanitize IP address
 */
export function sanitizeIpAddress(ip: string | string[]): string {
  if (Array.isArray(ip)) {
    return ip[0];
  }
  
  // Handle forwarded IPs
  if (ip.includes(',')) {
    return ip.split(',')[0].trim();
  }
  
  // Handle IPv6 mapped IPv4
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  return ip;
}

/**
 * Parse user agent for device info
 */
export function parseUserAgent(userAgent: string): {
  device?: string;
  browser?: string;
  os?: string;
} {
  const result: any = {};
  
  // Simple device detection
  if (/mobile/i.test(userAgent)) {
    result.device = 'mobile';
  } else if (/tablet/i.test(userAgent)) {
    result.device = 'tablet';
  } else {
    result.device = 'desktop';
  }
  
  // Simple browser detection
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) {
    result.browser = 'Chrome';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    result.browser = 'Safari';
  } else if (/firefox/i.test(userAgent)) {
    result.browser = 'Firefox';
  } else if (/edge/i.test(userAgent)) {
    result.browser = 'Edge';
  }
  
  // Simple OS detection
  if (/windows/i.test(userAgent)) {
    result.os = 'Windows';
  } else if (/mac/i.test(userAgent)) {
    result.os = 'macOS';
  } else if (/linux/i.test(userAgent)) {
    result.os = 'Linux';
  } else if (/android/i.test(userAgent)) {
    result.os = 'Android';
  } else if (/ios|iphone|ipad/i.test(userAgent)) {
    result.os = 'iOS';
  }
  
  return result;
}