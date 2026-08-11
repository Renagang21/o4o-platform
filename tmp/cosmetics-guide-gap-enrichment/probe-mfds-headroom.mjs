/** 결손 모집단에 대한 식약처 기능성 매칭 **여유분**을 규칙별로 실측한다. */
import fs from 'node:fs';

const gaps = JSON.parse(fs.readFileSync('tmp/cosmetics-guide-gap-enrichment/gap-population.json', 'utf8'));
const fidx = JSON.parse(fs.readFileSync('tmp/cosmetics-retail-census/functional-index.json', 'utf8')).rows;

const tight = (s) => (s ?? '').replace(/[^0-9a-z가-힣]/gi, '').toLowerCase();

// MFDS index: tight(productName) → rows
const byTight = new Map();
for (const r of fidx) {
  const k = tight(r.productName);
  if (!k) continue;
  if (!byTight.has(k)) byTight.set(k, []);
  byTight.get(k).push(r);
}

// 브랜드 접두를 뗀 키도 만든다 (기능성 보고명은 브랜드를 앞에 붙여 쓴다).
const brands = [...new Set(gaps.map((g) => tight(g.brandName)).filter((b) => b.length >= 2))];
const brandSet = new Set(brands);
const byTightNoBrand = new Map();
for (const [k, rows] of byTight) {
  for (const b of brandSet) {
    if (k.startsWith(b) && k.length - b.length >= 4) {
      const k2 = k.slice(b.length);
      if (!byTightNoBrand.has(k2)) byTightNoBrand.set(k2, []);
      byTightNoBrand.get(k2).push(...rows.map((r) => ({ ...r, _strippedBrand: b })));
    }
  }
}

const stat = { total: gaps.length, exact: 0, exactNoBrand: 0, brandPlus: 0, none: 0, multiCompany: 0 };
const samples = { exact: [], exactNoBrand: [], brandPlus: [] };

const companyMatchesBrand = (company, brand) => {
  const c = tight(company);
  const b = tight(brand);
  return b.length >= 2 && c.includes(b);
};

for (const g of gaps) {
  const core = tight(g.productName);
  const brand = tight(g.brandName);
  let hit = null;
  let rule = null;
  if (byTight.has(core)) {
    hit = byTight.get(core);
    rule = 'exact';
  } else if (byTight.has(brand + core)) {
    hit = byTight.get(brand + core);
    rule = 'brandPlus';
  } else if (byTightNoBrand.has(core)) {
    hit = byTightNoBrand.get(core);
    rule = 'exactNoBrand';
  }
  if (!hit) {
    stat.none += 1;
    continue;
  }
  const companies = new Set(hit.map((r) => r.companyName));
  if (companies.size > 1) {
    const aligned = hit.filter((r) => companyMatchesBrand(r.companyName, g.brandName));
    if (!aligned.length) {
      stat.multiCompany += 1;
      continue;
    }
  }
  stat[rule] += 1;
  if (samples[rule].length < 6) {
    samples[rule].push({ brand: g.brandName, name: g.productName, mfds: hit[0].productName, company: hit[0].companyName, n: hit.length });
  }
}

console.log(JSON.stringify(stat, null, 1));
console.log(JSON.stringify(samples, null, 1));
