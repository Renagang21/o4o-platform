/**
 * Agent C 소유 — READ-ONLY(DB write 0). noBracket(MAIN_FNCTN 대괄호 라벨 0) 단일 기능성 후보 selector.
 * WO-O4O-HFF-NOBRACKET-BULK-PRODUCTION-C-V1 · shard = stableHash(STTEMNT_NO) % 3 (기본 2).
 *
 *   PROXY_PORT=5461 DB_USERNAME=.. DB_PASSWORD=.. DB_NAME=.. \
 *     npx tsx src/scripts/hff-nobracket-c-select.ts --out <dir> [--shard 2] [--limit 1000] [--skip <n>]
 *
 * 문제: 공용 hff-sf-select 는 `[원료]` 브래킷 1개를 귀속 앵커로 요구(brackets.length!==1 → skip)하므로
 *       noBracket 제품은 전량 제외된다. 본 selector 는 **브래킷 대신 공식 기준·규격(BASE_STANDARD)** 을
 *       귀속 앵커로 사용한다(원문 밖 추정 0):
 *   ① parseSpecs(BASE_STANDARD).byKey.size === 1 && unknownLabels.length === 0
 *      → 공식 기준·규격이 선언한 기능성 원료가 정확히 1종 → 기능성 귀속 대상이 유일(오귀속 구조적 불가).
 *   ② 그 스펙 라벨에 매칭되는 SF_INGREDIENTS 항목이 **정확히 1개**(복수 매칭=모호 → HOLD).
 *   ③ foreign-fn 차단: 추출된 KO 기능성 중 **다른 등록 원료**(NUTRIENT_META/FUNCTIONAL_META)에 귀속되는
 *      문장이 하나라도 있으면 HOLD(스펙 미기재 부원료의 기능정보가 주원료로 끌려오는 것을 차단).
 *   ④ 이후 게이트는 공용 hff-sf-select 와 1:1(고형·미승격·exclude-taken·섭취 PASS·BULK 제외·EN 전량 매핑).
 *
 * 산출: <dir>/<slug>-ready.json (공용 hff-sf-generate 가 그대로 소비하는 shape) + census.json.
 * 공용 parser/registry/composer **무편집** — import 만 한다.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText, parseSpecs, classify } from './hff-source-parse.js';
import { parseServing, isBulkMaterial } from '../modules/content-guard/source-grounding-parser.js';
import { NUTRIENT_META, FUNCTIONAL_META, fnBelongsTo } from './hff-nutrient-registry.js';
import { SF_INGREDIENTS, resolveFunctions, extractFunctionsKo, type SfIngredient } from './hff-sf-registry.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const SHARD = parseInt(arg('shard', '2'), 10);
const LIMIT = parseInt(arg('limit', '1000000'), 10);
const SKIP = parseInt(arg('skip', '0'), 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5461', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const REG_KEYS = [...new Set([...Object.keys(NUTRIENT_META), ...Object.keys(FUNCTIONAL_META)])];
const SF_LIST: SfIngredient[] = Object.values(SF_INGREDIENTS);

interface Ready { statementNo: string; candidateId: string; shard: number; ingredientKey: string; productName: string; manufacturer: string; functionsKo: string[]; functionsEn: string[]; source: Record<string, string> }

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const bySlug = new Map<string, Ready[]>();
    const hold: Record<string, number> = {};
    const holdSample: Record<string, string[]> = {};
    const ingCount: Record<string, number> = {};
    const unmatchedLabels: Record<string, number> = {};
    const H = (code: string, s: string): void => { hold[code] = (hold[code] ?? 0) + 1; (holdSample[code] ??= []).length < 4 && holdSample[code].push(s); };
    const funnel = { scanned: 0, inShard: 0, unpromoted: 0, notTaken: 0, noBracket: 0, singleSpec: 0, sfMatched: 0, solid: 0, ready: 0 };
    const seen = new Set<string>();
    let emitted = 0, passedSkip = 0;

    let after = '00000000-0000-0000-0000-000000000000';
    outer: for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
           coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
           coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
           coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        funnel.scanned++;
        const stmt = String(r.stmt).trim(); if (!stmt || seen.has(stmt)) continue;
        if (stableHash(stmt) % 3 !== SHARD) continue; funnel.inShard++;
        if (r.mid != null) continue; funnel.unpromoted++;
        if (taken.has(stmt)) continue; funnel.notTaken++;
        seen.add(stmt);

        // noBracket 판정 — 공용 census(hff-nobracket-b-census)와 동일 계약
        const t = normalizeSpecText(r.fn);
        if ([...t.matchAll(/\[([^\]]+?)\]/g)].filter((m) => m[1].trim().length >= 2).length !== 0) continue;
        funnel.noBracket++;

        // ① 공식 기준·규격 = 기능성 스펙 정확히 1종 (귀속 앵커)
        const sp = parseSpecs(r.base);
        if (sp.unknownLabels.length > 0) { H('SPEC_UNPARSED', stmt); continue; }
        if (sp.byKey.size !== 1) { H(sp.byKey.size === 0 ? 'SPEC_NONE' : 'SPEC_MULTI', stmt); continue; }
        funnel.singleSpec++;
        const [ourKey, spec] = [...sp.byKey.entries()][0];
        const label = (spec.evidence.split(/[:：]/)[0] ?? '').trim();

        // ② SF registry 유일 매칭
        const hits = SF_LIST.filter((i) => i.labelRe.test(label));
        if (hits.length !== 1) {
          if (hits.length === 0) { unmatchedLabels[label.slice(0, 20)] = (unmatchedLabels[label.slice(0, 20)] ?? 0) + 1; H('SF_UNREGISTERED', stmt); }
          else H('SF_AMBIGUOUS', stmt);
          continue;
        }
        const ing = hits[0]; funnel.sfMatched++;

        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { H('LIQUID', stmt); continue; } funnel.solid++;

        // ③ foreign-fn 차단 — 다른 등록 원료에 귀속되는 기능성이 있으면 HOLD
        const kos = extractFunctionsKo(r.fn);
        if (kos.length === 0) { H('FN_EMPTY', stmt); continue; }
        const ownClassify = classify(label);
        const foreign = kos.some((f) => REG_KEYS.some((k2) => k2 !== ourKey && k2 !== ownClassify && fnBelongsTo(f, k2)));
        if (foreign) { H('FOREIGN_FN', stmt); continue; }

        // ④ 공용 SF 게이트와 1:1
        const srv = parseServing(r.srv); const bulk = isBulkMaterial(r.srv);
        const fns = resolveFunctions(ing, r.fn);
        if (srv.kind !== 'PARSED') { H(`SERVING_${srv.kind}`, stmt); continue; }
        if (bulk.bulk) { H('BULK', stmt); continue; }
        if (fns.pending) { H('GROUNDING_PENDING_EN', stmt); continue; }

        funnel.ready++;
        if (passedSkip++ < SKIP) continue;
        if (emitted >= LIMIT) break outer;
        emitted++;
        ingCount[ing.slug] = (ingCount[ing.slug] ?? 0) + 1;
        (bySlug.get(ing.slug) ?? bySlug.set(ing.slug, []).get(ing.slug)!).push({
          statementNo: stmt, candidateId: r.id, shard: SHARD, ingredientKey: ing.key,
          productName: r.name.trim(), manufacturer: r.maker.trim(), functionsKo: fns.ko, functionsEn: fns.en,
          source: { mainFunction: r.fn.trim(), baseStandard: r.base.trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() },
        });
      }
      after = rows[rows.length - 1].id;
    }

    for (const [slug, list] of bySlug) fs.writeFileSync(path.join(OUTDIR, `${slug}-ready.json`), JSON.stringify(list, null, 1));
    const unmatchedTop = Object.entries(unmatchedLabels).filter(([, v]) => v >= 5).sort((a, b) => b[1] - a[1]).slice(0, 30);
    const census = { shard: SHARD, skip: SKIP, limit: LIMIT, funnel, emitted, ingCount, hold, holdSample, unmatchedTop };
    fs.writeFileSync(path.join(OUTDIR, 'census.json'), JSON.stringify(census, null, 1));
    console.log('JSON_NB_SELECT_BEGIN');
    console.log(JSON.stringify(census, null, 2));
    console.log('JSON_NB_SELECT_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
