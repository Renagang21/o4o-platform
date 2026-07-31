/**
 * WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
 *
 * 보안 로그에 비밀번호·토큰 등 민감값이 남지 않는지 검증한다.
 */
import {
  REDACTED,
  isSensitiveKey,
  redactSensitive,
  suspiciousFieldNames,
} from '../security-log-redaction.js';

describe('isSensitiveKey', () => {
  it('비밀번호 계열을 인식한다', () => {
    for (const k of ['password', 'passwd', 'pwd', 'currentPassword', 'new_password', 'PASSWORD']) {
      expect(isSensitiveKey(k)).toBe(true);
    }
  });

  it('토큰 · 시크릿 · 자격증명 계열을 인식한다', () => {
    for (const k of [
      'token', 'accessToken', 'refreshToken', 'csrf_token',
      'secret', 'clientSecret', 'apiKey', 'api_key', 'privateKey',
      'authorization', 'auth', 'cookie', 'sessionId', 'session_id', 'credential',
    ]) {
      expect(isSensitiveKey(k)).toBe(true);
    }
  });

  it('개인식별 계열을 인식한다', () => {
    for (const k of ['otp', 'pin', 'cardNumber', 'card_number', 'cvv', 'ssn', 'residentNumber']) {
      expect(isSensitiveKey(k)).toBe(true);
    }
  });

  it('일반 필드는 민감으로 오판하지 않는다', () => {
    for (const k of ['email', 'name', 'phone', 'status', 'page', 'search', 'offerId', 'quantity']) {
      expect(isSensitiveKey(k)).toBe(false);
    }
  });
});

describe('redactSensitive', () => {
  it('로그인 요청 body 의 비밀번호를 치환한다', () => {
    const out = redactSensitive({ email: 'a@b.c', password: "hunter2';--" }) as Record<string, unknown>;
    expect(out.password).toBe(REDACTED);
    expect(out.email).toBe('a@b.c');
  });

  it('중첩 객체 안의 민감값도 치환한다', () => {
    const out = redactSensitive({
      user: { email: 'a@b.c', profile: { password: 'p', accessToken: 't', nickname: 'n' } },
    }) as any;
    expect(out.user.profile.password).toBe(REDACTED);
    expect(out.user.profile.accessToken).toBe(REDACTED);
    expect(out.user.profile.nickname).toBe('n');
    expect(out.user.email).toBe('a@b.c');
  });

  it('민감 키가 객체를 담고 있으면 객체 전체를 치환한다', () => {
    // `credentials` 자체가 민감 키 → 내부를 순회하지 않고 통째로 가린다 (더 안전한 쪽)
    const out = redactSensitive({
      user: { credentials: { password: 'p', accessToken: 't' } },
    }) as any;
    expect(out.user.credentials).toBe(REDACTED);
    expect(JSON.stringify(out)).not.toContain('accessToken');
  });

  it('입력 객체를 변형하지 않는다', () => {
    const input = { password: 'secret', email: 'a@b.c' };
    redactSensitive(input);
    expect(input.password).toBe('secret');
  });

  it('null · undefined · 원시값을 안전하게 처리한다', () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(true)).toBe(true);
  });

  it('과도한 깊이는 잘라낸다 (로그 폭주 방지)', () => {
    const deep = { a: { b: { c: { d: { e: 'too deep' } } } } };
    expect(JSON.stringify(redactSensitive(deep))).toContain('[Object]');
  });

  it('긴 문자열은 잘라낸다', () => {
    const out = redactSensitive({ note: 'x'.repeat(500) }) as Record<string, string>;
    expect(out.note.length).toBeLessThan(500);
    expect(out.note).toContain('[truncated]');
  });

  it('배열 길이와 키 개수에 상한을 둔다', () => {
    const arr = redactSensitive({ items: Array.from({ length: 50 }, (_, i) => i) }) as any;
    expect(arr.items.length).toBeLessThanOrEqual(11);
    const many: Record<string, number> = {};
    for (let i = 0; i < 60; i++) many[`k${i}`] = i;
    expect(Object.keys(redactSensitive(many) as object).length).toBeLessThanOrEqual(31);
  });

  it('배열 안의 민감 키도 치환한다', () => {
    const out = redactSensitive({ list: [{ password: 'p' }, { token: 't' }] }) as any;
    expect(out.list[0].password).toBe(REDACTED);
    expect(out.list[1].token).toBe(REDACTED);
  });
});

describe('suspiciousFieldNames', () => {
  const hasQuote = (v: unknown) => typeof v === 'string' && v.includes("'");

  it('조건에 걸린 필드의 이름만 돌려준다 (값 미포함)', () => {
    const names = suspiciousFieldNames({ email: 'a@b.c', password: "x'--" }, hasQuote);
    expect(names).toEqual(['password']);
    expect(JSON.stringify(names)).not.toContain("x'--");
  });

  it('걸린 필드가 없으면 빈 배열', () => {
    expect(suspiciousFieldNames({ a: 'ok' }, hasQuote)).toEqual([]);
  });

  it('객체가 아니면 빈 배열', () => {
    expect(suspiciousFieldNames(undefined, hasQuote)).toEqual([]);
    expect(suspiciousFieldNames(null, hasQuote)).toEqual([]);
    expect(suspiciousFieldNames('str', hasQuote)).toEqual([]);
  });

  it('반환값에는 어떤 원본 값도 포함되지 않는다', () => {
    const body = { password: "p';DROP--", note: "n'--" };
    const names = suspiciousFieldNames(body, hasQuote);
    const dumped = JSON.stringify(names);
    expect(dumped).not.toContain('DROP');
    expect(dumped).not.toContain("p'");
    expect(names.sort()).toEqual(['note', 'password']);
  });
});
