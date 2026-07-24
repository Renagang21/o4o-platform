/**
 * WO-O4O-HFF-NO-FUNCTIONAL-KEY-BULK-PRODUCTION-C-V1 — Agent C 전용 additive build (DB write 0).
 *
 * 대상: shard2(`stableHash(STTEMNT_NO)%3===2`) · noBracket · 미승격·미선점 후보 중
 *       **공용 계약상 기능성 키가 0개**(= 직전 WO 의 `NO_FUNCTIONAL_KEY` 보류군)인 제품.
 *       프로바이오틱스(CFU 계수 규격)·홍삼/인삼(지표성분 % 규격) 등 표시량 파서 계약 밖 표기 체계.
 *
 * 귀속 계약 — 직전 WO 의 «기능성 원료 정확히 1종» 불변식을 **강화**한다.
 *   ① BASE_STANDARD 규격 항목을 `specLabels()` 로 **전부 열거**한다(값 형식 무관).
 *   ② 각 라벨은 반드시 (a) 비기능 규격 (b) 공용 `classify()` (c) 공용 `SF_INGREDIENTS` labelRe/indicatorRe
 *      (d) C 전용 `NFK_LABELS` 중 하나로 해소되어야 한다. 하나라도 미해소면 HOLD(C_UNKNOWN_SPEC_LABEL).
 *      → «규격에 선언됐는데 못 본 원료» 가 존재할 수 없다.
 *   ③ 해소된 기능성 키가 **정확히 1종**일 때만 생산. 0종/2종 이상은 HOLD.
 *   ④ C 전용 key 는 그 원료의 **공식 기능성 집합에 속하는 문장만** 허용(FN_NOT_OFFICIAL HOLD) —
 *      개별인정형 등 원문 밖 기능성이 generic 원료로 끌려오는 것을 차단.
 *   ⑤ foreign-fn 차단(직전 WO 와 동일): 타 등록 원료에만 귀속되는 기능성이 있으면 HOLD.
 *   ⑥ EN = C 전용 매핑 → 공용 overlay → 공용 mapFunctionEn 순 폴백. 미매핑 1개라도 있으면 HOLD(임의 영문 생성 0).
 *   ⑦ 공식 기능성·질환명·증상명은 삭제·순화하지 않는다. 원문 밖 치료·예방 주장 미생성. 전문가 상담 footer 유지.
 *
 * 공용 파일 무수정: `hff-source-parse` · `hff-sf-registry` · `hff-nutrient-registry` · `hff-sf-compose` ·
 *                  `content-guard` · `hff-sf-apply` 를 재사용만 한다.
 *
 *   PROXY_PORT=5462 npx tsx src/scripts/hff-nfk-c-build.ts --out <dir> [--shard 2] [--limit N] [--chunk 250] [--skip N] [--prefix nfk-c]
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { parseSpecs, normalizeSpecText, classify } from './hff-source-parse.js';
import type { SfIngredient } from './hff-sf-registry.js';
import { SF_INGREDIENTS, extractFunctionsKo } from './hff-sf-registry.js';
import { mapFunctionEnC } from './hff-sf-c-en-overlay.js';
import { NUTRIENT_META, FUNCTIONAL_META, fnBelongsTo, mapFunctionEn } from './hff-nutrient-registry.js';
import { composeSf, type SfSeed } from './hff-sf-compose.js';
import { specLabels, isNonFunctionalLabel, NFK_LABELS, NFK_INGREDIENTS, NFK_INGREDIENT_FN, nfkFnBelongsTo, mapFunctionEnNfk, splitHangulItems, fnCoverageResidue } from './hff-nfk-c-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

function ingredientOf(key: string): SfIngredient | null {
  if (NFK_INGREDIENTS[key]) return NFK_INGREDIENTS[key];
  const sf = Object.values(SF_INGREDIENTS).find((i) => i.key === key);
  if (sf) return sf;
  const meta = FUNCTIONAL_META[key] ?? NUTRIENT_META[key];
  if (!meta) return null;
  return { key: meta.key, slug: meta.slug, displayKo: meta.displayKo, displayEn: meta.displayEn, labelRe: /$^/, statusHint: 'READY' };
}

const REG_KEYS = [...new Set([...Object.keys(NUTRIENT_META), ...Object.keys(FUNCTIONAL_META)])];
/** 등록 원료 소속 판정 — 공용 registry + C 전용 집합 합집합. */
function belongsAny(fn: string, key: string): boolean { return fnBelongsTo(fn, key) || nfkFnBelongsTo(fn, key); }
const ALL_KEYS = [...new Set([...REG_KEYS, ...Object.keys(NFK_INGREDIENT_FN)])];

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const SHARD = parseInt(arg('shard', '2'), 10);
const LIMIT = parseInt(arg('limit', '0'), 10) || 0;
const SKIP = parseInt(arg('skip', '0'), 10) || 0;
const CHUNK = parseInt(arg('chunk', '250'), 10);
const PREFIX = arg('prefix', 'nfk-c');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5462', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

const BRACKET = /\[[^\]]{1,24}\]/;
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const SPEC_DIRT = /표시량|이하\b|mg\/kg|음성|[:：]/;
function appearanceDirty(koHtml: string): string | null {
  const m = koHtml.match(/<b>성상<\/b>([\s\S]*?)<\/div>/);
  if (!m) return null;
  const txt = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return SPEC_DIRT.test(txt) ? txt.slice(0, 120) : null;
}

/** 라벨 → 기능성 원료 key. 해소 불가면 null. */
function keyOfLabel(label: string): string | null {
  const c = classify(label); if (c) return c;
  const sf = Object.values(SF_INGREDIENTS).find((i) => i.labelRe.test(label) || (i.indicatorRe?.test(label) ?? false));
  if (sf) return sf.key;
  const nf = NFK_LABELS.find((x) => x.re.test(label));
  return nf ? nf.key : null;
}

/** C lane 기능성 KO/EN 해소 — C 매핑 우선, 공용 overlay/mapFunctionEn 폴백. */
function resolveFunctionsNfk(mainFn: string): { ko: string[]; en: string[]; pending: boolean } {
  // `(가)/(나)` 항목 마커 결합 문장은 항목 단위로 분리(원문 문구 보존) — 결합 상태로는 EN 원자 매핑이 불가하다.
  const kos = [...new Set(extractFunctionsKo(mainFn).flatMap(splitHangulItems))];
  const ko: string[] = [], en: string[] = []; let pending = false;
  for (const k of kos) {
    const e = mapFunctionEnNfk(k) ?? mapFunctionEnC(k) ?? mapFunctionEn(k);
    ko.push(k); en.push(e ?? '');
    if (!e) pending = true;
  }
  if (!ko.length) pending = true;
  return { ko, en, pending };
}

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const hasMaster = new Set((await ds.query(`SELECT DISTINCT mfds_permit_number p FROM product_masters WHERE mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const funnel = { scanned: 0, inShard: 0, noBracket: 0, promoted: 0, taken: 0, masterExists: 0, dup: 0, liquid: 0, notNfkLane: 0, cUnknownLabel: 0, stillNoKey: 0, multiIngredient: 0, noMeta: 0, noFunction: 0, fnResidue: 0, fnNotOfficial: 0, foreignFn: 0, enPending: 0, composeHold: 0, specDirty: 0, guardBlock: 0, guardReview: 0, eligible: 0, target: 0 };
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
        if (stableHash(stmt) % 3 !== SHARD) continue; funnel.inShard++;
        const mf = r.fn || ''; if (BRACKET.test(mf)) continue; funnel.noBracket++;
        if (seen.has(stmt)) { funnel.dup++; continue; } seen.add(stmt);
        if (r.mid != null) { funnel.promoted++; continue; }
        if (taken.has(stmt)) { funnel.taken++; continue; }
        if (hasMaster.has(stmt)) { funnel.masterExists++; continue; }
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { funnel.liquid++; continue; }

        const base = r.base || '';
        // ── lane 한정: 공용 계약에서 키 0 + 미해소 라벨 0 인 제품(= NO_FUNCTIONAL_KEY 보류군)만 담당.
        const sp = parseSpecs(base);
        const oldKeys = new Set<string>(sp.byKey.keys());
        const oldUnresolved: string[] = [];
        for (const lb of sp.unknownLabels) {
          const sf = Object.values(SF_INGREDIENTS).find((i) => i.labelRe.test(lb) || (i.indicatorRe?.test(lb) ?? false));
          if (sf) oldKeys.add(sf.key); else oldUnresolved.push(lb);
        }
        if (oldKeys.size !== 0 || oldUnresolved.length !== 0) { funnel.notNfkLane++; continue; }

        // ── ①② 규격 항목 완전 열거 + 라벨 전량 해소
        const labels = specLabels(normalizeSpecText(base));
        const keys = new Set<string>(); const unresolved: string[] = [];
        for (const lb of labels) {
          if (isNonFunctionalLabel(lb)) continue;
          const k = keyOfLabel(lb);
          if (k) keys.add(k); else unresolved.push(lb);
        }
        if (unresolved.length) { funnel.cUnknownLabel++; H(stmt, r.name.trim(), 'C_UNKNOWN_SPEC_LABEL', { labels: [...new Set(unresolved)].slice(0, 4) }); continue; }
        const ks = [...keys];
        if (ks.length === 0) { funnel.stillNoKey++; H(stmt, r.name.trim(), 'STILL_NO_FUNCTIONAL_KEY'); continue; }
        if (ks.length >= 2) { funnel.multiIngredient++; H(stmt, r.name.trim(), 'MULTI_INGREDIENT', { keys: ks }); continue; }

        const ing = ingredientOf(ks[0]);
        if (!ing) { funnel.noMeta++; H(stmt, r.name.trim(), `NO_META:${ks[0]}`); continue; }
        const ourKey = ing.key;

        const fns = resolveFunctionsNfk(mf);
        if (!fns.ko.length) { funnel.noFunction++; H(stmt, r.name.trim(), 'NO_FUNCTION', { key: ourKey }); continue; }
        // ── 공식 기능성 누락 차단: 원문에서 추출 KO 를 모두 제거했을 때 한글 잔여가 남으면 초안이 원문을 덜 담은 것.
        const residue = fnCoverageResidue(mf, fns.ko);
        if (residue.length >= 2) { funnel.fnResidue++; H(stmt, r.name.trim(), 'FN_COVERAGE_INCOMPLETE', { key: ourKey, residue: residue.slice(0, 60) }); continue; }

        // ── ④ C 전용 key 는 공식 기능성 집합 소속 문장만 허용
        if (NFK_INGREDIENT_FN[ourKey]) {
          const off = fns.ko.filter((f) => !nfkFnBelongsTo(f, ourKey));
          if (off.length) { funnel.fnNotOfficial++; H(stmt, r.name.trim(), 'FN_NOT_OFFICIAL', { key: ourKey, fn: off.slice(0, 2) }); continue; }
        }
        // ── ⑤ foreign-fn 차단
        const foreign = fns.ko.filter((f) => !belongsAny(f, ourKey) && ALL_KEYS.some((k2) => k2 !== ourKey && belongsAny(f, k2)));
        if (foreign.length) { funnel.foreignFn++; H(stmt, r.name.trim(), 'FOREIGN_FN', { key: ourKey, fn: foreign.slice(0, 2) }); continue; }
        if (fns.pending) { funnel.enPending++; H(stmt, r.name.trim(), 'GROUNDING_PENDING_EN', { key: ourKey, miss: fns.ko.filter((_, i) => !fns.en[i]).slice(0, 2) }); continue; }

        const seed: SfSeed = {
          statementNo: stmt, candidateId: r.id, productName: r.name.trim(), manufacturer: r.maker.trim(),
          functionsKo: fns.ko, functionsEn: fns.en,
          source: { mainFunction: mf.trim(), baseStandard: base.trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() },
        };
        const c = composeSf(ing, seed);
        if ('error' in c) { funnel.composeHold++; H(stmt, seed.productName, `COMPOSE_${c.error}`, { key: ourKey }); continue; }
        const dirty = appearanceDirty(c.ko);
        if (dirty) { funnel.specDirty++; H(stmt, seed.productName, 'SPEC_APPEARANCE_DIRTY', { key: ourKey, appearance: dirty }); continue; }

        const gi = { candidateId: r.id, productName: seed.productName, productNameEn: seed.productName, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: stmt, category: 'hff',
          source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
          grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
        const g = runGuard(gi as never, { phase: 'all' });
        const blocked = g.findings.filter((f) => f.status === 'BLOCKED');
        if (blocked.length) { funnel.guardBlock++; H(stmt, seed.productName, `GUARD_BLOCKED:${blocked.map((f) => f.ruleId).join(',')}`, { key: ourKey }); continue; }
        if (g.overallStatus === 'REVIEW_REQUIRED') { funnel.guardReview++; H(stmt, seed.productName, `GUARD_REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}`, { key: ourKey }); continue; }

        funnel.eligible++;
        if (funnel.eligible <= SKIP) continue;
        distKey[ourKey] = (distKey[ourKey] ?? 0) + 1;
        target.push(gi); pool.push({ stmt, name: seed.productName, key: ourKey, fnCount: fns.ko.length });
        funnel.target++;
        if (LIMIT && target.length >= LIMIT) break outer;
      }
    }

    const chunks: number[] = [];
    for (let i = 0, b = 0; i < target.length; i += CHUNK, b++) {
      fs.writeFileSync(path.join(OUTDIR, `${PREFIX}-target-${b}.json`), JSON.stringify(target.slice(i, i + CHUNK), null, 1));
      chunks.push(Math.min(CHUNK, target.length - i));
    }
    const w = (nm: string, d: unknown): void => fs.writeFileSync(path.join(OUTDIR, `${PREFIX}-${nm}.json`), JSON.stringify(d, null, 1));
    w('pool', pool); w('hold', hold); w('selfcheck', { shard: SHARD, skip: SKIP, limit: LIMIT, funnel, distKey, holdReason, chunks });
    console.log('JSON_NFK_C_BEGIN');
    console.log(JSON.stringify({ shard: SHARD, skip: SKIP, funnel, distKey, holdReason, targetTotal: target.length, chunks }, null, 2));
    console.log('JSON_NFK_C_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
