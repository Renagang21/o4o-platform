/** CAUTION_CLAIM 6건이 진짜 문제인지, 규칙 오탐인지 원문으로 확인한다. */
import fs from 'node:fs';
const v = JSON.parse(fs.readFileSync('tmp/cosmetics-mfds-usage-caution/validation.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('tmp/cosmetics-mfds-usage-caution/dry-run-plan.json', 'utf8'));
const ids = new Set(v.samples.filter((s) => s.code === 'CAUTION_CLAIM').map((s) => s.masterId));
const HYPE_RE = /최고|최강|완벽|100%|즉시\s*효과|확실한\s*효과|부작용\s*없|영구|근본\s*해결/;
const DRUG_CLAIM_RE = /치료제|처방|의약품|병을\s*낫/;
for (const p of plan.filter((x) => ids.has(x.masterId))) {
  console.log(`\n=== ${p.brandName} ${p.productName} (보고 ${p.mfdsSourceKey.reportNo})`);
  for (const l of p.addedCautionLines ?? []) {
    const h = HYPE_RE.exec(l);
    const g = DRUG_CLAIM_RE.exec(l);
    if (h || g) console.log(`  [${h ? `HYPE:${h[0]}` : ''}${g ? `DRUG:${g[0]}` : ''}] ${l}`);
  }
}
