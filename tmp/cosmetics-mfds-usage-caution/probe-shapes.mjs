/** 보완 규칙을 정하기 전에 원문이 실제로 어떻게 생겼는지 본다. */
import fs from 'node:fs';
import { GENERIC_USAGE } from '../../apps/api-server/src/scripts/cosmetics-guide-production/guide-core.mjs';

const detail = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/mfds-detail.json', 'utf8')).details;
const vals = Object.values(detail).filter((d) => d && !d._missing && !d._failed);

const usages = vals.map((d) => (d.usage ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
const cautions = vals.map((d) => (d.cautions ?? '').trim()).filter(Boolean);

// 용법 빈도 — 정형구가 얼마나 많은가
const freq = new Map();
for (const u of usages) freq.set(u, (freq.get(u) ?? 0) + 1);
const top = [...freq].sort((a, b) => b[1] - a[1]);
console.log(`용법 총 ${usages.length} · 서로 다른 문장 ${top.length}`);
for (const [u, n] of top.slice(0, 12)) console.log(String(n).padStart(4), u.slice(0, 110));

const lens = usages.map((u) => u.length).sort((a, b) => a - b);
const pick = (p) => lens[Math.floor(lens.length * p)];
console.log(`\n용법 길이 p10=${pick(0.1)} p50=${pick(0.5)} p90=${pick(0.9)} max=${lens[lens.length - 1]}`);
const genericLens = Object.values(GENERIC_USAGE).map((v) => v.length).sort((a, b) => a - b);
console.log(`유형별 일반 안내 길이 min=${genericLens[0]} p50=${genericLens[Math.floor(genericLens.length / 2)]} max=${genericLens[genericLens.length - 1]}`);

// 숫자·횟수·시간 같은 구체 지시가 든 용법 비율
const CONCRETE = /\d|아침|저녁|취침|외출|하루|1일|매일|분\s*후|초\s*간|씻어|헹궈|건조|도포\s*후|반복|주\s*\d/;
console.log(`구체 지시 포함 용법: ${usages.filter((u) => CONCRETE.test(u)).length} / ${usages.length}`);

// 주의사항 형태
console.log(`\n주의사항 총 ${cautions.length}`);
const numbered = cautions.filter((c) => /^\s*1[.)]/.test(c)).length;
console.log(`'1.' 로 시작하는 번호 목록: ${numbered}`);
const clen = cautions.map((c) => c.length).sort((a, b) => a - b);
console.log(`주의사항 길이 p10=${clen[Math.floor(clen.length * 0.1)]} p50=${clen[Math.floor(clen.length * 0.5)]} p90=${clen[Math.floor(clen.length * 0.9)]} max=${clen[clen.length - 1]}`);
console.log('\n--- 주의사항 예시 2건 ---');
for (const c of cautions.slice(0, 2)) console.log(JSON.stringify(c.slice(0, 700)), '\n');
