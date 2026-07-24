/**
 * WO-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-C-V1 — Agent C 미등록 원료 build (DB write 0).
 *
 * 대상: shard2(`stableHash(STTEMNT_NO)%3===2`) 미승격·미선점 후보 중, **공용 registry 에 없어서**
 *       한 번도 생산되지 못한 실재 기능성 원료 제품(단백질·칼륨·크레아틴·철(bare)·알로에 전잎·빌베리·프로바이오틱스 변형 등).
 *
 * 귀속 계약 — 직전 WO(NO_FUNCTIONAL_KEY) 계약을 그대로 승계하고 미등록 원료 mapping 만 additive 로 얹는다.
 *   ① BASE_STANDARD 규격 항목 전수 열거. 각 라벨은 비기능 규격 / 공용 classify / 공용 SF / C 전용 NFK / C 전용 UIR
 *      중 하나로 **반드시 해소**되어야 하며, 하나라도 미해소면 HOLD → «선언됐는데 못 본 원료» 불가.
 *   ② 해소된 기능성 키가 **정확히 1종**일 때만 생산(0/2+ HOLD).
 *   ③ **본 WO lane 한정** — 라벨 중 최소 1개가 UIR mapping 으로만 해소되는 제품만 담당(기존 lane 과 중복 처리 방지).
 *   ④ 공식 기능성 집합 게이트 — key 에 공식 FN 집합이 있으면 추출 KO 전량이 그 집합에 속해야 한다.
 *   ⑤ foreign-fn 차단 · ⑥ 커버리지 잔여 차단(공식 기능성 누락) · ⑦ EN 미매핑 전량 HOLD(임의 영문 생성 0).
 *   ⑧ 공식 기능성·질환명·증상명 삭제·순화 없음. 원문 밖 치료·예방 주장 미생성. 전문가 상담 footer 유지.
 *
 * 공용 파일 무수정: `hff-source-parse` · `hff-sf-registry` · `hff-nutrient-registry` · `hff-sf-compose` ·
 *                  `content-guard` · `hff-sf-apply` 재사용만.
 *
 *   PROXY_PORT=5462 npx tsx src/scripts/hff-uir-c-build.ts --out <dir> [--shard 2] [--limit N] [--chunk 250] [--skip N] [--prefix uir-c]
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { normalizeSpecText, classify } from './hff-source-parse.js';
import type { SfIngredient } from './hff-sf-registry.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';
import { mapFunctionEnC } from './hff-sf-c-en-overlay.js';
import { NUTRIENT_META, FUNCTIONAL_META, fnBelongsTo, mapFunctionEn } from './hff-nutrient-registry.js';
import { composeSf, type SfSeed } from './hff-sf-compose.js';
import { specLabels, isNonFunctionalLabel, NFK_LABELS, NFK_INGREDIENTS, NFK_INGREDIENT_FN, nfkFnBelongsTo, mapFunctionEnNfk, splitHangulItems, fnCoverageResidue } from './hff-nfk-c-registry.js';
import { UIR_LABELS, UIR_INGREDIENTS, UIR_INGREDIENT_FN, uirFnBelongsTo, extractFunctionsUir, mapFunctionEnUir } from './hff-uir-c-registry.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

function ingredientOf(key: string): SfIngredient | null {
  if (UIR_INGREDIENTS[key]) return UIR_INGREDIENTS[key];
  if (NFK_INGREDIENTS[key]) return NFK_INGREDIENTS[key];
  const sf = Object.values(SF_INGREDIENTS).find((i) => i.key === key);
  if (sf) return sf;
  const meta = FUNCTIONAL_META[key] ?? NUTRIENT_META[key];
  if (!meta) return null;
  return { key: meta.key, slug: meta.slug, displayKo: meta.displayKo, displayEn: meta.displayEn, labelRe: /$^/, statusHint: 'READY' };
}

const REG_KEYS = [...new Set([...Object.keys(NUTRIENT_META), ...Object.keys(FUNCTIONAL_META)])];
function belongsAny(fn: string, key: string): boolean { return fnBelongsTo(fn, key) || nfkFnBelongsTo(fn, key) || uirFnBelongsTo(fn, key); }
const ALL_KEYS = [...new Set([...REG_KEYS, ...Object.keys(NFK_INGREDIENT_FN), ...Object.keys(UIR_INGREDIENT_FN)])];
/** 공식 FN 집합 보유 key 인가 (있으면 전량 소속 강제) */
function officialFnSetOf(key: string): boolean { return Boolean(UIR_INGREDIENT_FN[key] || NFK_INGREDIENT_FN[key]); }
function inOfficialFnSet(fn: string, key: string): boolean { return uirFnBelongsTo(fn, key) || nfkFnBelongsTo(fn, key); }

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const SHARD = parseInt(arg('shard', '2'), 10);
const LIMIT = parseInt(arg('limit', '0'), 10) || 0;
const SKIP = parseInt(arg('skip', '0'), 10) || 0;
const CHUNK = parseInt(arg('chunk', '250'), 10);
const PREFIX = arg('prefix', 'uir-c');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5462', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const SPEC_DIRT = /표시량|이하\b|mg\/kg|음성|[:：]/;
function appearanceDirty(koHtml: string): string | null {
  const m = koHtml.match(/<b>성상<\/b>([\s\S]*?)<\/div>/);
  if (!m) return null;
  const txt = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return SPEC_DIRT.test(txt) ? txt.slice(0, 120) : null;
}

/** 라벨 → key. `viaUir` = 본 WO 의 additive mapping 으로만 해소된 라벨인지. */
function keyOfLabel(label: string): { key: string; viaUir: boolean } | null {
  const c = classify(label); if (c) return { key: c, viaUir: false };
  const sf = Object.values(SF_INGREDIENTS).find((i) => i.labelRe.test(label) || (i.indicatorRe?.test(label) ?? false));
  if (sf) return { key: sf.key, viaUir: false };
  const nf = NFK_LABELS.find((x) => x.re.test(label));
  if (nf) return { key: nf.key, viaUir: false };
  const u = UIR_LABELS.find((x) => x.re.test(label));
  return u ? { key: u.key, viaUir: true } : null;
}

/** 비기능 규격 라벨 판정 — 원문 표기의 공백 변형(`성 상`)까지 흡수. */
function nonFunctional(label: string): boolean {
  return isNonFunctionalLabel(label) || isNonFunctionalLabel(label.replace(/\s+/g, ''));
}

/** 기능성 KO/EN 해소 — UIR 추출기(«…에 필요» 형 포함) + UIR→NFK→C overlay→공용 EN 폴백. */
function resolveFunctionsUir(mainFn: string): { ko: string[]; en: string[]; pending: boolean } {
  const kos = [...new Set(extractFunctionsUir(mainFn).flatMap(splitHangulItems))];
  const ko: string[] = [], en: string[] = []; let pending = false;
  for (const k of kos) {
    const e = mapFunctionEnUir(k) ?? mapFunctionEnNfk(k) ?? mapFunctionEnC(k) ?? mapFunctionEn(k);
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

    const funnel = { scanned: 0, inShard: 0, promoted: 0, taken: 0, masterExists: 0, dup: 0, liquid: 0, unknownLabel: 0, noKey: 0, multiIngredient: 0, notUirLane: 0, noMeta: 0, noFunction: 0, fnResidue: 0, fnNotOfficial: 0, foreignFn: 0, enPending: 0, composeHold: 0, specDirty: 0, guardBlock: 0, guardReview: 0, eligible: 0, target: 0 };
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
        if (seen.has(stmt)) { funnel.dup++; continue; } seen.add(stmt);
        if (r.mid != null) { funnel.promoted++; continue; }
        if (taken.has(stmt)) { funnel.taken++; continue; }
        if (hasMaster.has(stmt)) { funnel.masterExists++; continue; }
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { funnel.liquid++; continue; }

        const mf = r.fn || ''; const base = r.base || '';
        // ── ① 규격 항목 완전 열거 + 라벨 전량 해소
        const labels = specLabels(normalizeSpecText(base));
        const keys = new Set<string>(); const unresolved: string[] = []; let viaUir = false;
        for (const lb of labels) {
          if (nonFunctional(lb)) continue;
          const k = keyOfLabel(lb);
          if (!k) { unresolved.push(lb); continue; }
          keys.add(k.key); if (k.viaUir) viaUir = true;
        }
        if (unresolved.length) { funnel.unknownLabel++; H(stmt, r.name.trim(), 'UNKNOWN_SPEC_LABEL', { labels: [...new Set(unresolved)].slice(0, 4) }); continue; }
        const ks = [...keys];
        if (ks.length === 0) { funnel.noKey++; H(stmt, r.name.trim(), 'NO_FUNCTIONAL_KEY'); continue; }
        if (ks.length >= 2) { funnel.multiIngredient++; H(stmt, r.name.trim(), 'MULTI_INGREDIENT', { keys: ks }); continue; }
        // ── ③ 본 WO lane 한정
        if (!viaUir) { funnel.notUirLane++; continue; }

        const ing = ingredientOf(ks[0]);
        if (!ing) { funnel.noMeta++; H(stmt, r.name.trim(), `NO_META:${ks[0]}`); continue; }
        const ourKey = ing.key;

        const fns = resolveFunctionsUir(mf);
        if (!fns.ko.length) { funnel.noFunction++; H(stmt, r.name.trim(), 'NO_FUNCTION', { key: ourKey }); continue; }
        // ── ⑥ 공식 기능성 누락 차단
        const residue = fnCoverageResidue(mf, fns.ko);
        if (residue.length >= 2) { funnel.fnResidue++; H(stmt, r.name.trim(), 'FN_COVERAGE_INCOMPLETE', { key: ourKey, residue: residue.slice(0, 60) }); continue; }
        // ── ④ 공식 기능성 집합 게이트
        if (officialFnSetOf(ourKey)) {
          const off = fns.ko.filter((f) => !inOfficialFnSet(f, ourKey));
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
    console.log('JSON_UIR_C_BEGIN');
    console.log(JSON.stringify({ shard: SHARD, skip: SKIP, funnel, distKey, holdReason, targetTotal: target.length, chunks }, null, 2));
    console.log('JSON_UIR_C_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
