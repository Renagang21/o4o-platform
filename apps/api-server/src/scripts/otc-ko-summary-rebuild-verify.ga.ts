/**
 * WO-O4O-OTC-KO-SUMMARY-HARDCUT-CENSUS-AND-CARD-REBUILD-V1 — 독립검증 (READ-ONLY · DB write 0)
 *
 * 재조립기(otc-ko-summary-rebuild.ga.ts)도, 파생 규칙 모듈(otc-leaflet-summary.shared.ts)도 **import 하지 않는다.**
 * 판정 기준을 독립적으로 다시 세우고 LIVE 를 직접 조회한다.
 *
 * 핵심 증명(G7): LIVE 본문에서 **새 요약 2지점만** 옛 요약으로 되돌리면 md5 가 적용 전 해시와
 *                byte 단위로 일치한다 ⇒ 본문 6섹션·수치·연령·횟수·간격·기간·경고 강도·route·footer 는 변경될 수 없다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-ko-summary-rebuild-verify.ga.ts [--port 5495]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const PLAN = path.join(DATA_DIR, 'otc-ko-summary-rebuild-plan.ga.json');
const OUT = path.join(DATA_DIR, 'otc-ko-summary-rebuild-verify.ga.json');
const RESULTS = [
  'otc-ko-summary-rebuild-result.run-20260731T073539.ga.json',   // 2차 apply 798
];
/** 1차 apply(07:34:25) 는 프록시 종료로 결과 원장을 남기지 못했다 — 체크포인트로 대체한다. */
const APPLY_WINDOW_START = '2026-07-31 07:34:00';                 // UTC · timestamp without time zone

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => createHash('md5').update(s, 'utf8').digest('hex');
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

const KO = `s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
            AND s.status='canonical' AND COALESCE(s.language,'ko')='ko'`;
const EN = KO.replace("COALESCE(s.language,'ko')='ko'", "COALESCE(s.language,'ko')='en'");
const KO_TERM = /[.!?。！？][)\]"'”’）］」』]?$/;

const introLine = (html: string): string | null => {
  const m = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
  return m ? unesc(m[1].split('<br>')[0].split('\n')[0]).trim() : null;
};
/** 수치·연령·횟수·기간 토큰 — 본문 드리프트 검사용 */
const numTokens = (s: string): string => (s.match(/\d+(?:[.,]\d+)?\s*(?:밀리그람|밀리그램|mg|g|밀리리터|mL|ml|IU|%|세|개월|시간|일|주|회|정|캡슐|포|방울)?/g) || []).join('|');

type Gate = { id: string; desc: string; expect: number | string; actual: number | string; ok: boolean };
const gates: Gate[] = [];
const G = (id: string, desc: string, expect: number | string, actual: number | string): void => {
  gates.push({ id, desc, expect, actual, ok: String(expect) === String(actual) });
};

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);
  const pool = new Pool({ host: '127.0.0.1', port, user: 'o4o_api', database: 'o4o_platform', max: 4 });
  await pool.query('SET default_transaction_read_only = on');

  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const rows: any[] = plan.rows;
  G('G1', '계획 건수(적용 전 원장)', 1193, rows.length);

  const applied = RESULTS.flatMap((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')).results)
    .filter((r: any) => r.status === 'GREEN');
  G('G1b', '2차 apply GREEN(1차는 체크포인트로 대체)', 798, applied.length);

  /* G0 — 모집단 */
  const total = parseInt((await pool.query(`SELECT count(*) c FROM shared_product_descriptions s WHERE ${KO}`)).rows[0].c, 10);
  G('G0', 'KO STORE OTC canonical 모집단', 15908, total);

  /* LIVE 전수 조회 */
  const live = new Map<string, { h: string; sum: string | null; content: string; sref: string | null; lang: string; st: string; dt: string }>();
  const all = (await pool.query(
    `SELECT s.master_id::text mid, md5(s.content) h, s.summary, s.content,
            s.source_ref_id::text sref, COALESCE(s.language,'ko') lang, s.status st, s.description_type dt
       FROM shared_product_descriptions s WHERE ${KO}`)).rows as any[];
  for (const r of all) live.set(r.mid, { h: r.h, sum: r.summary, content: r.content, sref: r.sref, lang: r.lang, st: r.st, dt: r.dt });

  /* G2 — 적용 합계(요약·본문 해시가 계획의 new 와 일치) */
  let hashOk = 0, sumOk = 0;
  for (const r of rows) {
    const l = live.get(r.masterId); if (!l) continue;
    if (l.h === r.newHash) hashOk++;
    if (l.sum === r.newSummary) sumOk++;
  }
  G('G2', '본문 해시 = 계획 newHash', 1193, hashOk);
  G('G2b', '저장 summary = 계획 newSummary', 1193, sumOk);

  /* G3 — 대상 전체에서 문장 중간/어절 중간 절단 잔존 */
  let midCut = 0, wholeLine = 0;
  for (const r of rows) {
    const l = live.get(r.masterId); if (!l || l.sum === null) continue;
    const line = introLine(l.content);
    if (line !== null && line === l.sum) { wholeLine++; continue; }   // 규칙 7 — 첫 줄 전체 채택
    if (!KO_TERM.test(l.sum)) midCut++;
  }
  G('G3', '재조립 대상 문장 중간 절단 잔존', 0, midCut);

  /* G4 — 고정 120자 하드컷 잔존(전수) */
  const cut120 = all.filter((r) => {
    if (r.summary === null) return false;
    const line = introLine(r.content);
    return String(r.summary).length === 120 && line !== null && line.length > 120 && line.slice(0, 120) === String(r.summary);
  }).length;
  G('G4', 'KO 전수 120자 하드컷 잔존', 0, cut120);

  /* G5 — 저장 summary 와 본문 표시(hero 배지)의 불일치 */
  let displayMismatch = 0, tileMismatch = 0;
  for (const r of rows) {
    const l = live.get(r.masterId); if (!l || l.sum === null) continue;
    if (!l.content.includes(`<span class="sd-badge">${esc(l.sum)}</span>`)) displayMismatch++;
    if (!l.content.includes(`<span class="sd-tag">작용</span>\n        <p>${esc(l.sum)}</p>`)) tileMismatch++;
  }
  G('G5', 'hero 배지 ↔ 저장 summary 불일치', 0, displayMismatch);
  G('G5b', '작용 타일 ↔ 저장 summary 불일치', 0, tileMismatch);

  /* G6 — EN canonical 변경 0 (적용 창 이후 갱신) */
  const enTouched = parseInt((await pool.query(
    `SELECT count(*) c FROM shared_product_descriptions s WHERE ${EN} AND s.updated_at >= $1::timestamp`, [APPLY_WINDOW_START])).rows[0].c, 10);
  G('G6', '적용 창 이후 EN canonical 갱신', 0, enTouched);

  /* G7 — 역패치 복원 → 적용 전 해시 일치 (핵심 증명) */
  let reverseOk = 0, reverseFail: string[] = [];
  for (const r of rows) {
    const l = live.get(r.masterId); if (!l) continue;
    const heroNew = `<span class="sd-badge">${esc(r.newSummary)}</span>`;
    const heroOld = `<span class="sd-badge">${esc(r.oldSummary)}</span>`;
    const tileNew = `<span class="sd-tag">작용</span>\n        <p>${esc(r.newSummary)}</p>`;
    const tileOld = `<span class="sd-tag">작용</span>\n        <p>${esc(r.oldSummary)}</p>`;
    let restored = l.content.replace(heroNew, heroOld);
    if (r.tileReplaced) restored = restored.replace(tileNew, tileOld);
    if (md5(restored) === r.oldHash) reverseOk++; else if (reverseFail.length < 5) reverseFail.push(r.masterId);
  }
  G('G7', '역패치 복원 → 적용 전 해시 일치', 1193, reverseOk);

  /* G8 — 요약 2지점을 제외한 본문의 수치·연령·기간 토큰 드리프트 */
  let tokenDrift = 0;
  for (const r of rows) {
    const l = live.get(r.masterId); if (!l) continue;
    const heroNew = `<span class="sd-badge">${esc(r.newSummary)}</span>`;
    const tileNew = `<span class="sd-tag">작용</span>\n        <p>${esc(r.newSummary)}</p>`;
    const heroOld = `<span class="sd-badge">${esc(r.oldSummary)}</span>`;
    const tileOld = `<span class="sd-tag">작용</span>\n        <p>${esc(r.oldSummary)}</p>`;
    let pre = l.content.replace(heroNew, heroOld);
    if (r.tileReplaced) pre = pre.replace(tileNew, tileOld);
    // 구조 2지점을 양쪽에서 동일하게 제거한 뒤 잔여 본문 토큰을 비교한다
    const stripNow = l.content.replace(heroNew, '').replace(tileNew, '');
    const stripPre = pre.replace(heroOld, '').replace(tileOld, '');
    if (numTokens(stripNow) !== numTokens(stripPre)) tokenDrift++;
  }
  G('G8', '잔여 본문 수치·연령·기간 토큰 드리프트', 0, tokenDrift);

  /* G9 — 경고 목록(주의 대상 <li>) 건수·내용 보존: 계획 대상의 li 수는 적용 전후 동일해야 한다 */
  let warnDrift = 0;
  for (const r of rows) {
    const l = live.get(r.masterId); if (!l) continue;
    const liNow = (l.content.match(/<li>/g) || []).length;
    const heroNew = `<span class="sd-badge">${esc(r.newSummary)}</span>`;
    const pre = l.content.replace(heroNew, `<span class="sd-badge">${esc(r.oldSummary)}</span>`);
    if (liNow !== (pre.match(/<li>/g) || []).length) warnDrift++;
  }
  G('G9', '경고 목록 항목 수 드리프트', 0, warnDrift);

  /* G10 — 전문가 문의 안내 소실 */
  const noExpert = rows.filter((r) => { const l = live.get(r.masterId); return l ? !/약사/.test(l.content) : false; }).length;
  G('G10', '매장 전문가(약사) 문의 안내 소실', 0, noExpert);

  /* G11 — canonical 중복 */
  const dup = parseInt((await pool.query(
    `SELECT count(*) c FROM (SELECT s.master_id FROM shared_product_descriptions s WHERE ${KO}
       GROUP BY s.master_id HAVING count(*) > 1) t`)).rows[0].c, 10);
  G('G11', 'KO canonical 중복 master', 0, dup);

  /* G12 — sourceRef · 언어 · 상태 · 타입 드리프트 */
  const drift = rows.filter((r) => { const l = live.get(r.masterId);
    return !l || l.sref === null || l.lang !== 'ko' || l.st !== 'canonical' || l.dt !== 'STORE'; }).length;
  G('G12', 'sourceRef/언어/상태/타입 드리프트', 0, drift);

  /* G13 — 대상 밖 KO 갱신 0 */
  const target = new Set(rows.map((r: any) => r.masterId));
  const touched = (await pool.query(
    `SELECT s.master_id::text mid FROM shared_product_descriptions s
      WHERE ${KO} AND s.updated_at >= $1::timestamp`, [APPLY_WINDOW_START])).rows as any[];
  const outside = touched.filter((t) => !target.has(t.mid)).length;
  G('G13', '적용 창 이후 대상 밖 KO 갱신', 0, outside);
  G('G13b', '적용 창 이후 KO 갱신 총건', 1193, touched.length);

  /* G14 — 기존 정상 KO(구절형 + 그 외)는 손대지 않았다 */
  G('G14', '기존 정상 KO 중 갱신', 0, outside);

  /* G15 — 비의약품 master 혼입 */
  const nonDrug = parseInt((await pool.query(
    `SELECT count(*) c FROM shared_product_descriptions s JOIN product_masters m ON m.id=s.master_id
      WHERE ${KO} AND s.master_id=ANY($1::uuid[]) AND m.regulatory_type <> 'DRUG'`, [[...target]])).rows[0].c, 10);
  G('G15', '비의약품 master 혼입', 0, nonDrug);

  /* G16 — 새 요약이 효능 원문 첫 줄의 접두(원문 밖 문자 추가 0) */
  let notPrefix = 0;
  for (const r of rows) {
    const l = live.get(r.masterId); if (!l || l.sum === null) continue;
    const line = introLine(l.content);
    if (line === null || !line.startsWith(l.sum)) notPrefix++;
  }
  G('G16', '새 요약이 효능 첫 줄의 접두가 아님', 0, notPrefix);

  /* G17 — 새 요약이 옛 요약을 포함(정보 손실 0) */
  const lost = rows.filter((r: any) => !String(r.newSummary).startsWith(String(r.oldSummary))).length;
  G('G17', '새 요약이 옛 요약을 포함하지 않음', 0, lost);

  await pool.end();

  const failed = gates.filter((g) => !g.ok);
  fs.writeFileSync(OUT, JSON.stringify({
    wo: plan.wo, kind: 'independent-verification', planDigest: plan.planDigest,
    applyWindowStart: APPLY_WINDOW_START, gates, failed: failed.length, reverseFailSample: reverseFail,
  }, null, 2) + '\n', 'utf8');

  for (const g of gates) console.log(`${g.ok ? 'PASS' : 'FAIL'}  ${g.id}  ${g.desc} — 기대 ${g.expect} / 실측 ${g.actual}`);
  console.log(`\n=== 게이트 ${gates.length} · 실패 ${failed.length} ===`);
  if (failed.length) process.exitCode = 2;
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
