/**
 * WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
 *
 * 프로덕션 실측 체인(2026-08-01):
 *   A. XFF 미주입 : [ <client-ip>, <lb-ip> ]
 *   B. XFF 주입   : [ <주입값>, <client-ip>, <lb-ip> ]
 * → 신뢰 hop 수 = 2, 실제 클라이언트 IP 는 오른쪽에서 두 번째.
 */
import type { Request } from 'express';
import {
  DEFAULT_TRUSTED_PROXY_HOPS,
  getTrustedClientIp,
  normalizeIp,
  resolveTrustedProxyHops,
} from '../trusted-client-ip.js';

const asReq = (ip?: string, remoteAddress?: string) =>
  ({ ip, socket: { remoteAddress } } as unknown as Request);

describe('resolveTrustedProxyHops', () => {
  it('기본값은 프로덕션 실측값 2 다', () => {
    expect(DEFAULT_TRUSTED_PROXY_HOPS).toBe(2);
    expect(resolveTrustedProxyHops(undefined)).toBe(2);
    expect(resolveTrustedProxyHops('')).toBe(2);
  });

  it('유효한 정수는 그대로 쓴다', () => {
    expect(resolveTrustedProxyHops('0')).toBe(0);
    expect(resolveTrustedProxyHops('1')).toBe(1);
    expect(resolveTrustedProxyHops('3')).toBe(3);
  });

  it('잘못된 값은 기본값으로 폴백한다', () => {
    for (const bad of ['-1', '1.5', 'abc', '999', 'true']) {
      expect(resolveTrustedProxyHops(bad)).toBe(DEFAULT_TRUSTED_PROXY_HOPS);
    }
  });
});

describe('normalizeIp', () => {
  it('IPv4-mapped IPv6 를 IPv4 로 정규화한다', () => {
    expect(normalizeIp('::ffff:127.0.0.1')).toBe('127.0.0.1');
    expect(normalizeIp('::FFFF:112.153.205.95')).toBe('112.153.205.95');
  });

  it('IPv4 는 그대로 둔다', () => {
    expect(normalizeIp('203.0.113.7')).toBe('203.0.113.7');
  });

  it('IPv6 는 소문자로 통일한다', () => {
    expect(normalizeIp('2001:DB8::1')).toBe('2001:db8::1');
  });

  it('공백을 제거하고 빈 값은 빈 문자열', () => {
    expect(normalizeIp('  203.0.113.7  ')).toBe('203.0.113.7');
    expect(normalizeIp('')).toBe('');
    expect(normalizeIp(undefined)).toBe('');
    expect(normalizeIp(null)).toBe('');
  });

  it('같은 주소의 서로 다른 표기가 같은 키가 된다 (중복 차단 방지)', () => {
    expect(normalizeIp('::ffff:10.0.0.1')).toBe(normalizeIp('10.0.0.1'));
  });
});

describe('getTrustedClientIp', () => {
  it('trust proxy 판정을 거친 req.ip 를 쓴다', () => {
    expect(getTrustedClientIp(asReq('112.153.205.95', '169.254.1.1'))).toBe('112.153.205.95');
  });

  it('req.ip 가 없으면 TCP 피어 주소로 폴백한다 (로컬·직결)', () => {
    expect(getTrustedClientIp(asReq(undefined, '::ffff:127.0.0.1'))).toBe('127.0.0.1');
  });

  it('둘 다 없으면 unknown — 임의 문자열이 키가 되지 않도록 고정', () => {
    expect(getTrustedClientIp(asReq(undefined, undefined))).toBe('unknown');
    expect(getTrustedClientIp(asReq('', ''))).toBe('unknown');
  });

  it('반환값은 정규화된다', () => {
    expect(getTrustedClientIp(asReq('::ffff:203.0.113.7'))).toBe('203.0.113.7');
  });

  it('X-Forwarded-For 헤더를 직접 읽지 않는다', () => {
    // 헤더만 있고 req.ip 가 없으면 헤더 값을 채택하지 않는다 (직접 파싱 금지 원칙)
    const req = { headers: { 'x-forwarded-for': '203.0.113.7' }, socket: { remoteAddress: '10.0.0.9' } } as unknown as Request;
    expect(getTrustedClientIp(req)).toBe('10.0.0.9');
  });
});
