/**
 * 전수 h1 감사 — C층 대상 선정: 위험군 중복 제거 60~100건 (read-only)
 *
 * A·B층이 전수 PASS 라도, 자동 측정이 놓칠 수 있는 것(겹침·잘림·시각적 파손)은 사람이 보는 화면에서만 잡힌다.
 * 그래서 "가장 깨지기 쉬운 쪽" 을 축별로 뽑아 실제 페이지로 다시 연다.
 *
 *   G1 기존 결함 14제품          — 재현 0 을 증명해야 하는 대조군
 *   G2 제품명 길이 상위 30
 *   G3 공백 없는 최장 토큰 상위 30
 *   G4 수출명 포함 20
 *   G5 한글·영문·기호 혼합 20
 *   G6 여유 폭(slack) 최저 20    — B층 원장 기준, 모바일 우선
 *   G7 줄 수 최대 20             — 4~6줄 이상에서 아래 콘텐츠와 겹치는지 볼 대상
 *
 * 산출: results/h1-risk-targets.json
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

const pop = readJsonl(path.join(RESULTS, 'h1-population.jsonl'));
const byKey = new Map(pop.map((r) => [r.publicKey, r]));
const ledger = readJsonl(path.join(RESULTS, 'h1-layout-slack-ledger.jsonl'));
const run1 = readJsonl(path.join(RESULTS, 'browser-smoke-run1-before-fix-findings.jsonl'));

// 모바일이 가장 좁으므로 위험 축 정렬의 기준 폭으로 쓴다.
const mob = ledger.filter((l) => l.viewport === 'mobile');
const mobByKey = new Map(mob.map((l) => [l.publicKey, l]));

const picked = new Map();
const take = (group, list, n) => {
  for (const r of list.slice(0, n)) {
    const k = r.publicKey;
    if (!byKey.has(k)) continue;
    const cur = picked.get(k);
    if (cur) { cur.groups.push(group); continue; }
    const p = byKey.get(k); const m = mobByKey.get(k) || {};
    picked.set(k, {
      publicKey: k, masterId: p.masterId, productName: p.productName, groups: [group],
      risk: p.risk, mobileSlack: m.slack, mobileLines: m.lines, mobileHeightPx: m.heightPx,
    });
  }
};

take('G1_prior_defect', [...new Set(run1.map((f) => f.publicKey))].map((publicKey) => ({ publicKey })), 99);
take('G2_name_length', [...pop].sort((a, b) => b.risk.len - a.risk.len), 30);
take('G3_longest_token', [...pop].sort((a, b) => b.risk.longestToken - a.risk.longestToken), 30);
take('G4_export_name', pop.filter((r) => r.risk.hasExportName).sort((a, b) => b.risk.len - a.risk.len), 20);
take('G5_mixed_script', pop.filter((r) => r.risk.mixedScript).sort((a, b) => (b.risk.symbolCount + b.risk.latinRun) - (a.risk.symbolCount + a.risk.latinRun)), 20);
take('G6_min_slack', [...mob].sort((a, b) => a.slack - b.slack), 20);
take('G7_max_lines', [...mob].sort((a, b) => b.lines - a.lines), 20);

const targets = [...picked.values()];
const out = {
  wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1',
  step: 'select-h1-risk',
  total: targets.length,
  byGroup: targets.reduce((a, t) => { for (const g of t.groups) a[g] = (a[g] ?? 0) + 1; return a; }, {}),
  nameLength: { max: Math.max(...targets.map((t) => t.risk.len)), min: Math.min(...targets.map((t) => t.risk.len)) },
  mobileLines: { max: Math.max(...targets.map((t) => t.mobileLines ?? 0)) },
  targets,
};
fs.writeFileSync(path.join(RESULTS, 'h1-risk-targets.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify({ ...out, targets: undefined }, null, 2) + '\n');
