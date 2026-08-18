/**
 * Rate Limiter Middleware
 *
 * WO-O4O-REDIS-SESSIONSYNC-REMOVAL-AND-MEMORYSTORE-DECOMMISSION-V1
 * - Redis store 제거. 메모리 기반 rate limiting 만 사용한다.
 *   (Redis store 는 6주간 incr/eval 명령 0건으로 실사용이 없었다.)
 */

// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
import { getTrustedClientIp } from '../utils/trusted-client-ip.js';
import rateLimit, { Store, MemoryStore } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

// 기본 레이트 리밋 설정
export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100개 요청
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 엄격한 레이트 리밋 (로그인, 회원가입 등)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5개 요청
  message: '너무 많은 시도가 감지되었습니다. 15분 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// API 엔드포인트별 레이트 리밋
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 60, // 분당 60개 요청
  message: {
    error: 'API 요청 한도를 초과했습니다.',
    retryAfter: '1분 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'anonymous';
    return `${getTrustedClientIp(req)}:${userId}`;
  },
});

// 파일 업로드 레이트 리밋
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 100, // 시간당 100개 파일
  message: '파일 업로드 한도를 초과했습니다. 1시간 후 다시 시도해주세요.',
});

// 동적 레이트 리밋 (사용자 티어별)
export const dynamicLimiter = (tier: 'free' | 'basic' | 'premium' = 'free') => {
  const limits = {
    free: { windowMs: 60000, max: 10 },
    basic: { windowMs: 60000, max: 60 },
    premium: { windowMs: 60000, max: 300 },
  };

  const config = limits[tier];

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: `요청 한도를 초과했습니다. (${tier} 플랜: 분당 ${config.max}개)`,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || getTrustedClientIp(req);
      return `${userId}`;
    },
  });
};

// 스마트 레이트 리밋 (자동 조절) - 메모리 기반
export class SmartRateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  private suspiciousIPs: Set<string> = new Set();

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = getTrustedClientIp(req);
      const now = Date.now();

      if (this.suspiciousIPs.has(ip)) {
        return res.status(429).json({
          error: '비정상적인 활동이 감지되었습니다.',
          blocked: true,
        });
      }

      if (!this.requestCounts.has(ip)) {
        this.requestCounts.set(ip, []);
      }

      const requests = this.requestCounts.get(ip)!;
      requests.push(now);

      const oneMinuteAgo = now - 60000;
      const recentRequests = requests.filter(time => time > oneMinuteAgo);
      this.requestCounts.set(ip, recentRequests);

      if (recentRequests.length > 100) {
        this.suspiciousIPs.add(ip);
        setTimeout(() => {
          this.suspiciousIPs.delete(ip);
        }, 30 * 60 * 1000);

        return res.status(429).json({
          error: '비정상적인 활동이 감지되었습니다.',
          blocked: true,
        });
      }

      const oneSecondAgo = now - 1000;
      const burstRequests = recentRequests.filter(time => time > oneSecondAgo);
      if (burstRequests.length > 10) {
        return res.status(429).json({
          error: '너무 빠른 요청입니다. 잠시 후 다시 시도해주세요.',
          retryAfter: 1,
        });
      }

      next();
    };
  }

  blockIP(ip: string) {
    this.suspiciousIPs.add(ip);
  }

  unblockIP(ip: string) {
    this.suspiciousIPs.delete(ip);
  }

  getBlockedIPs() {
    return Array.from(this.suspiciousIPs);
  }
}

export const smartLimiter = new SmartRateLimiter();
