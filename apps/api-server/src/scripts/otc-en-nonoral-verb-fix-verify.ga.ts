/**
 * WO-O4O-DRUG-OTC-EN-NONORAL-VERB-SOURCE-ADJUDICATION-AND-MINIMAL-FIX-V1
 *   — 교정 독립검증기 (READ-ONLY · DB write 0)
 *
 * 독립성 계약: **교정 러너도, 판정기도 import 하지 않는다.**
 *   계획 원장에서 가져오는 것은 코드가 아니라 데이터(대상 id · 적용 전/후 해시 · 옛/새 문장)뿐이고,
 *   판정은 LIVE 재조회로 다시 수행한다.
 *
 * 핵심 증명(G4): LIVE 본문에서 **새 문장만** 옛 문장으로 되돌리면 md5 가 적용 전 해시와
 *   byte 단위로 일치한다 → 대상 문장 외 본문·다른 섹션은 변경될 수 없다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-en-nonoral-verb-fix-verify.ga.ts [--port 5530] --since '2026-07-31 14:20:34+00'
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const WO = 'WO-O4O-DRUG-OTC-EN-NONORAL-VERB-SOURCE-ADJUDICATION-AND-MINIMAL-FIX-V1';
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 확정 오역 문형 — 교정 후 **이 형태가 남아 있으면 실패**다 */
const INVALID_PATTERNS = [
  /\bBefore taking this (?:medicine|drug)\b/i,
  /\b(?:must|should) not take this (?:medicine|drug)\b/i,
  /\bstop taking (?:it|this (?:medicine|drug))\b/i,
  /\bDo not take this (?:medicine|drug) together with\b/i,
  /\bIf you take (?:this (?:medicine|drug)|it) (?:by mistake|together with)\b/i,
];
/** 숫자·연령·기간·용량 토큰 — 교정 전후 완전 동일해야 한다 */
const NUM_TOKENS = /\d+(?:[.,]\d+)?\s*(?:mg|g|mL|ml|%|years?|months?|weeks?|days?|hours?|times?|drops?)?/gi;

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5530', 10);
  const since = arg('--since');
  if (!since) { console.error('--since <적용창 시작 timestamptz> 필수'); process.exit(3); }
  const plan = JSON.parse(fs.readFileSync(P('otc-en-nonoral-verb-fix-plan.ga.json'), 'utf8'));
  const rows: any[] = plan.rows;

  const pool = new Pool({
    host: '127.0.0.1', port, database: 'o4o_platform', max: 4,
    user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD,
  });
  await pool.query('SET default_transaction_read_only = on');
  const scalar = async (sql: string, p: any[] = []): Promise<number> => parseInt((await pool.query(sql, p)).rows[0].c, 10);

  const G: Record<string, { expect: number; actual: number; pass?: boolean }> = {};
  const put = (k: string, expect: number, actual: number): void => { G[k] = { expect, actual, pass: expect === actual }; };
  const failures: any[] = [];

  const EN = `s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
              AND s.status='canonical' AND s.language='en'`;
  const KO = EN.replace("s.language='en'", "COALESCE(s.language,'ko')='ko'");

  put('G0 EN canonical 총건', 15908, await scalar(`SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${EN}`));
  put('G0b KO canonical 총건', 15908, await scalar(`SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${KO}`));
  put('G1 계획 설명서 수', 49, rows.length);
  put('G1b 계획 문장 수', 69, rows.reduce((t: number, r: any) => t + r.edits.length, 0));
  put('G14 EN canonical 중복 master', 0, await scalar(
    `SELECT count(*)::text c FROM (SELECT master_id FROM shared_product_descriptions s WHERE ${EN} GROUP BY 1 HAVING count(*)>1) t`));

  const live = (await pool.query(
    `SELECT s.id::text id, s.master_id::text mid, s.content, s.status, s.description_type dtype,
            s.language lang, s.source_type stype, s.source_ref_id::text sref, s.deleted_at
       FROM shared_product_descriptions s WHERE s.id = ANY($1::uuid[])`, [rows.map((r: any) => r.descId)])).rows as any[];
  const liveBy = new Map(live.map((r) => [r.id, r]));

  let hashOk = 0, reverseOk = 0, oldGone = 0, newPresent = 0, noInvalid = 0, numOk = 0, structOk = 0, fieldOk = 0, noHangul = 0;
  let editTotal = 0;
  for (const r of rows) {
    const cur = liveBy.get(r.descId);
    if (!cur) { failures.push({ descId: r.descId, code: 'ROW_MISSING' }); continue; }
    const c = String(cur.content);
    if (md5(c) === r.newHash) hashOk++; else failures.push({ descId: r.descId, code: 'HASH_MISMATCH' });

    /* G4 역패치 — 새 문장만 옛 문장으로 되돌리면 적용 전 해시와 byte 일치 */
    let restored = c;
    for (let i = r.edits.length - 1; i >= 0; i--) restored = restored.replace(esc(r.edits[i].new), esc(r.edits[i].old));
    if (md5(restored) === r.oldHash) reverseOk++; else failures.push({ descId: r.descId, code: 'REVERSE_PATCH_MISMATCH' });

    for (const e of r.edits) {
      editTotal++;
      if (!c.includes(esc(e.old))) oldGone++; else failures.push({ descId: r.descId, code: 'OLD_SENTENCE_REMAINS' });
      if (c.split(esc(e.new)).length - 1 === 1) newPresent++; else failures.push({ descId: r.descId, code: 'NEW_SENTENCE_NOT_UNIQUE' });
    }
    if (!INVALID_PATTERNS.some((p) => p.test(c))) noInvalid++; else failures.push({ descId: r.descId, code: 'INVALID_PATTERN_REMAINS' });

    /* G9 숫자·연령·기간 토큰 드리프트 0 (적용 전 본문 = 역패치 복원본) */
    const a = (restored.match(NUM_TOKENS) || []).join('|'), b = (c.match(NUM_TOKENS) || []).join('|');
    if (a === b) numOk++; else failures.push({ descId: r.descId, code: 'NUMERIC_TOKEN_DRIFT' });

    const cnt = (h: string, re: RegExp): number => (h.match(re) || []).length;
    if (cnt(restored, /<h2>/g) === cnt(c, /<h2>/g) && cnt(restored, /<li>/g) === cnt(c, /<li>/g)
      && ['sd-card', 'sd-hero', 'sd-intro', 'sd-core', 'sd-warn'].every((m) => restored.includes(m) === c.includes(m))) structOk++;
    else failures.push({ descId: r.descId, code: 'STRUCTURE_DRIFT' });

    if (cur.status === 'canonical' && cur.dtype === 'STORE' && cur.lang === 'en' && cur.stype === 'mfds_drug_otc'
      && cur.sref !== null && cur.deleted_at === null && cur.mid === r.masterId) fieldOk++;
    else failures.push({ descId: r.descId, code: 'FIELD_DRIFT' });
    if (!/[가-힣]/.test(c)) noHangul++; else failures.push({ descId: r.descId, code: 'HANGUL_IN_EN' });
  }
  put('G2 본문 해시 = 계획 newHash', 49, hashOk);
  put('G4 역패치 복원 → 적용 전 해시 일치', 49, reverseOk);
  put('G3 옛 문장 소거', 69, oldGone);
  put('G3b 새 문장 유일 존재', 69, newPresent);
  put('G5 확정 오역 문형 잔존 문서', 0, 49 - noInvalid);
  put('G9 숫자·연령·기간 토큰 드리프트', 0, 49 - numOk);
  put('G10 구조(h2·li·sd-*) 드리프트', 0, 49 - structOk);
  put('G11 상태·타입·언어·sourceRef·master 드리프트', 0, 49 - fieldOk);
  put('G12 EN 본문 한글 혼입', 0, 49 - noHangul);
  put('G1c 편집 문장 총수', 69, editTotal);

  /* 적용 창 범위 */
  put('G6 적용 창 이후 EN 갱신 총건', 49, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${EN} AND s.updated_at > $1::timestamptz`, [since]));
  put('G6b 적용 창 이후 대상 밖 EN 갱신', 0, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${EN} AND s.updated_at > $1::timestamptz
       AND NOT (s.id = ANY($2::uuid[]))`, [since, rows.map((r: any) => r.descId)]));
  put('G7 적용 창 이후 KO 갱신', 0, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${KO} AND s.updated_at > $1::timestamptz`, [since]));
  put('G7b 적용 창 이후 타 언어 갱신', 0, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s
      WHERE COALESCE(s.language,'ko') NOT IN ('ko','en') AND s.updated_at > $1::timestamptz`, [since]));
  put('G7c 적용 창 이후 타 source_type 갱신', 0, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s
      WHERE s.source_type <> 'mfds_drug_otc' AND s.updated_at > $1::timestamptz`, [since]));
  await pool.end();

  const failed = Object.entries(G).filter(([, v]) => !v.pass);
  const report = {
    wo: WO, kind: 'en-verb-fix-verify', mode: 'READ-ONLY', since, planDigest: plan.planDigest,
    gates: G, failedGates: failed.length, failures: failures.slice(0, 50),
    pass: failed.length === 0 && failures.length === 0,
  };
  fs.writeFileSync(P('otc-en-nonoral-verb-fix-verify.ga.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ...report, gates: Object.fromEntries(Object.entries(G).map(([k, v]) => [k, `${v.actual}/${v.expect} ${v.pass ? 'PASS' : 'FAIL'}`])) }, null, 2));
  if (!report.pass) process.exitCode = 2;
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
