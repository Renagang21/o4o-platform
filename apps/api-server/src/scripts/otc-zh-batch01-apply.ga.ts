/**
 * OTC 중국어(zh) 배치 01 — 조립 · 자동 검증 · DB 적용 (dry-run / apply)
 *
 * 번역 채널: **Claude Code 에이전트 직접 번역**. 외부 번역 API·DeepSeek 환경을 사용하지 않는다.
 *   번역 결과는 고유 KO 유닛별 결정적 대응표 `data/otc-zh-unit-map.ga.json` 에만 존재하며,
 *   같은 KO 문장은 문서가 달라도 항상 같은 중국어 문장으로 치환된다(재현 가능).
 *
 * 조립: KO canonical HTML 을 템플릿으로 두고 **텍스트 노드만** 치환한다(`otc-zh-slots.ga.ts`).
 *   태그·class·순서를 건드리지 않으므로 표준 디자인이 그대로 계승된다.
 *   슬롯이 하나라도 미해결이면 그 문서는 생성하지 않고 HOLD(부분 번역 금지).
 *
 * 자동 검증 게이트(전건 통과분만 저장):
 *   G1 STRUCTURE   — 텍스트를 제거한 태그 골격이 KO 와 byte 일치
 *   G2 NO_HANGUL   — 산출물에 한글 잔존 0
 *   G3 NUMERIC     — 슬롯별 수치 보존: 누락 0(예외: `1일`·`1회` 의 1 은 중국어 每日/每次 에 흡수),
 *                    신설/증식 0 → 수치·연령·횟수·기간·함량이 구조적으로 바뀔 수 없다
 *   G4 SLOT_COUNT  — 텍스트 슬롯 개수가 KO 와 동일(누락·중복 0)
 *   G5 NONEMPTY    — 빈 번역 0
 *
 * 길이 정책: 글자 수 제한·축약·요약·문장 절단 없음(2026-08).
 * 저장: language='zh', description_type='STORE', status='canonical', source_type/source_ref_id 는 KO 승계.
 *   canonical 중복은 부분 유니크 인덱스가 구조적으로 차단하며 INSERT 는 `WHERE NOT EXISTS` 로 멱등.
 * 대상 밖 write 금지: KO·EN·타 언어(ja 포함)·ProductMaster 무변경. 이 스크립트는 INSERT 만 수행한다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { LANG } from './otc-zh-batch01-frame-glossary.ga.js';
import { slots, substitute, uid, T, type Slot } from './otc-zh-slots.ga.js';
import { frameLookup } from './otc-zh-frame.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const APPLY = process.argv.includes('--apply') && process.env.OTC_ZH_APPLY === 'CONFIRM';

const rawMap = JSON.parse(fs.readFileSync(P('otc-zh-unit-map.ga.json'), 'utf8'));
const unitMap: Record<string, { ko: string; zh: string; kind: string }> = rawMap.units;

/* ── G3 수치 보존 ───────────────────────────────────────────────────────────── */
const nums = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
const counts = (a: string[]): Map<string, number> => a.reduce((m, v) => m.set(v, (m.get(v) || 0) + 1), new Map<string, number>());
/**
 * 흡수 허용 — 중국어 어휘가 한국어 수사를 삼키는 두 경우만 좁게 허용한다.
 *   · `1일`·`1회` 의 1 → 每日 / 每次
 *   · `N차성` 의 N   → 原发性 / 继发性 (서수 표현이 한자어에 흡수)
 * 그 외의 수치(함량·연령·횟수·기간·상한)는 누락도 신설도 허용하지 않는다.
 */
function absorbable(ko: string): Map<string, number> {
  const s = ko.replace(/\s+/g, ''), m = new Map<string, number>();
  const add = (v: string): void => { m.set(v, (m.get(v) || 0) + 1); };
  for (const x of s.match(/1(?=[일회])/g) || []) add(x);
  for (const x of s.match(/\d+(?=차성)/g) || []) add(x);
  return m;
}
export function numericCheck(ko: string, zh: string): string | null {
  const k = counts(nums(ko)), z = counts(nums(zh)), allow = absorbable(ko);
  for (const [v, n] of k) {
    const deficit = n - (z.get(v) || 0);
    if (deficit <= 0) continue;
    if (deficit <= (allow.get(v) || 0)) continue;
    return `MISSING_NUMBER:${v}`;
  }
  for (const [v, n] of z) if (n > (k.get(v) || 0)) return `INVENTED_NUMBER:${v}`;
  return null;
}

function composeZh(html: string): { zh: string; missing: Slot[]; numeric: string[] } {
  const numeric: string[] = [];
  const { out, missing } = substitute(html, (s) => {
    const z = frameLookup(s.kind, s.text) ?? unitMap[uid(s.kind, s.text)]?.zh ?? null;
    if (z) { const e = numericCheck(s.text, z); if (e) numeric.push(`${s.kind}|${e}|${s.text.slice(0, 60)}`); }
    return z;
  });
  return { zh: out, missing, numeric };
}

const skeleton = (h: string): string => h.replace(/>[^<]*</g, '><').replace(/^[^<]*/, '').replace(/[^>]*$/, '');

async function main(): Promise<void> {
  const man = JSON.parse(fs.readFileSync(P('otc-zh-batch01-manifest.ga.json'), 'utf8')).manifest as any[];
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5668', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });

  const ko = new Map<string, any>();
  const ids = man.map((m) => m.koId);
  for (let i = 0; i < ids.length; i += 500)
    for (const r of (await pool.query(
      `SELECT id::text id, master_id::text mid, content, source_type, source_ref_id::text srid
         FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids.slice(i, i + 500)])).rows) ko.set(r.id, r);

  const plans: any[] = [], holds: any[] = [], fails: any[] = [];
  const missKind: Record<string, number> = {};
  for (const m of man) {
    const r = ko.get(m.koId);
    if (!r) { holds.push({ koId: m.koId, code: 'KO_ROW_NOT_FOUND' }); continue; }
    const src = String(r.content);
    const c = composeZh(src);
    if (c.missing.length) {
      for (const x of c.missing) missKind[x.kind] = (missKind[x.kind] || 0) + 1;
      holds.push({ koId: m.koId, masterId: r.mid, code: 'UNRESOLVED_SLOT', missing: c.missing.length });
      continue;
    }
    const gates: string[] = [];
    if (skeleton(c.zh) !== skeleton(src)) gates.push('G1_STRUCTURE');
    if (/[가-힣]/.test(c.zh)) gates.push('G2_NO_HANGUL');
    if (c.numeric.length) gates.push('G3_NUMERIC');
    if (slots(c.zh).length !== slots(src).length) gates.push('G4_SLOT_COUNT');
    if (slots(c.zh).some((s) => !s.text.trim())) gates.push('G5_NONEMPTY');
    if (gates.length) {
      fails.push({ koId: m.koId, masterId: r.mid, gates, numeric: c.numeric.slice(0, 4),
        hangul: (c.zh.match(/[^<>]{0,40}[가-힣][^<>]{0,40}/g) || []).slice(0, 4) });
      continue;
    }
    const intro = c.zh.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
    const badge = c.zh.match(/<span class="sd-badge[^"]*">([\s\S]*?)<\/span>/);
    const first = c.zh.match(/<p>(?:<strong>[\s\S]*?<\/strong>)?([\s\S]*?)<\/p>/);
    plans.push({ koId: m.koId, masterId: r.mid, product: m.productName, sourceType: r.source_type,
      sourceRefId: r.srid, content: c.zh, summary: T((intro || badge || first || ['', ''])[1]) || null });
  }

  const results: any[] = [];
  if (APPLY) for (const p of plans) {
    const q = await pool.query(
      `INSERT INTO shared_product_descriptions
         (master_id, description_type, status, language, source_type, source_ref_id, content, summary, created_at, updated_at)
       SELECT $1::uuid, 'STORE', 'canonical', $2::varchar, $3, $4::uuid, $5, $6, now(), now()
        WHERE NOT EXISTS (
          SELECT 1 FROM shared_product_descriptions z
           WHERE z.master_id = $1::uuid AND z.description_type = 'STORE' AND z.status = 'canonical'
             AND COALESCE(z.language, 'ko') = $2::varchar AND z.deleted_at IS NULL)
       RETURNING id::text id`,
      [p.masterId, LANG, p.sourceType, p.sourceRefId, p.content, p.summary]);
    results.push({ masterId: p.masterId, status: q.rowCount === 1 ? 'INSERTED' : 'ALREADY_EXISTS', zhId: q.rows[0]?.id ?? null });
  }
  await pool.end();

  const summary = {
    mode: APPLY ? 'APPLY' : 'dry-run', lang: LANG, batch: 'zh-batch-01',
    mappedUnits: Object.keys(unitMap).length,
    docsScanned: man.length, planned: plans.length,
    hold: holds.length, holdByCode: holds.reduce((a: any, h) => { a[h.code] = (a[h.code] || 0) + 1; return a; }, {}),
    unresolvedSlotOccByKind: missKind,
    gateFailed: fails.length, gateFailByCode: fails.flatMap((f) => f.gates).reduce((a: any, g) => { a[g] = (a[g] || 0) + 1; return a; }, {}),
    inserted: results.filter((r) => r.status === 'INSERTED').length,
    alreadyExists: results.filter((r) => r.status === 'ALREADY_EXISTS').length,
  };
  const out = { summary, fails: fails.slice(0, 50), holdSample: holds.slice(0, 20),
    plans: plans.map(({ content, ...p }) => ({ ...p, bytes: content.length })), results };
  fs.writeFileSync(P(`otc-zh-batch01-${APPLY ? 'apply' : 'dryrun'}.ga.json`), JSON.stringify(out, null, 1) + '\n', 'utf8');
  if (!APPLY && plans.length) fs.writeFileSync(P('otc-zh-batch01-sample.ga.html'), plans[0].content, 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
