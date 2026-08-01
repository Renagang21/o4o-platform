/**
 * WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1
 *
 * IP 차단의 TTL · 자동 만료 · 재차단 연장 · 관리자 해제를 검증한다.
 * 시간 의존 검증은 fake timer 로 처리하고 실제 sleep 을 쓰지 않는다.
 */
import {
  DEFAULT_IP_BLOCK_TTL_MS,
  resolveIpBlockTtlMs,
  securityAuditService,
} from '../SecurityAuditService.js';

const IP_A = '203.0.113.10';
const IP_B = '203.0.113.20';

beforeEach(() => {
  jest.useFakeTimers();
  // 각 테스트가 서로 간섭하지 않도록 대상 IP 를 먼저 비운다
  securityAuditService.unblockIP(IP_A);
  securityAuditService.unblockIP(IP_B);
  securityAuditService.unblockIP('10.0.0.1');
});

afterEach(() => {
  securityAuditService.unblockIP(IP_A);
  securityAuditService.unblockIP(IP_B);
  securityAuditService.unblockIP('10.0.0.1');
  jest.useRealTimers();
});

describe('resolveIpBlockTtlMs', () => {
  it('기본값은 60분', () => {
    expect(DEFAULT_IP_BLOCK_TTL_MS).toBe(60 * 60 * 1000);
    expect(resolveIpBlockTtlMs(undefined)).toBe(DEFAULT_IP_BLOCK_TTL_MS);
    expect(resolveIpBlockTtlMs('')).toBe(DEFAULT_IP_BLOCK_TTL_MS);
  });

  it('유효한 값은 그대로 쓴다', () => {
    expect(resolveIpBlockTtlMs('300000')).toBe(300000);
  });

  it('0 이하 · 비정수 · 상한 초과는 기본값으로 폴백한다 (사실상 영구 차단 방지)', () => {
    for (const bad of ['0', '-1', '1.5', 'abc', String(25 * 60 * 60 * 1000)]) {
      expect(resolveIpBlockTtlMs(bad)).toBe(DEFAULT_IP_BLOCK_TTL_MS);
    }
  });
});

describe('IP 차단 TTL', () => {
  it('차단 직후에는 차단 상태다', () => {
    securityAuditService.blockIP(IP_A, { reason: 'test', source: 'unit' });
    expect(securityAuditService.isIPBlocked(IP_A)).toBe(true);
  });

  it('TTL 이내에는 차단이 유지된다', () => {
    securityAuditService.blockIP(IP_A);
    jest.advanceTimersByTime(DEFAULT_IP_BLOCK_TTL_MS - 1000);
    expect(securityAuditService.isIPBlocked(IP_A)).toBe(true);
  });

  it('TTL 경과 후 자동 해제되고 목록에서도 사라진다 (lazy expiration)', () => {
    securityAuditService.blockIP(IP_A);
    jest.advanceTimersByTime(DEFAULT_IP_BLOCK_TTL_MS + 1000);
    expect(securityAuditService.isIPBlocked(IP_A)).toBe(false);
    expect(securityAuditService.getBlockedIPs().some((r) => r.ip === IP_A)).toBe(false);
  });

  it('재탐지 시 TTL 을 연장하고 중복 레코드를 만들지 않는다', () => {
    securityAuditService.blockIP(IP_A);
    const first = securityAuditService.getBlockedIPs().find((r) => r.ip === IP_A)!;

    jest.advanceTimersByTime(30 * 60 * 1000); // 30분 경과
    securityAuditService.blockIP(IP_A);       // 재탐지

    const rows = securityAuditService.getBlockedIPs().filter((r) => r.ip === IP_A);
    expect(rows).toHaveLength(1);             // 중복 없음
    expect(new Date(rows[0].blockedUntil).getTime())
      .toBeGreaterThan(new Date(first.blockedUntil).getTime());
    expect(rows[0].blockedAt).toBe(first.blockedAt); // 최초 차단 시각은 보존

    // 원래 만료시각을 지나도 연장분 덕분에 여전히 차단
    jest.advanceTimersByTime(31 * 60 * 1000);
    expect(securityAuditService.isIPBlocked(IP_A)).toBe(true);
  });

  it('다른 IP 에는 영향이 없다', () => {
    securityAuditService.blockIP(IP_A);
    expect(securityAuditService.isIPBlocked(IP_B)).toBe(false);
  });
});

describe('관리자 해제', () => {
  it('차단된 IP 를 해제하면 즉시 통과한다', () => {
    securityAuditService.blockIP(IP_A);
    expect(securityAuditService.unblockIP(IP_A)).toBe(true);
    expect(securityAuditService.isIPBlocked(IP_A)).toBe(false);
  });

  it('없는 IP 해제는 멱등이다 (changed=false)', () => {
    expect(securityAuditService.unblockIP(IP_B)).toBe(false);
    expect(securityAuditService.unblockIP(IP_B)).toBe(false);
  });

  it('만료된 IP 해제도 멱등이다', () => {
    securityAuditService.blockIP(IP_A);
    jest.advanceTimersByTime(DEFAULT_IP_BLOCK_TTL_MS + 1000);
    securityAuditService.isIPBlocked(IP_A); // lazy 정리 유발
    expect(securityAuditService.unblockIP(IP_A)).toBe(false);
  });
});

describe('IP 정규화', () => {
  it('IPv4-mapped IPv6 와 IPv4 가 같은 레코드로 취급된다', () => {
    securityAuditService.blockIP('::ffff:10.0.0.1');
    expect(securityAuditService.isIPBlocked('10.0.0.1')).toBe(true);
    expect(securityAuditService.getBlockedIPs().filter((r) => r.ip === '10.0.0.1')).toHaveLength(1);
  });
});

describe('차단 목록 응답', () => {
  it('남은 시간 · 사유 · 출처를 포함하고 민감 payload 는 담지 않는다', () => {
    securityAuditService.blockIP(IP_A, { reason: 'SQL Injection Attempt', source: 'rule_sql_injection' });
    const row = securityAuditService.getBlockedIPs().find((r) => r.ip === IP_A)!;

    expect(row.remainingSeconds).toBeGreaterThan(0);
    expect(row.reason).toBe('SQL Injection Attempt');
    expect(row.source).toBe('rule_sql_injection');
    expect(Object.keys(row).sort()).toEqual(
      ['blockedAt', 'blockedUntil', 'ip', 'reason', 'remainingSeconds', 'source'],
    );
  });
});
