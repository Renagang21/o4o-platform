import rateLimit, { Store } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import { Request, Response } from 'express';

// Redis 클라이언트 (기존 redis 설정 사용)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
});

// 기본 레이트 리밋 설정
export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100개 요청
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      const result = await redisClient.call.apply(redisClient, args);
      return result as boolean | number | string | (boolean | number | string)[];
    },
    prefix: 'rl:default:',
  }) as unknown as Store,
});

// 엄격한 레이트 리밋 (로그인, 회원가입 등)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5개 요청
  message: '너무 많은 시도가 감지되었습니다. 15분 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      const result = await redisClient.call.apply(redisClient, args);
      return result as boolean | number | string | (boolean | number | string)[];
    },
    prefix: 'rl:strict:',
  }) as unknown as Store,
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
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      const result = await redisClient.call.apply(redisClient, args);
      return result as boolean | number | string | (boolean | number | string)[];
    },
    prefix: 'rl:api:',
  }) as unknown as Store,
  keyGenerator: (req: Request) => {
    // IP + User ID 조합으로 키 생성
    const userId = (req as any).user?.id || 'anonymous';
    return `${req.ip}:${userId}`;
  },
});

// 파일 업로드 레이트 리밋
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 20, // 시간당 20개 파일
  message: '파일 업로드 한도를 초과했습니다. 1시간 후 다시 시도해주세요.',
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      const result = await redisClient.call.apply(redisClient, args);
      return result as boolean | number | string | (boolean | number | string)[];
    },
    prefix: 'rl:upload:',
  }) as unknown as Store,
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
    store: new RedisStore({
      sendCommand: async (...args: string[]) => {
        const result = await redisClient.call.apply(redisClient, args);
        return result as boolean | number | string | (boolean | number | string)[];
      },
      prefix: `rl:${tier}:`,
    }) as unknown as Store,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || req.ip;
      return `${userId}`;
    },
  });
};

// 스마트 레이트 리밋 (자동 조절)
export class SmartRateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  private suspiciousIPs: Set<string> = new Set();

  middleware() {
    return async (req: Request, res: Response, next: Function) => {
      const ip = req.ip;
      const now = Date.now();
      
      // 의심스러운 IP 체크
      if (this.suspiciousIPs.has(ip)) {
        return res.status(429).json({
          error: '비정상적인 활동이 감지되었습니다.',
          blocked: true,
        });
      }

      // 요청 기록
      if (!this.requestCounts.has(ip)) {
        this.requestCounts.set(ip, []);
      }

      const requests = this.requestCounts.get(ip)!;
      requests.push(now);

      // 1분 이내 요청만 유지
      const oneMinuteAgo = now - 60000;
      const recentRequests = requests.filter(time => time > oneMinuteAgo);
      this.requestCounts.set(ip, recentRequests);

      // 패턴 분석
      if (recentRequests.length > 100) {
        // 1분에 100개 이상 요청 시 의심
        this.suspiciousIPs.add(ip);
        // Warning log removed
        
        // 30분 후 자동 해제
        setTimeout(() => {
          this.suspiciousIPs.delete(ip);
        }, 30 * 60 * 1000);

        return res.status(429).json({
          error: '비정상적인 활동이 감지되었습니다.',
          blocked: true,
        });
      }

      // 버스트 패턴 감지 (1초에 10개 이상)
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

  // 수동으로 IP 차단/해제
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