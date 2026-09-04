/**
 * ProductLanding on-create coverage — ensureProductLandingForMaster / ensureProductLandingsForMasters
 *
 * WO-O4O-PRODUCT-LANDING-FULL-BACKFILL-AND-ON-CREATE-COVERAGE-CLOSURE-V1
 * Baseline: O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT (불변식 #7 — master 당 Landing 1개)
 *
 * 검증:
 *  - 신규 master → Landing 1개 발급(public_key 존재)
 *  - 기존 Landing 보유 master → 재호출해도 신규 row 0, 기존 Landing 유지
 *  - master 생성 실패(= master row 없음) → orphan Landing 0 (INSERT 미실행)
 *  - 발급 실패 → 호출자에게 throw 하지 않음(best-effort), reconcile 대상으로 남김
 * DB 비의존 — dataSource.query 를 SQL 분기로 목킹.
 */

import type { DataSource } from 'typeorm';
import {
  ensureProductLandingForMaster,
  ensureProductLandingsForMasters,
  reconcileMissingProductLandings,
} from '../product-landing.service.js';

interface FakeState {
  masters: string[];
  landings: Array<{ id: string; product_master_id: string; public_key: string }>;
  inserts: number;
  failInsert?: boolean;
}

/** master/landing 을 메모리로 흉내내는 목 DataSource. */
function fakeDataSource(state: FakeState): DataSource {
  return {
    query: async (sql: string, params?: any[]) => {
      // reconcile: Landing 없는 master 목록 (NOT EXISTS 조건이 먼저 분기돼야 한다)
      if (sql.includes('FROM product_masters') && sql.includes('NOT EXISTS')) {
        const limit = Number(params?.[0] ?? 0);
        return state.masters
          .filter((id) => !state.landings.some((l) => l.product_master_id === id))
          .slice(0, limit)
          .map((id) => ({ id }));
      }
      if (sql.includes('FROM product_masters')) {
        const id = params?.[0];
        return state.masters.includes(id) ? [{ id }] : [];
      }
      if (sql.startsWith('SELECT * FROM product_landings')) {
        const masterId = params?.[0];
        return state.landings.filter((l) => l.product_master_id === masterId);
      }
      if (sql.includes('INSERT INTO product_landings')) {
        if (state.failInsert) throw new Error('insert failed');
        const [masterId, publicKey] = params as [string, string];
        const row = {
          id: `landing-${state.landings.length + 1}`,
          product_master_id: masterId,
          public_key: publicKey,
          status: 'active',
          exposure_state: 'ok',
          created_at: '2026-09-04T00:00:00Z',
          updated_at: '2026-09-04T00:00:00Z',
        };
        state.landings.push(row);
        state.inserts++;
        return [row];
      }
      return [];
    },
  } as unknown as DataSource;
}

describe('ensureProductLandingForMaster — on-create coverage', () => {
  it('신규 runtime master: Landing 1개 생성 + public_key 존재', async () => {
    const state: FakeState = { masters: ['master-1'], landings: [], inserts: 0 };
    const created = await ensureProductLandingForMaster(fakeDataSource(state), 'master-1', 'master-create-manual');

    expect(created).toBe(true);
    expect(state.landings).toHaveLength(1);
    expect(state.landings[0].product_master_id).toBe('master-1');
    expect(state.landings[0].public_key).toHaveLength(12);
  });

  it('공급자 신규 제품(barcode 없는 master 포함): 같은 경로로 Landing 자동 생성', async () => {
    const state: FakeState = { masters: ['supplier-master-1'], landings: [], inserts: 0 };
    const created = await ensureProductLandingForMaster(
      fakeDataSource(state),
      'supplier-master-1',
      'master-create-barcodeless',
    );

    expect(created).toBe(true);
    expect(state.inserts).toBe(1);
  });

  it('기존 master(Landing 보유): 재호출해도 신규 row 0 · 기존 Landing 유지 (멱등)', async () => {
    const state: FakeState = {
      masters: ['master-1'],
      landings: [{ id: 'landing-existing', product_master_id: 'master-1', public_key: 'abcd2345wxyz' }],
      inserts: 0,
    };
    const ds = fakeDataSource(state);

    const first = await ensureProductLandingForMaster(ds, 'master-1');
    const second = await ensureProductLandingForMaster(ds, 'master-1');

    expect(first).toBe(false);
    expect(second).toBe(false);
    expect(state.inserts).toBe(0);
    expect(state.landings).toHaveLength(1);
    expect(state.landings[0].id).toBe('landing-existing');
    expect(state.landings[0].public_key).toBe('abcd2345wxyz');
  });

  it('재시도: 같은 master 를 연속 호출해도 Landing 은 1개', async () => {
    const state: FakeState = { masters: ['master-1'], landings: [], inserts: 0 };
    const ds = fakeDataSource(state);

    await ensureProductLandingForMaster(ds, 'master-1');
    await ensureProductLandingForMaster(ds, 'master-1');
    await ensureProductLandingForMaster(ds, 'master-1');

    expect(state.inserts).toBe(1);
    expect(state.landings).toHaveLength(1);
  });

  it('master 생성 실패(master row 없음): orphan Landing 0 · throw 없음', async () => {
    const state: FakeState = { masters: [], landings: [], inserts: 0 };
    const created = await ensureProductLandingForMaster(fakeDataSource(state), 'rolled-back-master');

    expect(created).toBe(false);
    expect(state.inserts).toBe(0);
    expect(state.landings).toHaveLength(0);
  });

  it('발급 실패: 호출자 흐름을 막지 않는다(best-effort) — reconcile 대상으로 남김', async () => {
    const state: FakeState = { masters: ['master-1'], landings: [], inserts: 0, failInsert: true };
    await expect(ensureProductLandingForMaster(fakeDataSource(state), 'master-1')).resolves.toBe(false);
    expect(state.landings).toHaveLength(0);
  });
});

describe('ensureProductLandingsForMasters — 대량 import 커밋 후', () => {
  it('여러 master 를 한 번에 보장하고 중복 id 는 1회만 처리', async () => {
    const state: FakeState = { masters: ['m1', 'm2', 'm3'], landings: [], inserts: 0 };
    const result = await ensureProductLandingsForMasters(fakeDataSource(state), ['m1', 'm2', 'm2', 'm3'], 'csv-import');

    expect(result.created).toBe(3);
    expect(result.skipped).toBe(0);
    expect(state.inserts).toBe(3);
  });

  it('한 건 실패가 나머지를 막지 않는다', async () => {
    const state: FakeState = { masters: ['m1', 'm3'], landings: [], inserts: 0 }; // m2 는 master 없음
    const result = await ensureProductLandingsForMasters(fakeDataSource(state), ['m1', 'm2', 'm3'], 'csv-import');

    expect(result.created).toBe(2);
    expect(result.skipped).toBe(1);
    expect(state.landings.map((l) => l.product_master_id)).toEqual(['m1', 'm3']);
  });
});

describe('reconcileMissingProductLandings — 대량 생성 작업 종료 후', () => {
  it('누락 master 만 발급하고 이미 있는 master 는 건드리지 않는다', async () => {
    const state: FakeState = {
      masters: ['m1', 'm2', 'm3'],
      landings: [{ id: 'landing-existing', product_master_id: 'm2', public_key: 'abcd2345wxyz' }],
      inserts: 0,
    };
    const result = await reconcileMissingProductLandings(fakeDataSource(state), { source: 'drug-seed-promotion' });

    expect(result.scanned).toBe(2); // m1, m3
    expect(result.created).toBe(2);
    expect(result.remainingLikely).toBe(false);
    expect(state.landings).toHaveLength(3);
    expect(state.landings.find((l) => l.product_master_id === 'm2')!.public_key).toBe('abcd2345wxyz');
  });

  it('누락 0 이면 write 0 (멱등 재실행)', async () => {
    const state: FakeState = {
      masters: ['m1'],
      landings: [{ id: 'landing-1', product_master_id: 'm1', public_key: 'abcd2345wxyz' }],
      inserts: 0,
    };
    const result = await reconcileMissingProductLandings(fakeDataSource(state));

    expect(result.scanned).toBe(0);
    expect(result.created).toBe(0);
    expect(state.inserts).toBe(0);
  });

  it('limit 도달 시 remainingLikely=true (나머지는 bulk-apply 스크립트로)', async () => {
    const state: FakeState = { masters: ['m1', 'm2', 'm3'], landings: [], inserts: 0 };
    const result = await reconcileMissingProductLandings(fakeDataSource(state), { limit: 2 });

    expect(result.scanned).toBe(2);
    expect(result.created).toBe(2);
    expect(result.remainingLikely).toBe(true);
  });
});
