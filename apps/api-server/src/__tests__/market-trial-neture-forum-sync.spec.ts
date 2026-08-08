/**
 * Market Trial → Neture Forum Sync Recovery
 *
 * WO-O4O-MARKET-TRIAL-NETURE-FORUM-SYNC-RECOVERY-V1
 *
 * 검증 대상 — 종전 결함과 복구 계약:
 *   B-6  포럼을 찾지 못하면 **무음 skip 하지 않는다** (종전 결함: 조용히 빠져나가 흔적 없음)
 *   B-4  같은 trial 을 중복 게시하지 않는다 (멱등)
 *   B-5  성공 시 market_trial_forums 에 매핑을 기록한다
 *   B-7  실패는 market_trial_forum_sync_failures 에 기록한다
 *   B-9  성공 이후 미해결 실패 기록을 정리한다
 *   A-4  포럼 해석은 slug + service_code='neture' + status='completed' (고정 UUID 아님)
 *
 * DB 미사용 — DataSource.query 와 repository 를 스텁해 컨트롤러가 실제로 발행하는
 * SQL/파라미터와 저장 호출을 관찰한다.
 */

import { MarketTrialOperatorController } from '../controllers/market-trial/marketTrialOperatorController.js';

const TRIAL_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const OPERATOR_ID = '11111111-1111-1111-1111-111111111111';
const FORUM_ID = 'add9971a-2141-470e-9111-8bb4b2bb2db9';
const POST_ID = 'ffffffff-0000-1111-2222-333333333333';

interface QueryCall { sql: string; params: any[]; }

interface HarnessOpts {
  /** forum_category_requests 조회 결과. [] 이면 대상 포럼 없음 */
  forumRows?: any[];
  /** 기존 market_trial_forums 매핑 (있으면 중복) */
  existingMapping?: { forumId: string } | null;
  /** trial.status */
  status?: string;
}

function buildHarness(opts: HarnessOpts = {}) {
  const {
    forumRows = [{ id: FORUM_ID }],
    existingMapping = null,
    status = 'recruiting',
  } = opts;

  const calls: QueryCall[] = [];
  const savedMappings: any[] = [];
  const savedFailures: any[] = [];
  const resolveUpdates: any[] = [];

  const trial = { id: TRIAL_ID, title: 'T', description: 'D', supplierName: 'S', status };

  const dataSource: any = {
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      if (/forum_category_requests/i.test(sql)) return forumRows;
      if (/INSERT\s+INTO\s+forum_post/i.test(sql)) return [{ id: POST_ID }];
      return [];
    },
    getRepository: (entity: any) => {
      const name = entity?.name ?? String(entity);
      if (name === 'MarketTrial') {
        return { findOne: async () => trial, save: async (x: any) => x };
      }
      if (name === 'MarketTrialForum') {
        return {
          findOne: async () => existingMapping,
          create: (x: any) => x,
          save: async (x: any) => { savedMappings.push(x); return x; },
        };
      }
      // MarketTrialForumSyncFailure
      return {
        create: (x: any) => x,
        save: async (x: any) => { savedFailures.push(x); return x; },
        createQueryBuilder: () => {
          const qb: any = {
            update: () => qb,
            set: (v: any) => { resolveUpdates.push(v); return qb; },
            where: () => qb,
            execute: async () => ({ affected: 1 }),
          };
          return qb;
        },
      };
    },
  };

  MarketTrialOperatorController.setDataSource(dataSource);

  return { calls, savedMappings, savedFailures, resolveUpdates };
}

function fakeReqRes(trialId = TRIAL_ID) {
  const req: any = { params: { id: trialId }, user: { id: OPERATOR_ID }, query: {}, body: {} };
  const res: any = {
    statusCode: 200,
    payload: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.payload = body; return this; },
  };
  return { req, res };
}

describe('WO-O4O-MARKET-TRIAL-NETURE-FORUM-SYNC-RECOVERY-V1', () => {
  it('B-6: 대상 포럼이 없으면 무음 skip 하지 않고 category_check 실패를 기록한다', async () => {
    const h = buildHarness({ forumRows: [] });
    const { req, res } = fakeReqRes();

    await MarketTrialOperatorController.retryForumSync(req, res);

    // 종전 결함: 아무 기록 없이 통과했다. 이제는 반드시 남는다.
    expect(h.savedFailures).toHaveLength(1);
    expect(h.savedFailures[0].stage).toBe('category_check');
    expect(h.savedFailures[0].severity).toBe('critical');
    expect(h.savedFailures[0].trialId).toBe(TRIAL_ID);
    // 게시글도 매핑도 만들어지지 않는다
    expect(h.savedMappings).toHaveLength(0);
    expect(h.calls.some((c) => /INSERT\s+INTO\s+forum_post/i.test(c.sql))).toBe(false);
    // 운영자에게 실패를 알린다
    expect(res.statusCode).toBe(502);
    expect(res.payload.success).toBe(false);
  });

  it('A-4: 포럼을 고정 UUID 가 아니라 slug + service_code + completed 로 해석한다', async () => {
    const h = buildHarness();
    const { req, res } = fakeReqRes();

    await MarketTrialOperatorController.retryForumSync(req, res);

    const lookup = h.calls.find((c) => /forum_category_requests/i.test(c.sql));
    expect(lookup).toBeDefined();
    expect(lookup!.sql).toMatch(/slug\s*=\s*\$1/);
    expect(lookup!.sql).toMatch(/service_code\s*=\s*\$2/);
    expect(lookup!.sql).toMatch(/status\s*=\s*'completed'/);
    expect(lookup!.params[1]).toBe('neture');
    // 제거된 고정 UUID 가 다시 들어오지 않았는지 확인
    expect(JSON.stringify(h.calls)).not.toContain('f0000000-0a00-4000-f000-0000000000f1');
  });

  it('B-5/B-9: 성공하면 매핑을 저장하고 미해결 실패 기록을 해소한다', async () => {
    const h = buildHarness();
    const { req, res } = fakeReqRes();

    await MarketTrialOperatorController.retryForumSync(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.status).toBe('created');
    expect(res.payload.data.forumPostId).toBe(POST_ID);
    expect(h.savedMappings).toHaveLength(1);
    expect(h.savedMappings[0]).toMatchObject({ marketTrialId: TRIAL_ID, forumId: POST_ID });
    expect(h.savedFailures).toHaveLength(0);
    // 성공 후 실패 기록 해소
    expect(h.resolveUpdates).toHaveLength(1);
    expect(h.resolveUpdates[0].resolvedAt).toBeInstanceOf(Date);
  });

  it('B-2: 게시글은 해석된 forum_id 와 승인 운영자 author_id 로 만들어진다', async () => {
    const h = buildHarness();
    const { req, res } = fakeReqRes();

    await MarketTrialOperatorController.retryForumSync(req, res);

    const insert = h.calls.find((c) => /INSERT\s+INTO\s+forum_post/i.test(c.sql));
    expect(insert).toBeDefined();
    expect(insert!.params[4]).toBe(FORUM_ID);      // forum_id
    expect(insert!.params[5]).toBe(OPERATOR_ID);   // author_id (종전에는 NULL 이었다)
  });

  it('B-4/B-8: 이미 매핑이 있으면 재게시하지 않는다 (멱등)', async () => {
    const h = buildHarness({ existingMapping: { forumId: POST_ID } });
    const { req, res } = fakeReqRes();

    await MarketTrialOperatorController.retryForumSync(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.status).toBe('already_linked');
    expect(h.calls.some((c) => /INSERT\s+INTO\s+forum_post/i.test(c.sql))).toBe(false);
    expect(h.savedMappings).toHaveLength(0);
    expect(h.savedFailures).toHaveLength(0);
  });

  it('C-4: 승인 전 trial 은 공고를 만들지 않는다', async () => {
    const h = buildHarness({ status: 'submitted' });
    const { req, res } = fakeReqRes();

    await MarketTrialOperatorController.retryForumSync(req, res);

    expect(res.statusCode).toBe(400);
    expect(h.calls.some((c) => /INSERT\s+INTO\s+forum_post/i.test(c.sql))).toBe(false);
    expect(h.savedFailures).toHaveLength(0);
  });
});
