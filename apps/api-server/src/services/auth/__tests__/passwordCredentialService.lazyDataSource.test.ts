/**
 * `passwordCredentialService` — **주입된 manager 가 있으면 기본 DataSource 를 로드하지 않는다**
 *
 * WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 테스트가 있나
 *
 *   이 모듈이 `database/connection.js` 를 **최상단에서** import 하던 동안에는, 모듈을 불러오는
 *   것만으로 전체 entity 가 로드됐다. 그래서 entity 를 싣지 않는 CLI(Demo 계정 구축)가
 *   tsx(esbuild — `emitDecoratorMetadata` 미지원) 에서 `ColumnTypeUndefinedError` 로 죽었다.
 *   해시 정책을 CLI 에 복제하지 않고 공용 서비스를 그대로 쓰려면 이 결합이 없어야 한다.
 *
 *   되돌려 최상단 import 로 바꾸면 **이 파일이 실패한다** — 그게 이 테스트의 목적이다.
 *   인증 정책(cost · 72바이트 · 해시 형식)은 `passwordCredentialService.test.ts` 가 계속 본다.
 */
import { passwordCredentialService } from '../password-credential.service.js';

/** 모듈 레지스트리에 특정 경로가 올라와 있는지 — require.cache 는 CJS 변환 후 키를 쓴다. */
function isConnectionModuleLoaded(): boolean {
  return Object.keys(require.cache).some((k) => k.replace(/\\/g, '/').includes('/database/connection'));
}

describe('manager 주입 시 기본 DataSource 를 끌어오지 않는다', () => {
  it('서비스 모듈을 import 한 것만으로는 connection 모듈이 로드되지 않는다', () => {
    // 이 spec 파일은 connection 을 직접 import 하지 않는다. 서비스가 최상단에서 끌어오면 여기서 걸린다.
    expect(isConnectionModuleLoaded()).toBe(false);
  });

  it('hasPassword(manager) 는 주입된 manager 로만 질의한다', async () => {
    const calls: string[] = [];
    const manager = {
      query: async (q: string) => {
        calls.push(q);
        return [{ '?column?': 1 }];
      },
    };

    const has = await passwordCredentialService.hasPassword('u-1', manager as never);

    expect(has).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('user_password_credentials');
    expect(isConnectionModuleLoaded()).toBe(false);
  });

  it('setPassword(manager) 도 주입된 manager 로만 쓴다 — 해시만 전달된다', async () => {
    const seen: Array<{ q: string; p: unknown[] }> = [];
    const manager = {
      query: async (q: string, p: unknown[] = []) => {
        seen.push({ q, p });
        return [];
      },
    };

    await passwordCredentialService.setPassword('u-2', 'Abcd1234!', manager as never);

    expect(seen).toHaveLength(1);
    expect(seen[0].q).toContain('INSERT INTO user_password_credentials');
    const stored = String(seen[0].p[1]);
    // 원문이 아니라 bcrypt 해시가 저장된다(정책 자체는 기존 spec 이 본다).
    expect(stored).not.toBe('Abcd1234!');
    expect(stored.startsWith('$2')).toBe(true);
    expect(isConnectionModuleLoaded()).toBe(false);
  });

  it('manager 를 주지 않으면 기본 경로로 간다 — 조용히 통과하지 않는다', async () => {
    // 기본 경로는 실제 DB 를 요구하므로 테스트 환경에서는 실패하는 것이 정상이다.
    // 고정하는 것은 "manager 가 없으면 **기본 연결을 쓰려 한다**"는 사실이다 —
    // manager 없음을 no-op 으로 삼키면 호출부가 저장됐다고 착각한다.
    //
    // `require.cache` 로 로드 여부를 단언하지 않는다: 모듈 초기화가 실패하면 레지스트리에
    // 남지 않아, 그 단언은 구현이 아니라 테스트 환경을 재는 것이 된다.
    await expect(passwordCredentialService.hasPassword('u-3')).rejects.toBeDefined();
  });
});
