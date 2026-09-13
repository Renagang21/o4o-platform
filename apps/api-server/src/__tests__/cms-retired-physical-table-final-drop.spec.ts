/**
 * 은퇴 CMS/CPT 물리 잔재 DROP migration 계약
 *
 * WO-O4O-CMS-RETIRED-PHYSICAL-TABLE-FINAL-DROP-V1
 * 근거: IR-O4O-CMS-RETIRED-PHYSICAL-TABLE-RESIDUE-CENSUS-V1
 *
 * 고정하는 계약
 *   1. 대상은 exact 4개(custom_fields · custom_post_types · pages · views) 뿐, FK 자식 → 부모 순서.
 *   2. CASCADE 금지 · wildcard 금지 · 실행 완료 migration 수정 0.
 *   3. up() 가드: 부재 → skip / 행 ≥1 → throw(삭제 0) / 후보 밖 inbound FK → throw(삭제 0).
 *   4. down() 은 no-op (재생성 없음).
 *   5. 정본(cms_contents · cms_content_slots · media_assets · media_entity_links) 은 이 migration 이 건드리지 않는다.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { QueryRunner } from 'typeorm';
import { DropRetiredCmsCptResidueTables20270412000000 as Migration } from '../database/migrations/20270412000000-DropRetiredCmsCptResidueTables.js';

const SRC = join(__dirname, '..');
const FILE = join(SRC, 'database', 'migrations', '20270412000000-DropRetiredCmsCptResidueTables.ts');
const code = readFileSync(FILE, 'utf8')
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

type Fixture = Record<string, { exists: boolean; rows: number; inboundFrom: string[] }>;

function mockRunner(fx: Fixture) {
  const dropped: string[] = [];
  const queries: string[] = [];
  const q = {
    hasTable: jest.fn(async (t: string) => fx[t]?.exists ?? false),
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      queries.push(sql);
      const m = /FROM "([a-z_]+)"/.exec(sql);
      if (/count\(\*\)/.test(sql) && m) return [{ n: fx[m[1]].rows }];
      if (/pg_constraint/.test(sql)) {
        const t = String(params?.[0]).replace(/^public\./, '');
        return (fx[t]?.inboundFrom ?? []).map((f) => ({ from_table: f }));
      }
      const d = /DROP TABLE "([a-z_]+)" RESTRICT/.exec(sql);
      if (d) {
        dropped.push(d[1]);
        return [];
      }
      throw new Error(`unexpected sql in test: ${sql}`);
    }),
  } as unknown as QueryRunner;
  return { q, dropped, queries };
}

const healthy: Fixture = {
  custom_fields: { exists: true, rows: 0, inboundFrom: [] },
  custom_post_types: { exists: true, rows: 0, inboundFrom: ['custom_fields'] },
  pages: { exists: true, rows: 0, inboundFrom: [] },
  views: { exists: true, rows: 0, inboundFrom: ['pages'] },
};

describe('DropRetiredCmsCptResidueTables — 동작', () => {
  const silence = () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  };
  beforeEach(silence);
  afterEach(() => jest.restoreAllMocks());

  it('IR 실측 상태(4개 존재 · 0행 · 후보 내부 FK 만)에서 FK 자식 → 부모 순으로 4개를 RESTRICT 로 드롭한다', async () => {
    const { q, dropped, queries } = mockRunner(healthy);
    await new Migration().up(q);
    expect(dropped).toEqual(['custom_fields', 'custom_post_types', 'pages', 'views']);
    expect(queries.filter((s) => /DROP TABLE/.test(s)).every((s) => /RESTRICT$/.test(s.trim()))).toBe(true);
    expect(queries.some((s) => /CASCADE/i.test(s))).toBe(false);
  });

  it('테이블이 이미 없으면 skip 한다 (idempotent · ABSENT 환경에서도 성공)', async () => {
    const fx: Fixture = Object.fromEntries(Object.entries(healthy).map(([k, v]) => [k, { ...v, exists: false }]));
    const { q, dropped } = mockRunner(fx);
    await expect(new Migration().up(q)).resolves.toBeUndefined();
    expect(dropped).toEqual([]);
  });

  it('행이 1건이라도 있으면 throw 하고 아무것도 드롭하지 않는다 (STOP_DATA_PRESENT)', async () => {
    const fx: Fixture = { ...healthy, custom_fields: { ...healthy.custom_fields, rows: 1 } };
    const { q, dropped } = mockRunner(fx);
    await expect(new Migration().up(q)).rejects.toThrow(/STOP_DATA_PRESENT/);
    expect(dropped).toEqual([]);
  });

  it('후보 밖에서 들어오는 FK 가 있으면 throw 하고 드롭하지 않는다 (STOP_DEPENDENCY_PRESENT)', async () => {
    const fx: Fixture = { ...healthy, views: { ...healthy.views, inboundFrom: ['pages', 'cms_contents'] } };
    const { q, dropped } = mockRunner(fx);
    await expect(new Migration().up(q)).rejects.toThrow(/STOP_DEPENDENCY_PRESENT/);
    // mock 은 호출만 기록한다: views 에서 throw 되기 전 3개의 DROP 문이 발행된 것을 확인.
    // 실제 PostgreSQL 에서는 DROP TABLE 이 트랜잭션 안에 있으므로(migrate.ts transaction: 'each')
    // throw 시 이 3개도 함께 롤백된다 → 부분 삭제 없음 · job 실패 · deploy 미실행.
    expect(dropped).toEqual(['custom_fields', 'custom_post_types', 'pages']);
  });

  it('후보 내부 FK(custom_fields→custom_post_types · pages→views)는 허용 목록이다', async () => {
    const { q } = mockRunner(healthy);
    await expect(new Migration().up(q)).resolves.toBeUndefined();
  });

  it('down() 은 no-op 이며 SQL 을 실행하지 않는다', async () => {
    const { q, queries } = mockRunner(healthy);
    await new Migration().down();
    expect(queries).toEqual([]);
  });
});

describe('DropRetiredCmsCptResidueTables — 소스 계약', () => {
  it('대상은 exact 4개뿐이며 정본 테이블명이 등장하지 않는다', () => {
    for (const t of ['custom_fields', 'custom_post_types', 'pages', 'views']) {
      expect(code).toMatch(new RegExp(`table: '${t}'`));
    }
    expect(code).not.toMatch(/cms_contents|cms_content_slots|media_assets|media_entity_links/);
    expect(code).not.toMatch(/LIKE|%/); // wildcard 없음
  });

  it('CASCADE 를 쓰지 않고 RESTRICT 로만 드롭한다', () => {
    expect(code).not.toMatch(/CASCADE/);
    expect(code).toMatch(/DROP TABLE "\$\{table\}" RESTRICT/);
  });

  it('실행 완료 migration 을 수정하지 않았다 (이 파일이 유일한 신규 · 이름이 마지막 timestamp 보다 크다)', () => {
    const dir = join(SRC, 'database', 'migrations');
    const names = readdirSync(dir).filter((f) => /^\d{14}-/.test(f)).sort();
    expect(names[names.length - 1]).toBe('20270412000000-DropRetiredCmsCptResidueTables.ts');
  });

  it('migration 클래스명 · name 이 TypeORM 규약(이름+timestamp)을 따른다', () => {
    expect(code).toMatch(/class DropRetiredCmsCptResidueTables20270412000000 implements MigrationInterface/);
    expect(code).toMatch(/name = 'DropRetiredCmsCptResidueTables20270412000000'/);
  });
});
