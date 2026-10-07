/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2 — 평문이 DB 에 가지 않는다는 보장
 *
 * `chk_upc_hash_len` 은 해시 길이 하한 검사일 뿐이다. 실제 보장은 저장 경로다:
 *  H1 setPassword 가 DB 에 보내는 값은 원문이 아니고 bcrypt(`$2`) 형식 · cost 12
 *  H2 저장된 값으로 원문 compare 는 true, 다른 값은 false (대소문자·공백을 변형하지 않는다)
 *  H3 수단이 없으면 false 이고, 그 경우에도 compare 를 한 번 수행한다(시간 차이 억제)
 *  H4 같은 원문도 매번 다른 해시(salt)
 *  H5 · H6 UTF-8 72바이트 초과 원문은 저장 거절 · 검증 불일치 (bcrypt 가 잘라 보는 부분으로 인증하지 않는다)
 */
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../../database/connection.js';
import { passwordCredentialService, PASSWORD_HASH_COST, PasswordTooLongError } from '../password-credential.service.js';

const PLAIN = 'Abcd1234! ';

describe('passwordCredentialService — 저장 경로', () => {
  const hashes = new Map<string, string>();
  let calls: Array<{ q: string; p: unknown[] }>;

  beforeEach(() => {
    hashes.clear();
    calls = [];
    jest.spyOn(AppDataSource, 'query').mockImplementation((async (q: string, p: any[] = []) => {
      calls.push({ q, p });
      if (q.includes('INSERT INTO user_password_credentials')) {
        hashes.set(p[0], p[1]);
        return [];
      }
      if (q.includes('SELECT password_hash')) {
        return hashes.has(p[0]) ? [{ password_hash: hashes.get(p[0]) }] : [];
      }
      if (q.includes('SELECT 1 FROM user_password_credentials')) {
        return hashes.has(p[0]) ? [{}] : [];
      }
      throw new Error(`unexpected SQL: ${q}`);
    }) as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('H1 DB 로 가는 값은 원문이 아니라 bcrypt 해시 · cost 12 · algo=bcrypt', async () => {
    await passwordCredentialService.setPassword('u1', PLAIN);
    const insert = calls.find((c) => c.q.includes('INSERT'))!;
    expect(JSON.stringify(insert.p)).not.toContain(PLAIN.trim());
    const stored = insert.p[1] as string;
    expect(stored).toMatch(/^\$2[aby]\$12\$/);
    expect(stored.length).toBeGreaterThanOrEqual(59);
    expect(bcrypt.getRounds(stored)).toBe(PASSWORD_HASH_COST);
    expect(insert.p[2]).toBe('bcrypt');
    expect(await passwordCredentialService.hasPassword('u1')).toBe(true);
  });

  it('H2 원문 compare 는 true, 변형된 값은 false', async () => {
    await passwordCredentialService.setPassword('u1', PLAIN);
    expect(await passwordCredentialService.verifyPassword('u1', PLAIN)).toBe(true);
    expect(await passwordCredentialService.verifyPassword('u1', PLAIN.trim())).toBe(false);
    expect(await passwordCredentialService.verifyPassword('u1', PLAIN.toLowerCase())).toBe(false);
  });

  it('H3 수단 없음 · 사용자 없음은 false 이고 compare 를 한 번 수행한다', async () => {
    const spy = jest.spyOn(bcrypt, 'compare');
    expect(await passwordCredentialService.verifyPassword('nobody', PLAIN)).toBe(false);
    expect(await passwordCredentialService.verifyPassword(null, PLAIN)).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(await passwordCredentialService.hasPassword('nobody')).toBe(false);
  });

  it('H5 72바이트 초과 원문은 저장하지 않는다 — ASCII 73 · 한글 경계', async () => {
    const at72 = 'a1!' + 'x'.repeat(69);
    await expect(passwordCredentialService.setPassword('u1', at72)).resolves.toBeUndefined();
    await expect(passwordCredentialService.setPassword('u2', at72 + 'x')).rejects.toBeInstanceOf(PasswordTooLongError);
    await expect(passwordCredentialService.setPassword('u3', 'a1!' + '가'.repeat(24))).rejects.toBeInstanceOf(PasswordTooLongError);
    expect(hashes.has('u2')).toBe(false);
    expect(hashes.has('u3')).toBe(false);
  });

  it('H6 앞 72바이트가 같고 끝만 다른 원문은 인증되지 않는다 (bcrypt 절단 비의존)', async () => {
    const at72 = 'a1!' + 'x'.repeat(69);
    await passwordCredentialService.setPassword('u1', at72);
    // bcrypt 자체는 73바이트째 이후를 무시한다 — 이 사실이 상한이 필요한 이유다.
    expect(await bcrypt.compare(at72 + 'tail', hashes.get('u1')!)).toBe(true);
    const spy = jest.spyOn(bcrypt, 'compare');
    expect(await passwordCredentialService.verifyPassword('u1', at72)).toBe(true);
    expect(await passwordCredentialService.verifyPassword('u1', at72 + 'tail')).toBe(false);
    expect(await passwordCredentialService.verifyPassword('u1', at72 + '가')).toBe(false);
    // 초과 입력도 같은 비용의 compare 를 한 번 수행한다(분기 비용 동일).
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('H4 같은 원문도 매번 다른 해시', async () => {
    await passwordCredentialService.setPassword('u1', PLAIN);
    await passwordCredentialService.setPassword('u2', PLAIN);
    expect(hashes.get('u1')).not.toBe(hashes.get('u2'));
  });
});
