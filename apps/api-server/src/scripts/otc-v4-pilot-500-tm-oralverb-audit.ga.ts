/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — EN 번역메모리 경구 동사 오도입 감사 (에이전트 가). DB 접근 0.
 *
 * 판정 규칙(문장 단위, route 무관하게 안전):
 *   KO 원문에 경구 동사(복용/삼키/먹/섭취/마시/경구)가 **없는데** EN 에 경구 동사
 *   (take/taken/swallow/orally/by mouth/ingest)가 있으면 → 번역이 원문에 없는 투여 방식을 도입한 것.
 *
 *   KO 에 경구 동사가 있으면 EN 의 경구 동사는 원문 충실 번역이므로 감사 대상이 아니다
 *   (외용제 주의사항의 "실수로 복용한 경우" 등은 공식 원문에 정상적으로 존재한다).
 *
 *   --emit  이면 교정 대상만 모아 repair shard 파일로 내보낸다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500 } from './otc-v4-pilot-500-contract.ga.js';

const TM = path.join(DATA_DIR, 'otc-v4-pilot-500-tm.ga.json');
const OUT = path.join(DATA_DIR, 'otc-v4-pilot-500-tm-oralverb-audit.ga.json');
const REPAIR = path.join(DATA_DIR, 'otc-v4-pilot-500-tm-repair-oralverb.ga.json');

const ORAL_KO = /복용|삼키|먹|섭취|마시|경구/;
const ORAL_EN = /\b(take|takes|taken|taking|swallow|swallowed|swallowing|orally|oral administration|by mouth|ingest|ingested)\b/i;

function main(): void {
  const tm = JSON.parse(fs.readFileSync(TM, 'utf8')) as {
    entries: Record<string, string>;
    annotations: Record<string, { section: string; routes: string[]; masters: number; count: number }>;
  };
  const hits: Array<{ ko: string; en: string; section: string; routes: string[]; masters: number; matched: string[] }> = [];
  for (const [ko, en] of Object.entries(tm.entries)) {
    if (!en) continue;
    if (ORAL_KO.test(ko)) continue;                 // 원문 근거 있음 → 대상 아님
    const m = en.match(new RegExp(ORAL_EN.source, 'gi'));
    if (!m) continue;
    const a = tm.annotations[ko];
    hits.push({ ko, en, section: a?.section ?? '', routes: a?.routes ?? [], masters: a?.masters ?? 0, matched: [...new Set(m.map((x) => x.toLowerCase()))] });
  }
  const byRoute: Record<string, number> = {};
  for (const h of hits) for (const r of h.routes) byRoute[r] = (byRoute[r] || 0) + 1;
  const nonOralOnly = hits.filter((h) => h.routes.length && !h.routes.includes('oral'));

  fs.writeFileSync(OUT, JSON.stringify({
    wo: WO_500, kind: 'oral-verb-audit', liveDbWrite: 0,
    rule: 'KO 경구동사 없음 + EN 경구동사 있음 → 원문에 없는 투여 방식 도입',
    tmTotal: Object.keys(tm.entries).length, hits: hits.length,
    hitsAffectingNonOralOnly: nonOralOnly.length, byRoute,
    detail: hits.map((h) => ({ ...h, ko: h.ko.slice(0, 160), en: h.en.slice(0, 160) })),
  }, null, 2) + '\n', 'utf8');

  if (process.argv.includes('--emit')) {
    fs.writeFileSync(REPAIR, JSON.stringify({
      wo: WO_500, kind: 'tm-repair-oralverb', total: hits.length,
      instruction: 'EN 에서 원문에 없는 경구 투여 표현을 제거하고 원문 동사에 맞는 표현으로 교체한다. 의미·수치·강도는 그대로 둔다.',
      sentences: hits.map((h) => ({ ko: h.ko, currentEn: h.en, section: h.section, routes: h.routes, offendingTerms: h.matched })),
    }, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify({ tmTotal: Object.keys(tm.entries).length, hits: hits.length, hitsAffectingNonOralOnly: nonOralOnly.length, byRoute, sample: hits.slice(0, 5).map((h) => ({ ko: h.ko.slice(0, 90), en: h.en.slice(0, 90), matched: h.matched, routes: h.routes })) }, null, 2));
}
main();
