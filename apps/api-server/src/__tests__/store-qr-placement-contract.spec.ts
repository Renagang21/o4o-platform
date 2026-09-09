/**
 * WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §18
 *
 * QR Placement 계약을 회귀 고정한다.
 *
 *   §6  lifecycle — 시작 / 이동 / 종료 / 다중 배치 / QR 비활성 후 이력 보존
 *   §7  경계     — 타 조직·타 QR 조작 차단
 *   §8  clone    — 같은 target 복제 · slug 신규성 · screen_set 금지
 *   §12 귀속     — 구간 조인 · UNPLACED · AMBIGUOUS
 *   §14 대표값   — 활성 0/1/2+ → null / 값 / MULTIPLE
 *
 * DB 는 붙이지 않는다 — DataSource.query 를 SQL 조각으로 분기하는 stub 으로 대체한다.
 */
import {
  QR_PLACEMENT_PRESETS,
  PRIMARY_PLACEMENT_MULTIPLE,
  syncPrimaryPlacement,
  listQrPlacements,
  startQrPlacement,
  endQrPlacement,
  updateQrPlacement,
  getQrPlacementScanBreakdown,
  getOrganizationPlacementAnalytics,
} from '../services/store/store-qr-placement.service.js';

const ORG = '9c87f46b-57a1-4afe-80bd-60782c49ce96';
const OTHER_ORG = 'e3d14288-5de5-4fe9-8326-044b36bb741d';
const QR = '16c33e61-20b8-4027-9a64-5c122d271a17';
const PLACEMENT_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

/**
 * stub — SQL 조각으로 분기한다.
 * `owned=false` 면 소유 확인 쿼리가 0행을 준다(= 타 조직/타 QR).
 */
function makeDs(opts: {
  owned?: boolean;
  activeRows?: Array<{ placement: string }>;
  listRows?: any[];
  returning?: any[];
  breakdown?: any[];
}) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  const ds: any = {
    calls,
    query: jest.fn(async (sql: string, params: any[] = []) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (sql.includes('FROM store_qr_codes WHERE id')) return opts.owned === false ? [] : [{ '?column?': 1 }];
      if (sql.includes("status = 'active'") && sql.includes('LIMIT 2')) return opts.activeRows ?? [];
      if (sql.startsWith('\n    UPDATE store_qr_codes SET primary_placement') || sql.includes('SET primary_placement')) return [];
      if (sql.includes('INSERT INTO store_qr_placements')) return opts.returning ?? [{ id: PLACEMENT_ID }];
      if (sql.includes('UPDATE store_qr_placements')) return opts.returning ?? [{ id: PLACEMENT_ID }];
      if (sql.includes('WITH matched AS')) return opts.breakdown ?? [];
      if (sql.includes('FROM store_qr_placements')) return opts.listRows ?? [];
      return [];
    }),
  };
  return ds;
}
const sqlOf = (ds: any) => ds.calls.map((c: any) => c.sql);

// ─────────────────────────────────────────────────────────────────────────────
// §14 대표값
// ─────────────────────────────────────────────────────────────────────────────

describe('§14 primary_placement 계산 — 잘못된 단일값을 만들지 않는다', () => {
  it('활성 0개 → null', async () => {
    const ds = makeDs({ activeRows: [] });
    await expect(syncPrimaryPlacement(ds, ORG, QR)).resolves.toBeNull();
  });

  it('활성 1개 → 그 값', async () => {
    const ds = makeDs({ activeRows: [{ placement: 'SHELF' }] });
    await expect(syncPrimaryPlacement(ds, ORG, QR)).resolves.toBe('SHELF');
  });

  it('활성 2개 이상 → MULTIPLE (임의로 하나를 고르지 않는다)', async () => {
    const ds = makeDs({ activeRows: [{ placement: 'SHELF' }, { placement: 'POP' }] });
    await expect(syncPrimaryPlacement(ds, ORG, QR)).resolves.toBe(PRIMARY_PLACEMENT_MULTIPLE);
  });

  it('대표값 갱신은 조직 경계를 함께 건다', async () => {
    const ds = makeDs({ activeRows: [] });
    await syncPrimaryPlacement(ds, ORG, QR);
    const upd = ds.calls.find((c: any) => c.sql.includes('SET primary_placement'));
    expect(upd.sql).toContain('organization_id = $3');
    expect(upd.params).toEqual([null, QR, ORG]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6 lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe('§6 lifecycle — 시작 · 이동 · 종료', () => {
  it('배치 시작은 활성 행 1건을 만들고 대표값을 동기화한다', async () => {
    const ds = makeDs({ activeRows: [{ placement: 'SHELF' }] });
    const r = await startQrPlacement(ds, ORG, QR, { placement: 'SHELF', label: '혈당관리 매대' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.primaryPlacement).toBe('SHELF');
    const ins = ds.calls.find((c: any) => c.sql.includes('INSERT INTO store_qr_placements'));
    expect(ins.params[0]).toBe(ORG);
    expect(ins.params[2]).toBe('SHELF');
    expect(ins.params[3]).toBe('혈당관리 매대');
  });

  it('endOthers=true(이동)는 기존 활성을 먼저 종료한다 — 이력은 남는다', async () => {
    const ds = makeDs({ activeRows: [{ placement: 'POP' }] });
    await startQrPlacement(ds, ORG, QR, { placement: 'POP', endOthers: true });
    const sqls = sqlOf(ds);
    const endIdx = sqls.findIndex((s: string) => s.includes("SET status = 'ended'"));
    const insIdx = sqls.findIndex((s: string) => s.includes('INSERT INTO store_qr_placements'));
    expect(endIdx).toBeGreaterThan(-1);
    expect(insIdx).toBeGreaterThan(endIdx); // 종료 → 시작 순서
    // 행을 지우지 않는다.
    expect(sqls.some((s: string) => /DELETE\s+FROM\s+store_qr_placements/i.test(s))).toBe(false);
  });

  it('배치 종료는 QR 을 건드리지 않는다 (주소·인쇄물 보호)', async () => {
    const ds = makeDs({ activeRows: [] });
    const r = await endQrPlacement(ds, ORG, QR, PLACEMENT_ID);
    expect(r.ok).toBe(true);
    const sqls = sqlOf(ds);
    // store_qr_codes 에 대한 UPDATE 는 대표값 캐시 하나뿐이어야 한다.
    const qrUpdates = sqls.filter((s: string) => /UPDATE store_qr_codes/i.test(s));
    expect(qrUpdates).toHaveLength(1);
    expect(qrUpdates[0]).toContain('primary_placement');
    expect(qrUpdates[0]).not.toContain('is_active');
  });

  it('이미 종료된 배치를 다시 종료해도 ended_at 을 덮지 않는다', async () => {
    const ds = makeDs({ activeRows: [] });
    await endQrPlacement(ds, ORG, QR, PLACEMENT_ID);
    const upd = sqlOf(ds).find((s: string) => s.includes('UPDATE store_qr_placements'));
    expect(upd).toContain('ended_at = COALESCE(ended_at, now())');
  });

  it('사용처 코드를 정규화한다 (대문자·허용문자)', async () => {
    const ds = makeDs({ activeRows: [] });
    await startQrPlacement(ds, ORG, QR, { placement: ' shelf-a ' });
    const ins = ds.calls.find((c: any) => c.sql.includes('INSERT INTO store_qr_placements'));
    expect(ins.params[2]).toBe('SHELF_A');
  });

  it('preset 밖의 값도 저장한다 — 개방형 (DB CHECK 없음)', async () => {
    const ds = makeDs({ activeRows: [] });
    const r = await startQrPlacement(ds, ORG, QR, { placement: 'WINDOW_DISPLAY' });
    expect(r.ok).toBe(true);
    expect((QR_PLACEMENT_PRESETS as readonly string[]).includes('WINDOW_DISPLAY')).toBe(false);
  });

  it('사용처가 비면 400', async () => {
    const ds = makeDs({});
    const r = await startQrPlacement(ds, ORG, QR, { placement: '   ' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('PLACEMENT_REQUIRED');
  });

  it('QR 이 비활성이어도 배치 이력은 조회된다 (이력 보존)', async () => {
    const ds = makeDs({
      listRows: [
        { id: PLACEMENT_ID, status: 'ended', placement: 'SHELF' },
        { id: 'x', status: 'active', placement: 'POP' },
      ],
    });
    const r = await listQrPlacements(ds, ORG, QR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items).toHaveLength(2);
    expect(r.data.activeCount).toBe(1);
    // 소유 확인은 is_active 를 조건에 넣지 않는다 — 내린 QR 의 이력도 봐야 한다.
    const own = ds.calls.find((c: any) => c.sql.includes('FROM store_qr_codes WHERE id'));
    expect(own.sql).not.toContain('is_active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7 경계
// ─────────────────────────────────────────────────────────────────────────────

describe('§7 경계 — 타 조직·타 QR 조작 차단', () => {
  it.each([
    ['목록', (ds: any) => listQrPlacements(ds, OTHER_ORG, QR)],
    ['시작', (ds: any) => startQrPlacement(ds, OTHER_ORG, QR, { placement: 'SHELF' })],
    ['종료', (ds: any) => endQrPlacement(ds, OTHER_ORG, QR, PLACEMENT_ID)],
    ['수정', (ds: any) => updateQrPlacement(ds, OTHER_ORG, QR, PLACEMENT_ID, { label: 'x' })],
    ['통계', (ds: any) => getQrPlacementScanBreakdown(ds, OTHER_ORG, QR)],
  ])('%s: 소유하지 않은 QR 이면 404 이고 write 를 하지 않는다', async (_l, fn) => {
    const ds = makeDs({ owned: false });
    const r: any = await fn(ds);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('QR_NOT_FOUND');
    expect(sqlOf(ds).some((s: string) => /INSERT|UPDATE/i.test(s))).toBe(false);
  });

  it('소유 확인은 UUID 단독 조회가 아니라 조직 복합 조건이다 (Guard Rule 1)', async () => {
    const ds = makeDs({});
    await listQrPlacements(ds, ORG, QR);
    const own = ds.calls.find((c: any) => c.sql.includes('FROM store_qr_codes WHERE id'));
    expect(own.sql).toContain('organization_id = $2');
    expect(own.params).toEqual([QR, ORG]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §12 scan 귀속
// ─────────────────────────────────────────────────────────────────────────────

describe('§12 scan 귀속 — 구간 조인 · UNPLACED · AMBIGUOUS', () => {
  it('시간 구간으로 귀속한다 (스캔 이벤트 스키마 무변경)', async () => {
    const ds = makeDs({ breakdown: [] });
    await getQrPlacementScanBreakdown(ds, ORG, QR);
    const q = sqlOf(ds).find((s: string) => s.includes('WITH matched AS'));
    expect(q).toContain('e.created_at >= p.started_at');
    expect(q).toContain('p.ended_at IS NULL OR e.created_at < p.ended_at');
    // 이벤트 테이블에 쓰지 않는다.
    expect(sqlOf(ds).some((s: string) => /INSERT INTO store_qr_scan_events|UPDATE store_qr_scan_events/i.test(s))).toBe(false);
  });

  it('구간에 맞는 배치가 0개면 UNPLACED, 2개 이상이면 AMBIGUOUS 로 접는다', async () => {
    const ds = makeDs({});
    await getQrPlacementScanBreakdown(ds, ORG, QR);
    const q = sqlOf(ds).find((s: string) => s.includes('WITH matched AS'));
    expect(q).toContain("WHEN match_count = 0 THEN 'UNPLACED'");
    expect(q).toContain("WHEN match_count > 1 THEN 'AMBIGUOUS'");
  });

  it('조직 경계를 조인·필터 양쪽에 건다', async () => {
    const ds = makeDs({});
    await getQrPlacementScanBreakdown(ds, ORG, QR);
    const q = sqlOf(ds).find((s: string) => s.includes('WITH matched AS'));
    expect(q).toContain('p.organization_id = e.organization_id');
    expect(q).toContain('e.organization_id = $2');
  });

  it('집계 결과를 그대로 전달한다 (임의 배분 없음)', async () => {
    const rows = [
      { placement: 'SHELF', label: '혈당관리 매대', scans: 12 },
      { placement: 'AMBIGUOUS', label: null, scans: 3 },
      { placement: 'UNPLACED', label: null, scans: 5 },
    ];
    const ds = makeDs({ breakdown: rows });
    const r = await getQrPlacementScanBreakdown(ds, ORG, QR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toEqual(rows);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §13 매장 전체 분포 — 사용처 / 콘텐츠 출처 / 대상 3축
// ─────────────────────────────────────────────────────────────────────────────
describe('§13 조직 단위 스캔 분포', () => {
  it('세 축 모두 organization_id 를 필터로 건다 (Guard Rule 3)', async () => {
    const ds = makeDs({});
    await getOrganizationPlacementAnalytics(ds, ORG);
    const qs = sqlOf(ds);
    expect(qs.length).toBe(4);
    for (const q of qs) expect(q).toContain('e.organization_id = $1');
    // 대상/출처 축은 QR 조인에도 조직 경계를 건다 — UUID 단독 조인 금지(Guard Rule 1).
    const joined = qs.filter((q: string) => q.includes('JOIN store_qr_codes q'));
    expect(joined.length).toBe(2);
    for (const q of joined) expect(q).toContain('q.organization_id = e.organization_id');
  });

  it('기간은 SQL 문자열에 끼워 넣지 않고 바인딩한다 (Guard Rule 2)', async () => {
    const ds = makeDs({});
    await getOrganizationPlacementAnalytics(ds, ORG, { days: 30 });
    for (const c of ds.calls) {
      expect(c.sql).not.toContain("INTERVAL '30 days'");
      expect(c.sql).toContain("$2::int * INTERVAL '1 day'");
      expect(c.params).toEqual([ORG, 30]);
    }
  });

  it('기간 미지정이면 기간 조건 자체를 붙이지 않는다', async () => {
    const ds = makeDs({});
    await getOrganizationPlacementAnalytics(ds, ORG);
    for (const c of ds.calls) {
      expect(c.sql).not.toContain('INTERVAL');
      expect(c.params).toEqual([ORG]);
    }
  });

  it('days 는 1~365 로 정규화한다', async () => {
    const over = makeDs({});
    await getOrganizationPlacementAnalytics(over, ORG, { days: 99999 });
    expect(over.calls[0].params).toEqual([ORG, 365]);

    const under = makeDs({});
    await getOrganizationPlacementAnalytics(under, ORG, { days: 0 });
    expect(under.calls[0].params).toEqual([ORG, 1]);
  });

  it('사용처 축도 UNPLACED / AMBIGUOUS 를 접어 내려준다 (숨기지 않는다)', async () => {
    const ds = makeDs({});
    await getOrganizationPlacementAnalytics(ds, ORG);
    const q = sqlOf(ds).find((x: string) => x.includes('WITH matched AS'));
    expect(q).toContain("WHEN match_count = 0 THEN 'UNPLACED'");
    expect(q).toContain("WHEN match_count > 1 THEN 'AMBIGUOUS'");
  });

  it('totalScans 는 스캔 이벤트에서 직접 센다 (축 합산으로 만들지 않는다)', async () => {
    const ds: any = {
      calls: [],
      query: jest.fn(async (sql: string, params: any[] = []) => {
        ds.calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
        if (sql.includes('COUNT(*)::int AS total')) return [{ total: 41 }];
        return [];
      }),
    };
    const r = await getOrganizationPlacementAnalytics(ds, ORG);
    expect(r.totalScans).toBe(41);
    expect(r.byPlacement).toEqual([]);
  });
});
