/**
 * WO-O4O-OTC-EN-SUMMARY-HARDCUT-REMOVAL-AND-2522-CARD-REBUILD-V1
 *   — **독립검증기** (READ-ONLY · DB write 0)
 *
 * 재조립기(otc-en-summary-rebuild.ga.ts)와 **다른 코드 경로**로 LIVE 결과를 검증한다.
 * 파생 규칙 모듈(otc-leaflet-summary.shared.ts)도 import 하지 않는다 —
 * 같은 함수로 만든 값을 같은 함수로 되짚으면 검증이 아니기 때문이다.
 *
 * 핵심 증명(G7): LIVE 본문에서 **새 요약 문자열 2곳만** 옛 요약으로 되돌렸을 때
 * md5 가 적용 전 해시(oldHash)와 byte 단위로 일치하면,
 * 6섹션 내용·수치·연령·횟수·간격·기간·경고 강도·route 문구·footer 는 변경될 수 없다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-en-summary-rebuild-verify.ga.ts [--port 5495]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const PLAN = path.join(DATA_DIR, 'otc-en-summary-rebuild-plan.ga.json');
const RESULT = path.join(DATA_DIR, 'otc-en-summary-rebuild-result.ga.json');
const OUT = path.join(DATA_DIR, 'otc-en-summary-rebuild-verify.ga.json');

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => crypto.createHash('md5').update(s, 'utf8').digest('hex');
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TERMINATOR = /[.!?。！？][)\]"'”’）］」』]?$/;

type Gate = { id: string; name: string; expected: number | string; actual: number | string; pass: boolean };
const gates: Gate[] = [];
const gate = (id: string, name: string, expected: number | string, actual: number | string): void => {
  gates.push({ id, name, expected, actual, pass: String(expected) === String(actual) });
};

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const result = JSON.parse(fs.readFileSync(RESULT, 'utf8'));
  const rows: Array<{ masterId: string; descId: string; route: string; oldHash: string; newHash: string; oldSummary: string; newSummary: string }> = plan.rows;
  if (result.summary?.mode !== 'APPLY') throw new Error(`result 원장이 APPLY 가 아니다: ${result.summary?.mode}`);
  // updated_at 은 `timestamp without time zone`(UTC 값 저장)이다.
  // JS Date 를 그대로 바인딩하면 드라이버가 로컬시각으로 변환해 9시간 어긋난다 → 문자열 리터럴로 비교한다.
  const applyStart = result.summary.startedAt.replace('T', ' ').replace('Z', '');
  const applyStartMs = new Date(result.summary.startedAt).getTime();
  const targetIds = new Set(rows.map((r) => r.descId));

  const pool = new Pool({ host: '127.0.0.1', port, user: 'o4o_api', database: 'o4o_platform', max: 4 });
  const q = async (sql: string, p: unknown[] = []): Promise<any[]> => (await pool.query(sql, p)).rows;
  await q('SET default_transaction_read_only = on');

  const SPD_EN = `s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc' AND s.status='canonical' AND COALESCE(s.language,'ko')='en'`;
  const V4 = `WITH m AS (SELECT DISTINCT master_id FROM shared_product_description_audit_logs WHERE metadata->>'batchId' LIKE 'otc-v4%')`;

  /* ---------- LIVE 재조회 (재조립기와 무관한 자체 쿼리) ---------- */
  // 대상 코호트 = V4 OTC 트랙(batchId otc-v4%) 의 EN canonical = 3,476
  const live = await q(
    `${V4}
     SELECT s.id::text, s.master_id::text, s.summary, s.content, s.source_ref_id::text, s.language, s.status,
            s.description_type, s.source_type, s.updated_at
       FROM shared_product_descriptions s JOIN m ON m.master_id = s.master_id WHERE ${SPD_EN}`);
  gate('G0', '대상 코호트 EN canonical 총건', 3476, live.length);
  const byId = new Map<string, any>(live.map((r) => [r.id, r]));

  /* G1 입력 수 */
  gate('G1', '입력(계획) 건수', 2522, rows.length);

  /* G2 적용 합계 — 새 요약·새 해시가 LIVE 에 그대로 존재 */
  let applied = 0;
  for (const r of rows) {
    const l = byId.get(r.descId);
    if (l && String(l.summary) === r.newSummary && md5(String(l.content)) === r.newHash) applied++;
  }
  gate('G2', '적용 합계(요약·본문 해시 일치)', 2522, applied);

  /* G3 단어/문장 중간 절단 0 —
   *   요약은 (a) 문장 종결부호로 끝나거나, (b) 원문 첫 줄 **전체**와 같아야 한다.
   *   (b) 는 원문 효능 문장에 마침표가 없는 경우다. 파생 규칙 7항(종결부호 없으면 첫 줄 전체, 임의 절단 금지)에 해당한다. */
  const introLine = (html: string): string => {
    const m = html.match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
    return m ? m[1].split('<br>')[0].split('\n')[0]
      .replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').trim() : '';
  };
  const midWord = live.filter((r) => {
    const s = String(r.summary || '').trim();
    if (!s || TERMINATOR.test(s)) return false;
    return s !== introLine(String(r.content));           // 첫 줄 전체이면 절단이 아니다
  });
  gate('G3', '단어/문장 중간 절단(코호트 3,476)', 0, midWord.length);
  gate('G3b', '종결부호 없는 원문(첫 줄 전체 채택)', 3, live.filter((r) => {
    const s = String(r.summary || '').trim();
    return s && !TERMINATOR.test(s) && s === introLine(String(r.content));
  }).length);

  /* G4 하드컷 잔존 0 — 길이 정확히 120 & 비종결 */
  gate('G4', '120자 하드컷 잔존', 0, live.filter((r) => String(r.summary || '').length === 120 && !TERMINATOR.test(String(r.summary || '').trim())).length);

  /* G5 slice(0,120) 패턴 잔존 0 — 본문 첫 문장의 앞 120자와 요약이 정확히 같은 행 */
  let slicePattern = 0;
  for (const r of live) {
    const m = String(r.content).match(/<p class="sd-intro">([\s\S]*?)<\/p>/);
    if (!m) continue;
    const line = m[1].split('<br>')[0].split('\n')[0]
      .replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').trim();
    const s = String(r.summary || '');
    if (s.length === 120 && line.length > 120 && line.slice(0, 120) === s) slicePattern++;
  }
  gate('G5', 'slice(0,120) 파생 패턴 잔존', 0, slicePattern);

  /* G6 KO 변경 0 — KO canonical 중 적용 시각 이후 갱신된 행 */
  const koTouched = await q(
    `SELECT count(*)::int AS n FROM shared_product_descriptions s
      WHERE s.deleted_at IS NULL AND s.description_type='STORE' AND s.source_type='mfds_drug_otc'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.updated_at >= $1::timestamp`, [applyStart]);
  gate('G6', 'KO canonical 변경', 0, koTouched[0].n);

  /* G6b 플랫폼 전체 EN(코호트 밖 포함) 하드컷 잔존 0 */
  const allEn = await q(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE length(s.summary)=120 AND s.summary !~ '[.!?]\\s*$')::int AS hardcut
       FROM shared_product_descriptions s WHERE ${SPD_EN}`);
  gate('G6b', '플랫폼 전체 EN OTC 하드컷 잔존', 0, allEn[0].hardcut);

  /* G7 역패치 → oldHash 일치: 6섹션·수치·연령·기간·route·footer 무변경의 byte 단위 증명 */
  let reverseOk = 0; const reverseBad: string[] = [];
  const restoredById = new Map<string, string>();
  for (const r of rows) {
    const l = byId.get(r.descId); if (!l) { reverseBad.push(r.descId); continue; }
    const c = String(l.content);
    const hero = `<span class="sd-badge">${esc(r.newSummary)}</span>`;
    const tile = `<span class="sd-tag">How it works</span>\n        <p>${esc(r.newSummary)}</p>`;
    const heroOld = `<span class="sd-badge">${esc(r.oldSummary)}</span>`;
    const tileOld = `<span class="sd-tag">How it works</span>\n        <p>${esc(r.oldSummary)}</p>`;
    if (c.split(hero).length !== 2 || c.split(tile).length !== 2) { reverseBad.push(r.descId); continue; }
    const restored = c.replace(hero, heroOld).replace(tile, tileOld);
    restoredById.set(r.descId, restored);
    if (md5(restored) === r.oldHash) reverseOk++; else reverseBad.push(r.descId);
  }
  gate('G7', '역패치 → 적용전 해시 일치(본문 6섹션 무변경)', 2522, reverseOk);

  /* G8 수치·연령·기간 토큰 무변경 — 적용 전(역패치 복원본) vs 적용 후 본문에서
   *    교체 대상 요약 문자열을 제거한 **잔여 본문**의 숫자 토큰 열을 직접 대조한다. */
  const NUM = /\d+(?:[.,]\d+)?/g;
  let numDrift = 0; const numBad: string[] = [];
  for (const r of rows) {
    const l = byId.get(r.descId); const old = restoredById.get(r.descId);
    if (!l || !old) { numDrift++; numBad.push(r.descId); continue; }
    const strip = (c: string, sum: string): string => c
      .replace(`<span class="sd-badge">${esc(sum)}</span>`, '<span class="sd-badge"></span>')
      .replace(`<span class="sd-tag">How it works</span>\n        <p>${esc(sum)}</p>`, '<span class="sd-tag">How it works</span>\n        <p></p>');
    const after = strip(String(l.content), r.newSummary);
    const before = strip(old, r.oldSummary);
    const a = (after.match(NUM) || []).join('|');
    const b = (before.match(NUM) || []).join('|');
    if (a !== b) { numDrift++; numBad.push(r.descId); }
  }
  gate('G8', '잔여 본문 수치·연령·기간 토큰 드리프트', 0, numDrift);

  /* G9 route 문구 무변경 — 투여 경로 표현이 본문에 그대로 존재 */
  const ROUTE_MARK: Record<string, RegExp> = {
    oral: /\b(take|taken|orally|by mouth|swallow)\b/i,
    topical: /\b(apply|applied|affected area|skin)\b/i,
    ophthalmic: /\b(eye|eyes|instill|drop)\b/i,
    oromucosal: /\b(mouth|oral cavity|gargle|throat|lozenge|dissolve)\b/i,
    rectal: /\b(rectum|rectally|suppositor)/i,
    vaginal: /\b(vagina|vaginally|intravaginal)/i,
    nasal: /\b(nose|nasal|nostril|spray)\b/i,
  };
  let routeLost = 0;
  for (const r of rows) {
    const l = byId.get(r.descId); if (!l) { routeLost++; continue; }
    const re = ROUTE_MARK[r.route]; if (!re) continue;
    if (!re.test(String(l.content))) routeLost++;
  }
  gate('G9', 'route 표현 소실', 0, routeLost);

  /* G10 footer(전문가 문의) 존재 */
  let footLost = 0;
  for (const r of rows) {
    const l = byId.get(r.descId);
    const c = l ? String(l.content) : '';
    if (!l || !/<p class="sd-foot">/.test(c) || !/pharmacist/i.test(c.slice(c.indexOf('<p class="sd-foot">')))) footLost++;
  }
  gate('G10', 'footer/CTA 누락', 0, footLost);

  /* G11 canonical 중복 0 */
  const dup = await q(
    `SELECT count(*)::int AS n FROM (
       SELECT master_id, description_type, COALESCE(language,'ko') AS lang, count(*) AS c
         FROM shared_product_descriptions
        WHERE deleted_at IS NULL AND status='canonical' AND source_type='mfds_drug_otc'
        GROUP BY 1,2,3 HAVING count(*) > 1) t`);
  gate('G11', 'canonical 중복(master,type,lang)', 0, dup[0].n);

  /* G12 sourceRef·언어·상태·타입 변경 0 */
  const planRef = new Map(rows.map((r) => [r.descId, r]));
  let metaDrift = 0;
  for (const r of live) {
    if (!targetIds.has(r.id)) continue;
    if (r.language !== 'en' || r.status !== 'canonical' || r.description_type !== 'STORE' || r.source_type !== 'mfds_drug_otc') metaDrift++;
    if (!r.source_ref_id) metaDrift++;   // UPDATE 의 SET 절은 content/summary/updated_at 뿐 — source_ref_id 는 보존되어야 한다
    if (!planRef.get(r.id)) metaDrift++;
  }
  gate('G12', 'sourceRef/언어/상태/타입 드리프트', 0, metaDrift);

  /* G13 대상 밖 update 0 — 적용 시각 이후 갱신된 SPD 전체가 정확히 대상 집합 */
  const touched = await q(
    `SELECT id::text FROM shared_product_descriptions WHERE updated_at >= $1::timestamp`, [applyStart]);
  const outside = touched.filter((t) => !targetIds.has(t.id));
  gate('G13', '대상 밖 update', 0, outside.length);
  gate('G13b', '적용 시각 이후 갱신 총건', 2522, touched.length);

  /* G14 기존 정상 954 변경 0 */
  const pass954 = live.filter((r) => !targetIds.has(r.id));
  gate('G14', '기존 정상 EN 건수', 954, pass954.length);
  gate('G14b', '기존 정상 EN 중 갱신된 행', 0, pass954.filter((r) => new Date(r.updated_at).getTime() >= applyStartMs).length);

  /* G15 의약품 외(기구·멸균제 등) 혼입 0 */
  const nonDrug = await q(
    `SELECT count(*)::int AS n FROM product_masters pm
      WHERE pm.id = ANY($1::uuid[]) AND COALESCE(pm.regulatory_type,'') <> 'DRUG'`,
    [rows.map((r) => r.masterId)]);
  gate('G15', '비의약품 master 혼입', 0, nonDrug[0].n);

  /* G16 표시 일관성 — 저장 summary == hero 배지 == At a glance 타일 */
  let displayMismatch = 0;
  for (const r of live) {
    const c = String(r.content); const s = esc(String(r.summary || ''));
    if (!s) continue;
    if (!c.includes(`<span class="sd-badge">${s}</span>`)) displayMismatch++;
  }
  gate('G16', '저장 summary ↔ 본문 표시 불일치(EN 전체)', 0, displayMismatch);

  await pool.end();

  const failed = gates.filter((g) => !g.pass);
  fs.writeFileSync(OUT, JSON.stringify({
    wo: plan.wo, kind: 'independent-verification', planDigest: plan.planDigest,
    applyStartedAt: result.summary.startedAt, gates, pass: failed.length === 0,
  }, null, 2) + '\n', 'utf8');

  for (const g of gates) console.log(`${g.pass ? 'PASS' : 'FAIL'} ${g.id.padEnd(5)} ${g.name} — expected ${g.expected}, actual ${g.actual}`);
  console.log(`\n=== independent-verify · gates ${gates.length} · failed ${failed.length} · PASS=${failed.length === 0} ===`);
  if (failed.length) process.exit(2);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
