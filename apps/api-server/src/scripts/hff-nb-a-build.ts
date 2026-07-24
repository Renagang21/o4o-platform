/**
 * WO-O4O-HFF-NOBRACKET-BULK-PRODUCTION-A-V1 — Agent A 전용 additive noBracket 대량 build.
 *
 * 대상: MAIN_FNCTN 에 `[원료]` 브래킷이 **없는**(noBracket) HFF 후보 중
 *       shard0(`stableHash(STTEMNT_NO) % 3 === 0`) · 미승격(matched NULL) · 미선점(STORE canonical 없음).
 *
 * 귀속 원칙 — noBracket 은 원료 라벨 구조가 없으므로 **기능성 원료가 정확히 1종**일 때만 생산한다.
 *   ① BASE_STANDARD 규격에서 기능성 원료 키를 추출(`parseSpecs`).
 *      미분류 규격 라벨(unknownLabels)은 SF registry `labelRe` 로 2차 해석 → 그래도 미해석이면 HOLD.
 *      (규격 라인을 해석 못한 채 생산하면 원료 누락 위험 → 파서 안전망 그대로 존중)
 *   ② 키가 0개 → NO_FUNCTIONAL_KEY HOLD(프로바이오틱스 CFU·홍삼 진세노사이드 등 전용 파이프라인 소관).
 *      키가 2개 이상 → MULTI_INGREDIENT HOLD(라벨 없는 다원료는 기능성 귀속 모호 — 임의 배분 금지).
 *   ③ 정확히 1종이면 MAIN_FNCTN 의 모든 공식 기능성이 그 원료에 귀속(모호성 없음).
 *      기능성 KO = 원문 문장 그대로(`extractFunctionsKo`), EN = 공용 `mapFunctionEn`/C overlay.
 *      EN 미매핑이 하나라도 있으면 GROUNDING_PENDING_EN HOLD(임의 영문 생성 0).
 *   ④ 공식 기능성·질환명·증상명은 삭제·순화하지 않는다. 원문 밖 치료·예방 주장 미생성. 전문가 상담 footer 유지.
 *
 * 재사용(무수정): `hff-source-parse`(parseSpecs) · `hff-sf-registry`(SF_INGREDIENTS·resolveFunctions)
 *                 `hff-nutrient-registry`(NUTRIENT_META·FUNCTIONAL_META) · `hff-sf-compose`(composeSf)
 *                 `content-guard`(runGuard) · apply 는 `hff-sf-apply.ts`.
 *
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-nb-a-build.ts --out <dir> [--limit N] [--chunk N]
 * DB write 0. 산출: <dir>/nb-a-target-<i>.json (apply 입력) · nb-a-pool/-hold/-selfcheck.json
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { parseSpecs, classify, NONFUNC } from './hff-source-parse.js';
import type { SfIngredient } from './hff-sf-registry.js';
import { SF_INGREDIENTS, resolveFunctions } from './hff-sf-registry.js';
import { NUTRIENT_META, FUNCTIONAL_META } from './hff-nutrient-registry.js';
import { composeSf, type SfSeed } from './hff-sf-compose.js';

/** hff-combo-select / hff-shard0-remainder-census 와 동일 FNV-1a — shard 판정 일치 보장. */
export function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

/** 규격 키 → composeSf 가 요구하는 SfIngredient 형태. SF registry 우선(fnNormalize 보존), 없으면 영양소/기능성 meta. */
function ingredientOf(key: string): SfIngredient | null {
  const sf = Object.values(SF_INGREDIENTS).find((i) => i.key === key);
  if (sf) return sf;
  const meta = FUNCTIONAL_META[key] ?? NUTRIENT_META[key];
  if (!meta) return null;
  return { key: meta.key, slug: meta.slug, displayKo: meta.displayKo, displayEn: meta.displayEn, labelRe: /$^/, statusHint: 'READY' };
}

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const LIMIT = parseInt(arg('limit', '0'), 10) || 0;      // 0 = 무제한
const CHUNK = parseInt(arg('chunk', '250'), 10);          // apply 배치 크기(충돌 시 손실 최소화)
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

const BRACKET = /\[[^\]]{1,24}\]/;

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    // 이미 master 가 있는 신고번호(타 파이프라인 승격분 포함) — apply preload MASTER_EXISTS 사전 회피.
    const hasMaster = new Set((await ds.query(`SELECT DISTINCT mfds_permit_number p FROM product_masters WHERE mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const funnel = { scanned: 0, shard0: 0, noBracket: 0, promoted: 0, taken: 0, masterExists: 0, dup: 0, unknownSpecLabel: 0, noFunctionalKey: 0, multiIngredient: 0, fiberPending: 0, noMeta: 0, noFunction: 0, enPending: 0, composeHold: 0, guardBlock: 0, guardReview: 0, target: 0 };
    const target: unknown[] = []; const pool: unknown[] = []; const hold: Array<Record<string, unknown>> = [];
    const seen = new Set<string>(); const distKey: Record<string, number> = {};
    const holdReason: Record<string, number> = {};
    const H = (stmt: string, name: string, reason: string, extra: Record<string, unknown> = {}): void => {
      const head = reason.split(':')[0]; holdReason[head] = (holdReason[head] ?? 0) + 1;
      if (hold.length < 4000) hold.push({ stmt, name, reason, ...extra });
    };

    let after = '00000000-0000-0000-0000-000000000000';
    outer: for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
           coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
           coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
           coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1
         ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      after = rows[rows.length - 1].id;

      for (const r of rows) {
        funnel.scanned++;
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== 0) continue; funnel.shard0++;
        const mf = r.fn || ''; if (BRACKET.test(mf)) continue; funnel.noBracket++;
        if (seen.has(stmt)) { funnel.dup++; continue; } seen.add(stmt);
        if (r.mid != null) { funnel.promoted++; continue; }
        if (taken.has(stmt)) { funnel.taken++; continue; }
        if (hasMaster.has(stmt)) { funnel.masterExists++; continue; }

        const base = r.base || '';
        const sp = parseSpecs(base);
        const keys = new Set<string>(sp.byKey.keys());
        // 미분류 규격 라벨 2차 해석. 하나라도 미해석이면 원료 누락 위험 → HOLD.
        //   `parseSpecs` 의 LOOSE 안전망은 비율 표기 변이로 SPEC_RE 를 못 지난 규격 라인을 **분류 없이**
        //   unknownLabels 로 강제 편입한다(철·식이섬유·아연 등 정상 원료도 여기로 떨어짐).
        //   composeSf 는 규격 수치를 렌더링하지 않고 이 키를 **원료 식별(단일/복수 판정)** 에만 쓰므로,
        //   공용 분류기 `classify` 를 그대로 한 번 더 적용해 식별만 회수한다(수치 소비 0 · 공용 파서 무수정).
        //   분류·SF 어느 쪽도 못 읽는 조각(`)`·`Rg3의 합`·`조단백질` 등)은 그대로 HOLD 를 유지한다.
        const unresolved: string[] = [];
        for (const lb of sp.unknownLabels) {
          const norm = lb.replace(/^\s*(?:\((?:\d+|[가-힣])\)|[①②③④⑤⑥⑦⑧⑨⑩]|\d+[).])\s*/, '').trim();
          if (NONFUNC.test(norm)) continue;
          const sf = Object.values(SF_INGREDIENTS).find((i) => i.labelRe.test(norm) || (i.indicatorRe?.test(norm) ?? false));
          if (sf) { keys.add(sf.key); continue; }
          const c = classify(norm);
          if (c) keys.add(c); else unresolved.push(lb);
        }
        if (unresolved.length) { funnel.unknownSpecLabel++; H(stmt, r.name.trim(), 'UNKNOWN_SPEC_LABEL', { labels: unresolved.slice(0, 4) }); continue; }
        const ks = [...keys];
        if (ks.length === 0) { funnel.noFunctionalKey++; H(stmt, r.name.trim(), 'NO_FUNCTIONAL_KEY'); continue; }
        if (ks.length >= 2) { funnel.multiIngredient++; H(stmt, r.name.trim(), 'MULTI_INGREDIENT', { keys: ks }); continue; }

        // `식이섬유` 는 차전자피·난소화성말토덱스트린·이눌린·프락토올리고당 등 **상이 원료**가 한 키로 접힌다
        // (parseSpecs 단일키 붕괴). 단일 판정이 성립해도 실제로는 복수 원료일 수 있어 귀속을 보증할 수 없으므로
        // 공용 fiber 해석이 확장될 때까지 생산하지 않는다(PENDING_SHARED).
        if (ks[0] === '식이섬유') { funnel.fiberPending++; H(stmt, r.name.trim(), 'PENDING_SHARED_FIBER'); continue; }
        const ing = ingredientOf(ks[0]);
        if (!ing) { funnel.noMeta++; H(stmt, r.name.trim(), `NO_META:${ks[0]}`); continue; }

        const fns = resolveFunctions(ing, mf);
        if (!fns.ko.length) { funnel.noFunction++; H(stmt, r.name.trim(), 'NO_FUNCTION', { key: ing.key }); continue; }
        if (fns.pending) { funnel.enPending++; H(stmt, r.name.trim(), 'GROUNDING_PENDING_EN', { key: ing.key, miss: fns.ko.filter((_, i) => !fns.en[i]).slice(0, 2) }); continue; }

        const seed: SfSeed = {
          statementNo: stmt, candidateId: r.id, productName: r.name.trim(), manufacturer: r.maker.trim(),
          functionsKo: fns.ko, functionsEn: fns.en,
          source: { mainFunction: mf.trim(), baseStandard: base.trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() },
        };
        const c = composeSf(ing, seed);
        if ('error' in c) { funnel.composeHold++; H(stmt, seed.productName, `COMPOSE_${c.error}`, { key: ing.key }); continue; }

        const gi = { candidateId: r.id, productName: seed.productName, productNameEn: seed.productName, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: stmt, category: 'hff',
          source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
          grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
        const g = runGuard(gi as never, { phase: 'all' });
        const blocked = g.findings.filter((f) => f.status === 'BLOCKED');
        if (blocked.length) { funnel.guardBlock++; H(stmt, seed.productName, `GUARD_BLOCKED:${blocked.map((f) => f.ruleId).join(',')}`, { key: ing.key }); continue; }
        if (g.overallStatus === 'REVIEW_REQUIRED') { funnel.guardReview++; H(stmt, seed.productName, `GUARD_REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}`, { key: ing.key }); continue; }

        distKey[ing.key] = (distKey[ing.key] ?? 0) + 1;
        target.push(gi); pool.push({ stmt, name: seed.productName, key: ing.key, fnCount: fns.ko.length });
        funnel.target++;
        if (LIMIT && target.length >= LIMIT) break outer;
      }
    }

    // apply 배치 분할(충돌 시 손실 최소화)
    const chunks: number[] = [];
    for (let i = 0, b = 0; i < target.length; i += CHUNK, b++) {
      fs.writeFileSync(path.join(OUTDIR, `nb-a-target-${b}.json`), JSON.stringify(target.slice(i, i + CHUNK), null, 1));
      chunks.push(Math.min(CHUNK, target.length - i));
    }
    const w = (nm: string, d: unknown): void => fs.writeFileSync(path.join(OUTDIR, `nb-a-${nm}.json`), JSON.stringify(d, null, 1));
    w('pool', pool); w('hold', hold); w('selfcheck', { funnel, distKey, holdReason, chunks });
    console.log('JSON_NB_A_BEGIN');
    console.log(JSON.stringify({ funnel, distKey, holdReason, targetTotal: target.length, chunks }, null, 2));
    console.log('JSON_NB_A_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
