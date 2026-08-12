/**
 * WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1
 *
 * KPA 마이페이지 프로필 수정(`PUT /kpa/mypage/profile`)의 `businessInfo` write 를 고정한다.
 *
 * 회귀 대상:
 *   W-5  workplace 저장이 businessInfo 를 통째로 읽어 되썼다.
 *        같은 `metadata` 객체에 KPA 운영자 경로가 `pharmacy_phone` 을 쓰므로,
 *        이 경로가 저장하는 순간 그 사이 갱신된 pharmacy_phone 이 옛 값으로 덮일 수 있었다.
 *   W-6  scalar 컬럼 update 와 businessInfo write 가 transaction 없이 순차 실행됐다.
 *
 * 판정 계약:
 *   - workplace 는 `metadata` 중첩 부분 갱신으로만 나간다 (형제 키 미포함).
 *   - scalar update 와 businessInfo write 는 하나의 transaction 안에서 나간다.
 *   - university → kpa_members 는 기존 계약대로 best-effort (transaction 밖).
 */

import { MypageService } from '../mypage.service.js';

const USER_ID = '22222222-3333-4444-8555-666666666666';

type Call = { sql: string; params: any[]; scope: 'tx' | 'global' };

function makeDataSource(options: { failOnUserUpdate?: boolean } = {}) {
  const calls: Call[] = [];
  const updates: Array<{ repo: string; id: any; data: any; scope: 'tx' | 'global' }> = [];
  const state = { txStarted: 0, txCommitted: 0, txRolledBack: 0 };

  const repo = (name: string, scope: 'tx' | 'global') => ({
    findOne: async () => (name === 'KpaMember' ? { id: 'km-1', user_id: USER_ID } : { id: USER_ID }),
    update: async (id: any, data: any) => {
      updates.push({ repo: name, id, data, scope });
      if (options.failOnUserUpdate && name === 'User') throw new Error('INJECTED_FAILURE');
      return { affected: 1 };
    },
  });

  const dataSource: any = {
    getRepository: (name: any) => repo(String(name), 'global'),
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params, scope: 'global' });
      return [];
    },
    transaction: async (cb: any) => {
      state.txStarted += 1;
      try {
        const out = await cb({
          getRepository: (name: any) => repo(String(name), 'tx'),
          query: async (sql: string, params: any[] = []) => {
            calls.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params, scope: 'tx' });
            return [];
          },
        });
        state.txCommitted += 1;
        return out;
      } catch (e) {
        state.txRolledBack += 1;
        throw e;
      }
    },
  };

  return { dataSource, calls, updates, state };
}

const bizWrite = (calls: Call[]) => {
  const call = calls.find((c) => /^UPDATE users\s+SET "businessInfo"/i.test(c.sql));
  if (!call) return null;
  return {
    scope: call.scope,
    sql: call.sql,
    payloads: call.params
      .filter((p) => typeof p === 'string' && p.startsWith('{'))
      .map((p) => JSON.parse(p as string)),
  };
};

const currentUser = { lastName: '홍', firstName: '길동' };

describe('MypageService.updateProfile — businessInfo 부분 갱신', () => {
  it('W-5 회귀: workplace 는 metadata 중첩 부분 갱신으로만 나간다', async () => {
    const h = makeDataSource();
    await new MypageService(h.dataSource).updateProfile(USER_ID, { workplace: '서울약국' }, currentUser);

    const w = bizWrite(h.calls)!;
    expect(w.sql).toContain('jsonb_set');
    expect(w.sql).toContain("'{metadata}'");
    expect(w.sql).toContain(`"businessInfo"::jsonb -> 'metadata'`);
    // 형제 키(pharmacy_phone)를 payload 에 담지 않는다 = DB 값 그대로 보존
    expect(w.payloads).toEqual([{ workplace: '서울약국' }]);
  });

  it('W-5 회귀: businessInfo 를 통째로 읽어 되쓰지 않는다', async () => {
    const h = makeDataSource();
    await new MypageService(h.dataSource).updateProfile(USER_ID, { workplace: '서울약국' }, currentUser);

    // ORM update 로 businessInfo 컬럼 전체를 넘기던 경로가 사라졌다
    const userUpdates = h.updates.filter((u) => u.repo === 'User');
    for (const u of userUpdates) {
      expect(u.data).not.toHaveProperty('businessInfo');
    }
  });

  it('빈 workplace 는 기존 계약대로 null 로 저장한다', async () => {
    const h = makeDataSource();
    await new MypageService(h.dataSource).updateProfile(USER_ID, { workplace: '' }, currentUser);

    expect(bizWrite(h.calls)!.payloads).toEqual([{ workplace: null }]);
  });

  it('W-6 회귀: scalar update 와 businessInfo write 가 한 transaction 안에서 나간다', async () => {
    const h = makeDataSource();
    await new MypageService(h.dataSource).updateProfile(
      USER_ID, { nickname: '길동', workplace: '서울약국' }, currentUser,
    );

    expect(h.state.txCommitted).toBe(1);
    expect(bizWrite(h.calls)!.scope).toBe('tx');
    expect(h.updates.find((u) => u.repo === 'User')!.scope).toBe('tx');
  });

  it('write 실패 주입: transaction 이 commit 되지 않는다 (부분 성공 없음)', async () => {
    const h = makeDataSource({ failOnUserUpdate: true });

    await expect(
      new MypageService(h.dataSource).updateProfile(
        USER_ID, { nickname: '길동', workplace: '서울약국' }, currentUser,
      ),
    ).rejects.toThrow('INJECTED_FAILURE');

    expect(h.state.txCommitted).toBe(0);
    expect(h.state.txRolledBack).toBe(1);
    // rollback 대상이 아닌(=transaction 밖) users write 가 없어야 부분 성공이 남지 않는다
    expect(h.updates.filter((u) => u.repo === 'User' && u.scope === 'global')).toEqual([]);
    expect(h.calls.filter((c) => c.scope === 'global' && /^UPDATE users/i.test(c.sql))).toEqual([]);
  });

  it('workplace 가 없으면 businessInfo write 자체가 없다', async () => {
    const h = makeDataSource();
    await new MypageService(h.dataSource).updateProfile(USER_ID, { nickname: '길동' }, currentUser);

    expect(bizWrite(h.calls)).toBeNull();
  });

  it('university → kpa_members 는 기존 계약대로 transaction 밖 best-effort 다', async () => {
    const h = makeDataSource();
    await new MypageService(h.dataSource).updateProfile(
      USER_ID, { workplace: '서울약국', university: '서울대' }, currentUser,
    );

    const kmUpdate = h.updates.find((u) => u.repo === 'KpaMember')!;
    expect(kmUpdate.scope).toBe('global');
    expect(kmUpdate.data).toEqual({ university_name: '서울대' });
  });
});
