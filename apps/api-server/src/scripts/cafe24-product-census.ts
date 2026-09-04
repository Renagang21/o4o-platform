/**
 * Cafe24 상품·품목 Census + ProductMaster 매칭 실측 CLI (read-only)
 *
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1        (최초 — 상품 축 census)
 * WO-O4O-CAFE24-REAL-WHOLESALE-MALL-CENSUS-V1  (개정 — 품목 축 + 개선 매처 + 사업 판정 지표)
 *
 * Usage:
 *   npx tsx src/scripts/cafe24-product-census.ts --mall <mall_id> [--shop 1] [--limit 0]
 *                                                [--variants 1] [--outdir <dir>]
 *     --limit 0    = 전량
 *     --variants 0 = 품목 조회 생략 (상품 축만)
 *
 * 안전 경계:
 *   - **DB write 0.** Cafe24 상품/품목을 어떤 테이블에도 저장하지 않는다.
 *     ProductMaster / ProductIdentifier / mapping 도 생성·수정하지 않는다 (WO §14).
 *   - scope 는 mall.read_product 만 쓴다. 주문·회원·결제·배송 endpoint 를 호출하지 않는다 (WO §3).
 *   - 리포트에 token/secret 을 쓰지 않는다. 산출물은 repo 밖 경로가 기본값이다 (WO §16).
 *
 * 매칭은 BulkMatchService.matchItems() — 운영 코드를 그대로 호출한다.
 * census 전용 사다리를 따로 두지 않는다 (실측과 운영 동작이 갈리면 판정이 무의미해진다).
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Cafe24ConnectionService } from '../modules/cafe24/services/cafe24-connection.service.js';
import { Cafe24Connection } from '../modules/cafe24/entities/Cafe24Connection.entity.js';
import { loadCafe24OAuthConfig } from '../modules/cafe24/cafe24-oauth.client.js';
import {
  fetchProductCount,
  fetchProductPage,
  fetchProductVariants,
} from '../modules/cafe24/cafe24-admin-api.client.js';
import type { Cafe24ProductRow, Cafe24VariantRow } from '../modules/cafe24/cafe24-admin-api.client.js';
import { BulkMatchService, normalizeKey } from '../modules/neture/services/bulk-match.service.js';
import type { MatchResult } from '../modules/neture/services/bulk-match.service.js';

/**
 * 이 러너 전용 DataSource.
 * 앱의 AppDataSource 는 전체 entity 를 로드해 tsx 실행 시 ColumnTypeUndefinedError 로 죽는다.
 * census 에 실제로 필요한 entity 는 Cafe24Connection 하나뿐이고, 나머지 조회는 raw SQL 이다.
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

/** WO §9 분류 — 사람 확인이 필요한지로 갈린다 */
type CensusStatus =
  | 'AUTO_EXACT_IDENTIFIER'
  | 'AUTO_EXACT_NAME'
  | 'AMBIGUOUS'
  | 'SIMILAR_REVIEW'
  | 'NOT_FOUND';

/** BulkMatchService 의 batch 상한과 동일 (초과분은 서비스가 잘라낸다) */
const MATCH_BATCH = 200;
/** 품목 조회 동시성 — Cafe24 rate limit 보호 */
const VARIANT_CONCURRENCY = 2;

interface Args {
  mall: string;
  shop: number;
  limit: number;
  variants: boolean;
  outdir: string;
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
    variants: (get('variants') ?? '1') !== '0',
    outdir: get('outdir') ?? 'C:/tmp/cafe24-real-wholesale-census',
  };
}

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

interface FieldCensus {
  field: string;
  populated: number;
  blank: number;
  /** populated 중 값이 1회만 등장한 건수 */
  unique: number;
  /** populated 중 값이 2회 이상 등장한 건수 */
  duplicate: number;
  distinctValues: number;
  populatedRate: number;
  /** populated 이면서 유일한 비율 — "식별자로 쓸 수 있는" 비율 */
  usableAsKeyRate: number;
}

function censusField(rows: Array<Record<string, unknown>>, field: string): FieldCensus {
  const counts = new Map<string, number>();
  let populated = 0;
  for (const r of rows) {
    const v = str(r[field]);
    if (!v) continue;
    populated += 1;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let unique = 0;
  let duplicate = 0;
  for (const [, c] of counts) {
    if (c === 1) unique += 1;
    else duplicate += c;
  }
  const n = rows.length || 1;
  return {
    field,
    populated,
    blank: rows.length - populated,
    unique,
    duplicate,
    distinctValues: counts.size,
    populatedRate: Number((populated / n).toFixed(4)),
    usableAsKeyRate: Number((unique / n).toFixed(4)),
  };
}

/** 동시성 제한 map */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** WO §9 — matchItems 결과를 census 분류로 옮긴다 */
function classify(r: MatchResult): CensusStatus {
  if (r.status === 'EXACT_MATCH') {
    return r.matchedBy === 'identifier_exact' ? 'AUTO_EXACT_IDENTIFIER' : 'AUTO_EXACT_NAME';
  }
  if (r.status === 'SIMILAR_MATCH') {
    // 정규화 완전일치인데 master 가 복수 = 동명이품. 유사도 후보와 성격이 다르다.
    return r.matchedBy === 'normalized_exact' ? 'AMBIGUOUS' : 'SIMILAR_REVIEW';
  }
  return 'NOT_FOUND';
}

interface RowOut {
  product_no: number | null;
  product_name: string;
  custom_product_code: string;
  variant_identifier_used: string;
  status: CensusStatus;
  matchedBy: string;
  topScore: number | null;
  master_id: string | null;
  master_name: string | null;
  n_candidates: number;
  candidate_names: string[];
  name_length: number;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.outdir, { recursive: true });

  const cfg = loadCafe24OAuthConfig();
  if (!cfg) {
    console.error('CAFE24_CLIENT_ID/CAFE24_CLIENT_SECRET/CAFE24_REDIRECT_URI 미설정');
    process.exit(3);
  }

  await AppDataSource.initialize();
  const t0 = Date.now();
  try {
    const connService = new Cafe24ConnectionService(AppDataSource);
    const conn = await connService.findByMall(args.mall, args.shop);
    if (!conn) {
      console.error(`연결 없음: mall=${args.mall} shop=${args.shop} — OAuth 연결이 먼저 필요합니다`);
      process.exit(4);
    }
    // WO §4 — token 값 자체는 출력하지 않는다. 메타만 기록한다.
    console.log(
      `[A] mall=${conn.mallId} shop=${conn.shopNo} status=${conn.status} scopes=${JSON.stringify(conn.scopes)}`,
    );
    const accessToken = await connService.getUsableAccessToken(conn);

    // ---- Phase B: 상품 전량 ----
    const tB = Date.now();
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
      console.log(`[B] products ${rows.length}/${target}`);
    }
    const msProducts = Date.now() - tB;

    // ---- Phase C: 품목(variants) 전량 ----
    const tC = Date.now();
    const variantsByProduct = new Map<number, Cafe24VariantRow[]>();
    const variantKeys = new Set<string>();
    let variantErrors = 0;
    if (args.variants) {
      const nos = rows.map((r) => Number(r.product_no)).filter((x) => Number.isFinite(x));
      let done = 0;
      await mapLimit(nos, VARIANT_CONCURRENCY, async (no) => {
        try {
          const v = await fetchProductVariants(cfg, conn.mallId, accessToken, no, conn.shopNo);
          variantsByProduct.set(no, v.variants);
          for (const k of v.observedKeys) variantKeys.add(k);
        } catch {
          variantErrors += 1;
        }
        done += 1;
        if (done % 100 === 0) console.log(`[C] variants ${done}/${nos.length}`);
      });
    }
    const msVariants = Date.now() - tC;
    const allVariants = [...variantsByProduct.values()].flat();

    // ---- Phase D: 매칭 (운영 BulkMatchService) ----
    const tD = Date.now();
    const svc = new BulkMatchService(AppDataSource);

    /**
     * WO §8 우선순위:
     *   1) custom_product_code  2) custom_variant_code / gtin  3~) 상품명 축
     * Cafe24 가 자동 생성하는 product_code / variant_code 는 O4O 식별자로 쓰지 않는다.
     */
    const codeOf = (r: Cafe24ProductRow): { code: string | null; source: string } => {
      const cpc = str(r.custom_product_code);
      if (cpc) return { code: cpc, source: 'custom_product_code' };
      const vs = variantsByProduct.get(Number(r.product_no)) ?? [];
      for (const v of vs) {
        const cvc = str(v.custom_variant_code);
        if (cvc) return { code: cvc, source: 'custom_variant_code' };
      }
      for (const v of vs) {
        const g = str(v.gtin);
        if (g) return { code: g, source: 'gtin' };
      }
      return { code: null, source: '' };
    };

    const inputs = rows.map((r) => {
      const picked = codeOf(r);
      return { row: r, name: str(r.product_name), code: picked.code, source: picked.source };
    });

    const results: MatchResult[] = [];
    for (let i = 0; i < inputs.length; i += MATCH_BATCH) {
      const chunk = inputs.slice(i, i + MATCH_BATCH);
      results.push(...(await svc.matchItems(chunk.map((c) => ({ name: c.name, code: c.code })))));
      console.log(`[D] matched ${results.length}/${inputs.length}`);
    }
    const msMatching = Date.now() - tD;

    const out: RowOut[] = results.map((res, i) => {
      const src = inputs[i];
      return {
        product_no: Number(src.row.product_no) || null,
        product_name: src.name,
        custom_product_code: str(src.row.custom_product_code),
        variant_identifier_used: src.source === 'custom_product_code' ? '' : src.source,
        status: classify(res),
        matchedBy: res.matchedBy,
        topScore: res.topScore ?? null,
        master_id: res.master?.id ?? null,
        master_name: res.master?.name ?? null,
        n_candidates: res.candidates?.length ?? 0,
        candidate_names: (res.candidates ?? []).slice(0, 5).map((c) => c.name),
        name_length: normalizeKey(src.name).length,
      };
    });

    // ---- 집계 ----
    const statuses: CensusStatus[] = [
      'AUTO_EXACT_IDENTIFIER',
      'AUTO_EXACT_NAME',
      'AMBIGUOUS',
      'SIMILAR_REVIEW',
      'NOT_FOUND',
    ];
    const byStatus = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<CensusStatus, number>;
    for (const o of out) byStatus[o.status] += 1;

    const n = out.length || 1;
    const auto = byStatus.AUTO_EXACT_IDENTIFIER + byStatus.AUTO_EXACT_NAME;
    const review = byStatus.AMBIGUOUS + byStatus.SIMILAR_REVIEW;

    // WO §10 — 보유 여부별 / 이름 길이별 차이
    const split = (pred: (o: RowOut) => boolean) => {
      const g = out.filter(pred);
      const a = g.filter((o) => o.status.startsWith('AUTO_')).length;
      return { n: g.length, auto: a, autoRate: g.length ? Number((a / g.length).toFixed(4)) : 0 };
    };

    const report = {
      wo: 'WO-O4O-CAFE24-REAL-WHOLESALE-MALL-CENSUS-V1',
      mallId: conn.mallId,
      shopNo: conn.shopNo,
      scopes: conn.scopes,
      TOTAL_PRODUCTS: total,
      analyzedProducts: rows.length,
      TOTAL_VARIANTS: allVariants.length,
      variantsFetchedForProducts: variantsByProduct.size,
      variantErrors,
      variantsPerProduct: {
        avg: variantsByProduct.size ? Number((allVariants.length / variantsByProduct.size).toFixed(3)) : 0,
        max: Math.max(0, ...[...variantsByProduct.values()].map((v) => v.length)),
      },
      observedProductKeys: [...observedKeys].sort(),
      observedVariantKeys: [...variantKeys].sort(),
      productFieldCensus: [
        'product_no',
        'product_code',
        'custom_product_code',
        'product_name',
        'eng_product_name',
        'internal_product_name',
        'model_name',
        'manufacturer_code',
        'brand_code',
        'supplier_code',
      ].map((f) => censusField(rows as Array<Record<string, unknown>>, f)),
      variantFieldCensus: ['variant_code', 'custom_variant_code', 'gtin'].map((f) =>
        censusField(allVariants as Array<Record<string, unknown>>, f),
      ),
      matchByStatus: byStatus,
      coreRatios: {
        AUTO_MATCH_RATE: Number((auto / n).toFixed(4)),
        IDENTIFIER_AUTO_RATE: Number((byStatus.AUTO_EXACT_IDENTIFIER / n).toFixed(4)),
        NAME_AUTO_RATE: Number((byStatus.AUTO_EXACT_NAME / n).toFixed(4)),
        HUMAN_REVIEW_RATE: Number((review / n).toFixed(4)),
        AMBIGUOUS_RATE: Number((byStatus.AMBIGUOUS / n).toFixed(4)),
        SIMILAR_REVIEW_RATE: Number((byStatus.SIMILAR_REVIEW / n).toFixed(4)),
        NOT_FOUND_RATE: Number((byStatus.NOT_FOUND / n).toFixed(4)),
      },
      breakdown: {
        withCustomProductCode: split((o) => !!o.custom_product_code),
        withoutCustomProductCode: split((o) => !o.custom_product_code),
        nameShort_lt10: split((o) => o.name_length < 10),
        nameMid_10to25: split((o) => o.name_length >= 10 && o.name_length < 25),
        nameLong_ge25: split((o) => o.name_length >= 25),
      },
      performance: {
        msProducts,
        msVariants,
        msMatching,
        msTotal: Date.now() - t0,
        msMatchingPerProduct: Number((msMatching / n).toFixed(2)),
        matchBatches: Math.ceil(out.length / MATCH_BATCH),
        rssMB: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
        heapUsedMB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
      },
      dbWrites: 0,
    };

    // WO §11 — precision 독립검증 표본 (자동확정 30 / ambiguous 20 / similar 20 / not_found 20)
    const sampleOf = (pred: (o: RowOut) => boolean, k: number): RowOut[] => {
      const g = out.filter(pred);
      if (g.length <= k) return g;
      const step = g.length / k;
      return Array.from({ length: k }, (_, i) => g[Math.floor(i * step)]);
    };
    const samples = {
      auto: sampleOf((o) => o.status.startsWith('AUTO_'), 30),
      ambiguous: sampleOf((o) => o.status === 'AMBIGUOUS', 20),
      similar: sampleOf((o) => o.status === 'SIMILAR_REVIEW', 20),
      notFound: sampleOf((o) => o.status === 'NOT_FOUND', 20),
    };

    const base = path.join(args.outdir, `${conn.mallId}-shop${conn.shopNo}`);
    fs.writeFileSync(`${base}-summary.json`, JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(`${base}-rows.json`, JSON.stringify(out, null, 1), 'utf8');
    fs.writeFileSync(`${base}-samples.json`, JSON.stringify(samples, null, 1), 'utf8');

    console.log(
      JSON.stringify(
        { ...report, observedProductKeys: observedKeys.size, observedVariantKeys: variantKeys.size },
        null,
        2,
      ),
    );
    console.log(`\n산출물: ${base}-{summary,rows,samples}.json`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
