// READ-ONLY offline EN build validation for shard B (no DB). agent-na. Not an apply.
import fs from 'node:fs';
import { buildDrugOtcEnConsumerHtml } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const cfg = JSON.parse(fs.readFileSync('src/scripts/data/otc-oral-combo-leaflet-config-shardB.na-v9.json', 'utf8'));
const groups = cfg.groups as Record<string, any>;
let ok = 0;
const bad: string[] = [];
for (const [fp, g] of Object.entries(groups)) {
  const en = g.en;
  const built = buildDrugOtcEnConsumerHtml(en);
  const issues: string[] = [];
  if (built.missing.length) issues.push('missing:' + built.missing.join(','));
  if (!built.html) issues.push('empty');
  else {
    if (/[가-힣]/.test(built.html)) issues.push('hangul');
    if (built.html.includes('<table')) issues.push('table');
    if (!built.html.includes('sd-warn')) issues.push('no-sd-warn');
    if (built.html.includes('<!--')) issues.push('comment');
  }
  if (issues.length) bad.push(fp + ':' + issues.join('|'));
  else ok++;
}
console.log('EN build ok=' + ok + '/' + Object.keys(groups).length);
console.log('bad=' + JSON.stringify(bad));
