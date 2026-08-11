import fs from 'node:fs';
const R = (n) => JSON.parse(fs.readFileSync(`tmp/cosmetics-guide-gap-enrichment/${n}`, 'utf8'));
const c = R('census-summary.json');
const p = R('post-verify.json');
const d = R('dry-run-summary.json');
const t = R('type-triage.json').meta;
console.log(
  JSON.stringify(
    {
      gapDocs: c.gapDocs,
      issueTotal: c.issueTotal,
      byMissingCombo: c.byMissingCombo,
      issueCounts: c.issueCounts,
      counts: d.counts,
      fields: d.autoEnrichFieldCounts,
      featureSrc: d.featureSourceCounts,
      typeTriage: t.counts,
      post: { pass: p.pass, applied: p.plannedApplied, untouched: p.untouchedOk, typeChanged: p.typeChangeApplied, gapBefore: p.gapBefore, gapAfter: p.gapAfter },
    },
    null,
    1,
  ),
);
