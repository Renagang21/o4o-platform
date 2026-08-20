/**
 * Cafe24 상품 식별정보 Census + ProductMaster 매칭 실측 CLI
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §6·§7·§8
 *
 * Usage:
 *   npx tsx src/scripts/cafe24-product-census.ts --mall <mall_id> [--shop 1] [--limit 0] [--out <path>]
 *     --limit 0 = 전량
 *
 * 안전 경계:
 *   - **DB write 0.** Cafe24 상품을 어떤 테이블에도 저장하지 않는다 (WO §2 원장 복제 금지).
 *     ProductMaster / ProductIdentifier / mapping 도 생성하지 않는다 (WO §8 — 실측까지).
 *   - Cafe24 는 상품 조회 endpoint 만 호출한다 (주문/회원/결제 금지).
 *   - 리포트에 token/secret 을 쓰지 않는다. 리포트는 repo 밖 경로를 기본값으로 쓴다.
 *
 * 매칭 사다리 (강한 것부터). 기존 로직을 우선 재사용한다:
 *   1) barcode exact          — product_masters.barcode
 *   2) identifier exact       — product_identifiers.normalized_value (normalizeIdentifier 재사용)
 *   3) name+manufacturer exact— normalizeName 재사용 (bulk-match.service)
 *   4) name exact             — normalizeName 완전일치
 *   5) name similar           — ILIKE 부분일치 후보
 * 각 단계에서 후보 1건이면 EXACT, 2건 이상이면 AMBIGUOUS, 부분일치만 있으면 SIMILAR,
 * 전 단계 실패면 NOT_FOUND.
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Cafe24ConnectionService } from '../modules/cafe24/services/cafe24-connection.service.js';
import { Cafe24Connection } from '../modules/cafe24/entities/Cafe24Connection.entity.js';
import { loadCafe24OAuthConfig } from '../modules/cafe24/cafe24-oauth.client.js';
import { fetchProductCount, fetchProductPage } from '../modules/cafe24/cafe24-admin-api.client.js';
import type { Cafe24ProductRow } from '../modules/cafe24/cafe24-admin-api.client.js';
import { normalizeName } from '../modules/neture/services/bulk-match.service.js';
import { normalizeIdentifier } from '../modules/neture/utils/product-identifier.util.js';

/**
 * 이 러너 전용 DataSource.
 * 앱의 AppDataSource 는 전체 entity 를 로드해 tsx 실행 시 ColumnTypeUndefinedError 로 죽는다.
 * census 에 실제로 필요한 entity 는 Cafe24Connection 하나뿐이고, 나머지 조회는 raw SQL 이다.
 * (encryption-key-rotation.ts 와 동일한 패턴)
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Cafe24Connection],
  synchronize: false,
  migrationsRun: false,
  logging: false,
});

type MatchStatus = 'EXACT' | 'AMBIGUOUS' | 'SIMILAR' | 'NOT_FOUND';
type MatchMethod =
  | 'barcode_exact'
  | 'identifier_exact'
  | 'name_manufacturer_exact'
  | 'name_exact'
  | 'name_similar'
  | 'unmatched';

interface Args {
  mall: string;
  shop: number;
  limit: number;
  out: string;
}

function parseArgs(argv: string[]): Args {
  const get = (n: string): string | undefined => {
    const i = argv.indexOf(`--${n}`);
    if (i >= 0 && i + 1 < argv.length) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${n}=`));
    return eq ? eq.split('=').slice(1).join('=') : undefined;
  };
  const mall = get('mall');
  if (!mall) {
    console.error('--mall <mall_id> 는 필수입니다');
    process.exit(2);
  }
  return {
    mall,
    shop: Number(get('shop') ?? 1) || 1,
    limit: Number(get('limit') ?? 0) || 0,
    out: get('out') ?? path.resolve(process.cwd(), '..', '..', '..', `cafe24-product-census-${mall}.json`),
  };
}

/** 값이 census 상 "사용 가능"한가 (null/blank/공백만 제외) */
function usable(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

interface FieldCensus {
  field: string;
  present: number;
  blank: number;
  unique: number;
  duplicate: number;
  usableRate: number;
}

function censusField(rows: Cafe24ProductRow[], field: string): FieldCensus {
  let present = 0;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const raw = r[field];
    const v = raw === null || raw === undefined ? '' : String(raw);
    if (v.trim().length > 0) {
      present += 1;
      const k = v.trim();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  let unique = 0;
  let duplicate = 0;
  for (const [, c] of counts) {
    if (c === 1) unique += 1;
    else duplicate += c;
  }
  return {
    field,
    present,
    blank: rows.length - present,
    unique,
    duplicate,
    usableRate: rows.length ? Number((present / rows.length).toFixed(4)) : 0,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const cfg = loadCafe24OAuthConfig();
  if (!cfg) {
    console.error('CAFE24_CLIENT_ID/CAFE24_CLIENT_SECRET/CAFE24_REDIRECT_URI 미설정 — WO §11 중지 조건');
    process.exit(3);
  }

  await AppDataSource.initialize();
  try {
    const connService = new Cafe24ConnectionService(AppDataSource);
    const conn = await connService.findByMall(args.mall, args.shop);
    if (!conn) {
      console.error(`연결 없음: mall=${args.mall} shop=${args.shop} — 먼저 /api/v1/admin/cafe24/authorize 로 연결하십시오`);
      process.exit(4);
    }

    const accessToken = await connService.getUsableAccessToken(conn);

    // ---- Phase C: 실제 상품 조회 (저장 없음) ----
    const total = await fetchProductCount(cfg, conn.mallId, accessToken, conn.shopNo);
    const target = args.limit > 0 ? Math.min(args.limit, total) : total;
    const rows: Cafe24ProductRow[] = [];
    const observedKeys = new Set<string>();

    for (let offset = 0; offset < target; offset += 100) {
      const page = await fetchProductPage(cfg, conn.mallId, accessToken, {
        offset,
        limit: Math.min(100, target - offset),
        shopNo: conn.shopNo,
      });
      rows.push(...page.products);
      for (const k of page.observedKeys) observedKeys.add(k);
      if (page.products.length === 0) break;
      console.log(`[census] fetched ${rows.length}/${target}`);
    }

    // ---- Phase 7: 식별정보 census ----
    const censusFields = [
      'product_no',
      'product_code',
      'custom_product_code',
      'product_name',
      'eng_product_name',
      'model_name',
      'brand_code',
      'manufacturer_code',
      'supplier_code',
      'barcode',
      'origin_place_value',
    ];
    const fieldCensus = censusFields.map((f) => censusField(rows, f));

    // 상품명 normalization 결과
    const normalizedNames = rows.map((r) => normalizeName(String(r.product_name ?? '')));
    const normalizedNonEmpty = normalizedNames.filter((n) => n.length > 0);
    const normalizedUnique = new Set(normalizedNonEmpty).size;

    // ---- Phase 8: ProductMaster 매칭 실측 (DB write 0) ----
    const byMethod: Record<MatchMethod, number> = {
      barcode_exact: 0,
      identifier_exact: 0,
      name_manufacturer_exact: 0,
      name_exact: 0,
      name_similar: 0,
      unmatched: 0,
    };
    const byStatus: Record<MatchStatus, number> = { EXACT: 0, AMBIGUOUS: 0, SIMILAR: 0, NOT_FOUND: 0 };

    for (const r of rows) {
      const result = await matchOne(r);
      byMethod[result.method] += 1;
      byStatus[result.status] += 1;
    }

    const report = {
      wo: 'WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1',
      mallId: conn.mallId,
      shopNo: conn.shopNo,
      scopes: conn.scopes,
      totalProductsInMall: total,
      analyzed: rows.length,
      observedResponseKeys: [...observedKeys].sort(),
      fieldCensus,
      nameNormalization: {
        nonEmpty: normalizedNonEmpty.length,
        unique: normalizedUnique,
        collapsedByNormalization: normalizedNonEmpty.length - normalizedUnique,
      },
      matchByStatus: byStatus,
      matchByMethod: byMethod,
      dbWrites: 0,
    };

    fs.writeFileSync(args.out, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify({ ...report, observedResponseKeys: observedKeys.size }, null, 2));
    console.log(`\n리포트: ${args.out}`);
  } finally {
    await AppDataSource.destroy();
  }
}

async function matchOne(r: Cafe24ProductRow): Promise<{ status: MatchStatus; method: MatchMethod }> {
  // 1) barcode exact
  const barcode = usable(r.barcode) ? r.barcode.trim() : null;
  if (barcode) {
    const hits: Array<{ id: string }> = await AppDataSource.query(
      `SELECT id FROM product_masters WHERE barcode = $1 AND status = 'ACTIVE' LIMIT 5`,
      [barcode],
    );
    if (hits.length === 1) return { status: 'EXACT', method: 'barcode_exact' };
    if (hits.length > 1) return { status: 'AMBIGUOUS', method: 'barcode_exact' };
  }

  // 2) identifier exact — Cafe24 자체코드/바코드를 식별자 후보로 시도
  for (const raw of [barcode, usable(r.custom_product_code) ? r.custom_product_code : null]) {
    if (!raw) continue;
    const normalized = normalizeIdentifier('GTIN', raw) || raw.trim();
    const hits: Array<{ product_master_id: string }> = await AppDataSource.query(
      `SELECT DISTINCT product_master_id FROM product_identifiers
        WHERE normalized_value = $1 AND deleted_at IS NULL LIMIT 5`,
      [normalized],
    );
    if (hits.length === 1) return { status: 'EXACT', method: 'identifier_exact' };
    if (hits.length > 1) return { status: 'AMBIGUOUS', method: 'identifier_exact' };
  }

  // 3~5) 이름 기반
  const rawName = usable(r.product_name) ? r.product_name : '';
  const norm = normalizeName(rawName);
  if (!norm) return { status: 'NOT_FOUND', method: 'unmatched' };

  const candidates: Array<{ id: string; name: string; manufacturer_name: string | null }> =
    await AppDataSource.query(
      `SELECT id, name, manufacturer_name FROM product_masters
        WHERE name ILIKE $1 AND status = 'ACTIVE'
        ORDER BY name ASC LIMIT 20`,
      [`%${norm}%`],
    );
  if (candidates.length === 0) return { status: 'NOT_FOUND', method: 'unmatched' };

  const exactName = candidates.filter((c) => normalizeName(c.name) === norm);

  // 3) name + manufacturer exact — 제조사까지 맞으면 동명이품을 가른다
  const mfr = usable(r.manufacturer_code) ? normalizeName(r.manufacturer_code) : '';
  if (mfr && exactName.length > 1) {
    const withMfr = exactName.filter((c) => c.manufacturer_name && normalizeName(c.manufacturer_name) === mfr);
    if (withMfr.length === 1) return { status: 'EXACT', method: 'name_manufacturer_exact' };
  }

  // 4) name exact
  if (exactName.length === 1) return { status: 'EXACT', method: 'name_exact' };
  if (exactName.length > 1) return { status: 'AMBIGUOUS', method: 'name_exact' };

  // 5) name similar (부분일치 후보만 존재)
  return { status: 'SIMILAR', method: 'name_similar' };
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
