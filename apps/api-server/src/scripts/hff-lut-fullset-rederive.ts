/**
 * READ-ONLY — single-lutein 파일럿 31건 verifiedFullSet **재산출**(하드닝 파서). DB write 0.
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-lut-fullset-rederive.ts --queue <lut31.json> --out <out.json>
 *
 * 파서 = `hff-source-parse.ts` (생산 select 와 동일 모듈).
 * 산출: BASE spec / MAIN_FNCTN attributed / verifiedFullSet / 근거 원문 / PASS·REVIEW / 큐 diff.
 *
 * PASS 조건(전부 충족):
 *   - 기능성 귀속이 **명시 구조**(bracket|numbered|colon) — 인라인 추정 금지
 *   - 미분류 라벨 0
 *   - 비타민E 가 '항산화 단독' 로 fullSet 소속을 좌우하지 않음(정책 미확정 → REVIEW)
 * 그 외 전부 REVIEW. **근거 없는 자동 확정 금지.**
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import { parseSpecs, parseFnAttribution } from './hff-source-parse.js';

const arg = (n: string): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : ''; };
const QUEUE = arg('queue'); const OUT = arg('out');
if (!QUEUE || !OUT) throw new Error('--queue --out 필요');
const sig = (s: Iterable<string>): string => [...new Set(s)].sort().join('+');
const ANTIOX = /항산화|유해산소|세포를\s*보호/;

async function main(): Promise<void> {
  const rows = JSON.parse(fs.readFileSync(QUEUE, 'utf8')) as Array<{ statementNo: string; productName: string; verifiedFullSet: string[] }>;
  const stmts = rows.map((r) => String(r.statementNo));
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5433', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, ssl: false, extra: { max: 2, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    const src: Array<{ stmt: string; base: string; fn: string }> = await ds.query(
      `SELECT raw_payload->'source'->>'STTEMNT_NO' stmt, raw_payload->'source'->>'BASE_STANDARD' base, raw_payload->'source'->>'MAIN_FNCTN' fn
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1)`, [stmts]);
    const byStmt = new Map(src.map((s) => [s.stmt, s]));

    const out: Array<Record<string, unknown>> = [];
    let pass = 0, review = 0, changed = 0;
    const groupsPass: Record<string, number> = {}; const reasonCount: Record<string, number> = {};
    for (const r of rows) {
      const s = byStmt.get(String(r.statementNo));
      if (!s) { out.push({ stmt: r.statementNo, verdict: 'REVIEW', reasons: ['SOURCE_MISSING'] }); review++; reasonCount['SOURCE_MISSING'] = (reasonCount['SOURCE_MISSING'] ?? 0) + 1; continue; }
      const sp = parseSpecs(s.base || '');
      const fa = parseFnAttribution(s.fn || '');
      const specKeys = [...sp.byKey.keys()]; const fnKeys = [...fa.byKey.keys()];
      const verified = specKeys.filter((k) => fa.byKey.has(k));
      const specOnly = specKeys.filter((k) => !fa.byKey.has(k));
      const fnOnly = fnKeys.filter((k) => !sp.byKey.has(k));

      const reasons: string[] = [];
      // 명시 구조 3형식(bracket|numbered|colon) 인정 — colon 은 원문 `원료 : 기능성` 라벨로 추정 귀속이 아니다.
      if (fa.mode !== 'bracket' && fa.mode !== 'numbered' && fa.mode !== 'colon') reasons.push(`FN_MODE_${fa.mode.toUpperCase()}`);
      if (sp.unknownLabels.length) reasons.push('SPEC_UNKNOWN_LABEL');
      if (fa.unknownLabels.length) reasons.push('FN_UNKNOWN_LABEL');
      // 비타민E 항산화 단독 → 정책 미확정이므로 자동 포함/제외 금지
      const eFns = fa.byKey.get('비타민E') ?? [];
      if (verified.includes('비타민E') && eFns.length > 0 && eFns.every((f) => ANTIOX.test(f))) reasons.push('E_ANTIOXIDANT_ONLY');
      if (fnOnly.length) reasons.push('FN_WITHOUT_SPEC');

      const verdict = reasons.length ? 'REVIEW' : 'PASS';
      if (verdict === 'PASS') { pass++; groupsPass[sig(verified)] = (groupsPass[sig(verified)] ?? 0) + 1; } else { review++; }
      for (const x of reasons) reasonCount[x] = (reasonCount[x] ?? 0) + 1;
      const queueSig = sig(r.verifiedFullSet); const newSig = sig(verified);
      if (queueSig !== newSig) changed++;

      out.push({
        stmt: r.statementNo, productName: r.productName, verdict, reasons,
        queueFullSet: queueSig, rederivedFullSet: newSig, changedVsQueue: queueSig !== newSig,
        specKeys: sig(specKeys), fnAttributedKeys: sig(fnKeys), fnMode: fa.mode,
        specOnly: sig(specOnly), fnOnly: sig(fnOnly),
        evidence: {
          specs: Object.fromEntries([...sp.byKey].map(([k, v]) => [k, v.evidence])),
          functions: Object.fromEntries([...fa.byKey].map(([k, v]) => [k, v])),
          unknownSpecLabels: sp.unknownLabels, unknownFnLabels: fa.unknownLabels,
        },
      });
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
    console.log('JSON_REDERIVE_BEGIN');
    console.log(JSON.stringify({ target: rows.length, PASS: pass, REVIEW: review, changedVsQueue: changed, passGroups: groupsPass, reviewReasons: reasonCount, out: OUT }, null, 2));
    console.log('JSON_REDERIVE_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
