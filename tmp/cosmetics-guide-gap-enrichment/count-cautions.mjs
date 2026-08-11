import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/mfds-detail.json', 'utf8')).details;
const v = Object.values(d);
console.log(
  JSON.stringify({
    total: v.length,
    withEfficacy: v.filter((x) => x?.efficacy).length,
    withUsage: v.filter((x) => x?.usage).length,
    withCautions: v.filter((x) => x?.cautions).length,
  }),
);
