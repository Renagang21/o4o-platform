/**
 * Rate Limiter Middleware
 *
 * WO-O4O-REDIS-SESSIONSYNC-REMOVAL-AND-MEMORYSTORE-DECOMMISSION-V1
 * - Redis store 제거. 메모리 기반 rate limiting 만 사용한다.
 *   (Redis store 는 6주간 incr/eval 명령 0건으로 실사용이 없었다.)
 */

// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
import { createHash } from 'node:crypto';
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

// WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 (11차) — 인증 앞단 IP 상한
//
//   `apiLimiter` 는 키에 `req.user.id` 를 쓰므로 **인증 뒤**에 놓여야 사용자 단위로 동작한다.
//   그런데 인증 미들웨어 자체도 rate limit 없이 노출되면 안 된다(미인증 flooding).
//   그래서 두 겹으로 둔다:
//     ① `ipBurstLimiter` — 인증 **앞**, IP 단위. 미인증 폭주를 막는 **상한**이지
//        사용자 할당량이 아니다. 같은 NAT 뒤 여러 사용자가 정상 사용해도 닿지 않도록
//        1인 할당량(분당 60)의 10배로 잡는다.
//     ② `apiLimiter`   — 인증 **뒤**, `${ip}:${userId}` 단위. 실제 사용자 할당량.
//   invalid token 은 인증에서 걸러지므로 ② 의 개인 버킷을 만들 수 없다.
export const ipBurstLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 600, // IP 당 분당 600개 — 공유 IP 상한(1인 할당량 아님)
  message: {
    error: '요청이 너무 많습니다.',
    retryAfter: '1분 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getTrustedClientIp(req),
});

// WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-5: 이메일·비밀번호 인증 경로 제한.
//   키는 신뢰 가능한 클라이언트 IP(`getTrustedClientIp`) — 프록시 IP 하나로 전원이 묶이지 않는다.
//   ⚠ 메모리 저장소다(Redis 은퇴). Cloud Run 인스턴스마다 따로 센다 — 인스턴스 N 개면 실제 상한은 N 배.
//     대입 공격의 근본 방어는 bcrypt 비용(1회 수백 ms)과 일반화된 실패 응답이며, 이 제한은 그 위의 상한이다.
function emailAuthLimiter(
  windowMs: number,
  max: number,
  message: string,
  keyGenerator: (req: Request) => string = (req) => getTrustedClientIp(req),
  skipSuccessfulRequests = false,
) {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message, code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skipSuccessfulRequests,
  });
}

// 로그인 — WO §2-1 "`strictLimiter` 축": 15분 · **실패 5회** · 성공은 세지 않는다.
//   `strictLimiter` 와 같은 설정(windowMs · max · skipSuccessfulRequests)이되 인스턴스는 따로 둔다 —
//   `strictLimiter` 는 키가 express 기본 `req.ip` 이고 429 본문이 문자열이라
//   신뢰 클라이언트 IP 키 · `{ success:false, code:'RATE_LIMITED' }` 계약을 맞추지 못한다.
//   실패 = 응답 status ≥ 400(express-rate-limit 기본 판정). 성공(2xx)은 자기 카운트를 되돌릴 뿐
//   앞선 실패를 지우지 않는다 — 실패는 창(15분)이 끝날 때까지 유지(`strictLimiter` 와 같은 정책).
/** 이메일 로그인 limiter — 각 호출이 별도 저장소를 갖는다(테스트는 새로 만든다) */
export function createEmailLoginLimiter() {
  return emailAuthLimiter(
    15 * 60 * 1000,
    5,
    '로그인 실패가 너무 많습니다. 15분 뒤 다시 시도해 주세요.',
    (req) => getTrustedClientIp(req),
    true,
  );
}

/** 로그인 — IP 당 15분 실패 5회 (성공 로그인은 세지 않음) */
export const emailLoginLimiter = createEmailLoginLimiter();

/** 가입 — IP 당 1시간 10회 */
export const emailSignupLimiter = emailAuthLimiter(
  60 * 60 * 1000,
  10,
  '가입 요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.',
);

/** 메일 발송(확인 재발송 · 비밀번호 찾기) — IP 당 1시간 10회 */
export const emailMailLimiter = emailAuthLimiter(
  60 * 60 * 1000,
  10,
  '메일 요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.',
);

/** 토큰 소비(확인 · 재설정) · 비밀번호 변경 — IP 당 15분 30회 */
export const emailTokenLimiter = emailAuthLimiter(
  15 * 60 * 1000,
  30,
  '요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.',
);

// 아이디 찾기 — WO §2-3 "조회 횟수를 IP · 입력값 기준으로 제한한다".
//   ① IP 기준   : IP 당 1시간 10회 — 한 IP 에서 여러 이름·전화를 대입하는 것을 늦춘다.
//   ② 입력값 기준: 같은 이름·전화 조합당 1시간 5회 — 여러 IP 로 나눠 같은 조합을 반복하는 것을 늦춘다.
//   두 limiter 는 각각 독립 적용된다(어느 하나만 넘어도 429).
//   입력값 키는 `findLoginId` 의 대조 규칙(이름 trim · 전화 숫자만)과 같게 정규화한 뒤 SHA-256 으로만 남긴다 —
//   같은 조회가 되는 입력은 같은 키, 원문 이름·전화는 저장소 키에 남지 않는다.
//   계정 존재 여부와 무관하게 모든 요청을 센다(skipSuccessfulRequests 없음) — 429 발생 자체가 가입 단서가 되지 않는다.
const FIND_LOGIN_ID_WINDOW_MS = 60 * 60 * 1000;
const FIND_LOGIN_ID_MESSAGE = '아이디 찾기 요청이 너무 많습니다. 1시간 뒤 다시 시도해 주세요.';

/** 아이디 찾기 입력값 limiter 키 — `findid:` + sha256(trim(name) + '\0' + 전화 숫자) */
export function findLoginIdInputKey(body: unknown): string {
  const b = (body ?? {}) as { name?: unknown; phone?: unknown };
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const phone = typeof b.phone === 'string' ? b.phone.replace(/\D/g, '') : '';
  return `findid:${createHash('sha256').update(`${name}\u0000${phone}`, 'utf8').digest('hex')}`;
}

/** 아이디 찾기 limiter 한 쌍 — 각 호출이 별도 저장소를 갖는다(테스트는 새로 만든다) */
export function createFindLoginIdLimiters() {
  return {
    ip: emailAuthLimiter(FIND_LOGIN_ID_WINDOW_MS, 10, FIND_LOGIN_ID_MESSAGE),
    input: emailAuthLimiter(FIND_LOGIN_ID_WINDOW_MS, 5, FIND_LOGIN_ID_MESSAGE, (req) => findLoginIdInputKey(req.body)),
  };
}

const findLoginIdLimiters = createFindLoginIdLimiters();
/** 아이디 찾기 — IP 기준 (IP 당 1시간 10회) */
export const findLoginIdLimiter = findLoginIdLimiters.ip;
/** 아이디 찾기 — 입력값 기준 (이름·전화 조합당 1시간 5회) */
export const findLoginIdInputLimiter = findLoginIdLimiters.input;

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
