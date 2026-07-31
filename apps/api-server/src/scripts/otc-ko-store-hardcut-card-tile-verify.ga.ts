/**
 * WO-O4O-DRUG-OTC-KO-STORE-HARDCUT-RECOVERY-V1 — `HC-CARD-SUMMARY` 250 독립검증기 (READ-ONLY · DB write 0)
 *
 * 독립성 계약: **재조립 러너도, 파생 규칙 모듈(`otc-leaflet-summary.shared.ts`)도 import 하지 않는다.**
 *   계획 원장에서 가져오는 것은 코드가 아니라 **데이터**(대상 id · 적용 전/후 해시 · 옛/새 타일 값)뿐이고,
 *   판정은 LIVE 재조회로 다시 수행한다.
 *
 * 핵심 증명(G7): LIVE 본문에서 **새 타일 값 2지점만** 옛 값으로 되돌리면 md5 가 적용 전 해시와
 *   **byte 단위로 일치**한다. 따라서 본문 6섹션·수치·연령·기간·경고 강도·footer 는 변경될 수 없다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-ko-store-hardcut-card-tile-verify.ga.ts [--port 5518] --since '2026-07-31 13:25:26+00'
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const WO = 'WO-O4O-DRUG-OTC-KO-STORE-HARDCUT-RECOVERY-V1';
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const PLAN = path.join(DATA_DIR, 'otc-ko-store-hardcut-card-tile-plan.ga.json');
const OUT = path.join(DATA_DIR, 'otc-ko-store-hardcut-card-tile-verify.ga.json');
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');

const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const KO_TERM = /[.!?。！？][)\]"'”’）］」』]?$/;
const CUT = 120;

const introFirstLine = (h: string): string | null => {
  const m = h.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  return m ? unesc(m[1].split('<br>')[0].split('\n')[0]).trim() : null;
};
const tileOf = (h: string): { raw: string; text: string } | null => {
  const m = h.match(/<span class="sd-tag">작용<\/span>\s*<p>([\s\S]*?)<\/p>/);
  return m ? { raw: m[0], text: unesc(m[1]) } : null;
};

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5518', 10);
  const since = arg('--since');
  if (!since) { console.error('--since <적용창 시작 timestamptz> 필수'); process.exit(3); }
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const rows: any[] = plan.rows;
  const byId = new Map<string, any>(rows.map((r: any) => [r.descId, r]));

  const pool = new Pool({
    host: '127.0.0.1', port, database: 'o4o_platform', max: 4,
    user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD,
  });
  await pool.query('SET default_transaction_read_only = on');
  const POP = `s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
               AND s.status='canonical' AND COALESCE(s.language,'ko')='ko'`;
  const scalar = async (sql: string, p: any[] = []): Promise<number> =>
    parseInt((await pool.query(sql, p)).rows[0].c, 10);

  const G: Record<string, { expect: number | string; actual: number | string; pass?: boolean }> = {};
  const put = (k: string, expect: number | string, actual: number | string): void => {
    G[k] = { expect, actual, pass: expect === actual };
  };

  /* G0 모집단 · 중복 */
  put('G0 KO canonical 모집단', 15908, await scalar(`SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${POP}`));
  put('G11 KO canonical 중복 master', 0, await scalar(
    `SELECT count(*)::text c FROM (SELECT master_id FROM shared_product_descriptions s WHERE ${POP} GROUP BY 1 HAVING count(*)>1) t`));
  put('G1 계획 건수', 250, rows.length);

  /* 대상 250 전건 재조회 */
  const live = (await pool.query(
    `SELECT s.id::text id, s.master_id::text mid, s.content, s.summary, s.status, s.description_type dtype,
            COALESCE(s.language,'ko') lang, s.source_type stype, s.source_ref_id::text sref, s.deleted_at,
            pm.regulatory_type rtype, pm.drug_category dcat
       FROM shared_product_descriptions s JOIN product_masters pm ON pm.id=s.master_id
      WHERE s.id = ANY($1::uuid[])`, [rows.map((r: any) => r.descId)])).rows as any[];

  let hashOk = 0, reverseOk = 0, tileIsNew = 0, badgeMatch = 0, summaryNull = 0, prefixOk = 0, termOk = 0,
    residualCut = 0, driftFields = 0, masterOk = 0, nonDrug = 0;
  const failures: any[] = [];
  for (const r of live) {
    const p = byId.get(r.id);
    const c = String(r.content);
    if (md5(c) === p.newHash) hashOk++; else failures.push({ id: r.id, code: 'HASH_MISMATCH' });

    /* G7 역패치 — 새 값 2지점만 옛 값으로 되돌리면 적용 전 해시와 byte 일치 */
    const restored = c
      .replace(`<p>${esc(p.newTile)}</p>`, `<p>${esc(p.oldTile)}</p>`)
      .replace(`<span class="sd-badge">${esc(p.newTile)}</span>`, `<span class="sd-badge">${esc(p.oldTile)}</span>`);
    if (md5(restored) === p.oldHash) reverseOk++; else failures.push({ id: r.id, code: 'REVERSE_PATCH_MISMATCH' });

    const t = tileOf(c);
    if (t && t.text === p.newTile) tileIsNew++; else failures.push({ id: r.id, code: 'TILE_NOT_NEW' });
    if (t && t.text.length === CUT) residualCut++;
    const badges = [...c.matchAll(/<span class="sd-badge">([\s\S]*?)<\/span>/g)].map((b) => unesc(b[1]));
    if (badges.includes(p.newTile)) badgeMatch++; else failures.push({ id: r.id, code: 'BADGE_NOT_SYNCED' });
    if (r.summary === null) summaryNull++; else failures.push({ id: r.id, code: 'SUMMARY_CREATED' });

    const line = introFirstLine(c);
    if (line && line.startsWith(p.newTile)) prefixOk++; else failures.push({ id: r.id, code: 'NOT_PREFIX_OF_SOURCE' });
    if (t && KO_TERM.test(t.text.trimEnd())) termOk++; else failures.push({ id: r.id, code: 'NOT_SENTENCE_TERMINATED' });

    if (r.status === 'canonical' && r.dtype === 'STORE' && r.lang === 'ko' && r.stype === 'mfds_drug_otc'
      && r.sref !== null && r.deleted_at === null) masterOk++; else driftFields++;
    if (r.rtype !== 'DRUG' || r.dcat !== 'otc') nonDrug++;
  }
  put('G2 본문 해시 = 계획 newHash', 250, hashOk);
  put('G7 역패치 복원 → 적용 전 해시 일치', 250, reverseOk);
  put('G3 대상 작용 타일 = 새 값', 250, tileIsNew);
  put('G3b 대상 120자 고정 절단 잔존', 0, residualCut);
  put('G5 hero 배지 ↔ 새 타일 동기화', 250, badgeMatch);
  put('G6 summary 컬럼 NULL 유지(요약 신규 생성 0)', 250, summaryNull);
  put('G9 새 타일이 효능 첫 줄의 접두', 250, prefixOk);
  put('G10 새 타일 문장 종결', 250, termOk);
  put('G12 상태·타입·언어·sourceRef·삭제 드리프트', 0, driftFields);
  put('G15 비의약품 master 혼입', 0, nonDrug);
  void masterOk;

  /* G4 KO 전수 — summary NULL 문서의 120자 타일 절단 잔존 0 */
  const all = (await pool.query(
    `SELECT s.id::text id, s.content, s.summary FROM shared_product_descriptions s WHERE ${POP}`)).rows as any[];
  let residualAll = 0, bodyCaution260 = 0;
  for (const r of all) {
    const t = tileOf(String(r.content));
    const line = introFirstLine(String(r.content));
    if (t && line && t.text.length === CUT && line.length > CUT && line.slice(0, CUT) === t.text) residualAll++;
    for (const ul of String(r.content).match(/<ul class="sd-warn">[\s\S]*?<\/ul>/g) || [])
      for (const li of ul.match(/<li>([\s\S]*?)<\/li>/g) || []) {
        const txt = unesc(li.replace(/<\/?li>/g, ''));
        if (txt.length === 260 && !KO_TERM.test(txt.trimEnd())) bodyCaution260++;
      }
  }
  put('G4 KO 전수 120자 타일 절단 잔존', 0, residualAll);
  /** 본문 260 절단은 이번 범위 밖 — **건드리지 않았음**을 조사 실측치(2,029)와 동일함으로 증명한다 */
  put('G8 본문 260 절단(범위 밖) 불변', 2029, bodyCaution260);

  /* G13/G14 적용 창 이후 갱신 범위 */
  put('G13 적용 창 이후 KO 갱신 총건', 250, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${POP} AND s.updated_at > $1::timestamptz`, [since]));
  put('G13b 적용 창 이후 대상 밖 KO 갱신', 0, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s WHERE ${POP} AND s.updated_at > $1::timestamptz
       AND NOT (s.id = ANY($2::uuid[]))`, [since, rows.map((r: any) => r.descId)]));
  put('G14 적용 창 이후 EN 갱신', 0, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s
      WHERE s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
        AND COALESCE(s.language,'ko')='en' AND s.updated_at > $1::timestamptz`, [since]));
  put('G14b 적용 창 이후 타 source_type 갱신', 0, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s
      WHERE s.source_type <> 'mfds_drug_otc' AND s.updated_at > $1::timestamptz`, [since]));
  put('G16 EN canonical 총건 불변', 15908, await scalar(
    `SELECT count(*)::text c FROM shared_product_descriptions s
      WHERE s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='en'`));
  await pool.end();

  const failed = Object.entries(G).filter(([, v]) => !v.pass);
  const report = {
    wo: WO, kind: 'card-tile-verify', mode: 'READ-ONLY', since,
    planDigest: plan.planDigest, gates: G, failedGates: failed.length,
    failures: failures.slice(0, 50), pass: failed.length === 0 && failures.length === 0,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 2;
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
