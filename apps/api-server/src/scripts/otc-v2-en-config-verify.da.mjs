// WO-O4O-OTC-REMAINING-READY-SHARD-DA-V2-LIVE-APPLY-V1 — EN config 저작 검증기 (에이전트 다).
//
// 공용 러너의 export(renderEn / missingNumericsEn)를 **그대로 import** 해서 apply 시점과 동일한
// 판정을 미리 수행한다. 공용 러너는 수정하지 않는다. DB 미접속 · write 0.
// 가 세션 .ga.mjs 는 접촉하지 않는다 — 본 파일은 da 전용 사본이다.
//
// 검사(파트 단위):
//   1) JSON parse · 필수 필드(fp/title/efficacy/usage/caution/summaryTable) · usageLabel 미포함
//   2) 한글 잔존 0 (renderEn 내부 게이트와 동일)
//   3) 비경구 route 에 경구 동사 0 (renderEn 게이트)
//   4) 공식 용법 수치 전량 보존 (missingNumericsEn — apply 시 중지 사유)
//   5) fp 가 eligible 집합 소속 · HOLD 미포함
//
// Usage(apps/api-server):
//   npx tsx src/scripts/otc-v2-en-config-verify.da.mjs src/scripts/data/otc-v2-en-config-da-p01.json
import fs from 'node:fs';
import path from 'node:path';
import { renderEn, missingNumericsEn } from './otc-v2-store-leaflet-runner.shared.ts';

const DATA = 'src/scripts/data';
const FULL = path.join(DATA, 'otc-v2-authoring-source-full.da.json');
const full = JSON.parse(fs.readFileSync(FULL, 'utf8'));
const byFp = new Map(full.groups.map((g) => [g.fp, g]));

const files = process.argv.slice(2).filter((a) => a.endsWith('.json'));
if (!files.length) { console.error('config 파일 경로 필요'); process.exit(2); }

let entries = 0; const failures = [];
for (const f of files) {
  const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const e of cfg.groups) {
    entries += 1;
    const where = `${path.basename(f)}#${e.fp}`;
    const g = byFp.get(e.fp);
    if (!g) { failures.push(`${where}: eligible 아님(또는 HOLD)`); continue; }
    if (e.usageLabel !== undefined) failures.push(`${where}: usageLabel 포함 금지`);
    for (const k of ['title', 'efficacy', 'usage', 'caution']) {
      if (!e[k] || !String(e[k]).trim()) failures.push(`${where}: ${k} 공백`);
    }
    if (!e.summaryTable || !Object.keys(e.summaryTable).length) failures.push(`${where}: summaryTable 비어있음`);

    const r = renderEn(
      { groupKey: e.fp, title: e.title, efficacy: e.efficacy, usage: e.usage, caution: e.caution, summaryTable: e.summaryTable },
      g.route, g.official.dosage,
    );
    for (const a of r.anomalies) failures.push(`${where}: ${a}`);
    const lost = missingNumericsEn(g.official.dosage, e.usage);
    if (lost.length) failures.push(`${where}: 수치 누락 ${lost.join(',')}`);
    if (!r.html) failures.push(`${where}: 빈 html`);
  }
}
console.log(`EN-CONFIG-VERIFY da — entries ${entries} · ${failures.length === 0 ? 'PASS' : `FAIL ${failures.length}`}`);
for (const x of failures.slice(0, 30)) console.log(`  - ${x}`);
process.exit(failures.length ? 1 : 0);
