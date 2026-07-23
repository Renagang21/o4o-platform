import fs from 'node:fs';
import path from 'node:path';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';
import { composeSf, type SfSeed } from './hff-sf-compose.js';
const DIR = process.argv[2]; const ING = process.argv[3];
const ing = SF_INGREDIENTS[ING];
const ready = JSON.parse(fs.readFileSync(path.join(DIR, `${ing.slug}-ready.json`), 'utf8')) as Array<SfSeed & { shard: number }>;
const blocked: Record<string, number> = {}; const samples: Record<string, { stmt: string; fn: string }> = {};
for (const seed of ready) {
  const c = composeSf(ing, seed); if ('error' in c) continue;
  const gi = { candidateId: seed.candidateId, productName: seed.productName, productNameEn: seed.productName, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: seed.statementNo, category: 'hff',
    source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
    grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
  const r = runGuard(gi as never, { phase: 'all' });
  for (const f of r.findings.filter((f) => f.status === 'BLOCKED')) { blocked[f.ruleId] = (blocked[f.ruleId] ?? 0) + 1; if (!samples[f.ruleId]) samples[f.ruleId] = { stmt: seed.statementNo, fn: seed.source.mainFunction.slice(0, 140) }; }
}
console.log(JSON.stringify({ ingredient: ING, blocked, samples }, null, 1));
