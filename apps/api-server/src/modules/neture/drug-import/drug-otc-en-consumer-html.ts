/**
 * OTC 영문 소비자 HTML 빌더 — 구조화 번역 → 시맨틱 `sd-*` HTML
 *
 * WO-O4O-OTC-EN-TRANSLATION-BATCH-37-V1
 *
 * 한국어 빌더(drug-otc-description-consumer-html.ts)와 같은 `sd-*` 계약(CR-020)을 따르되
 * 라벨만 영어다. 입력은 **번역 결과 파일**(otc-en-translations-v1.json)의 1개 항목.
 *
 * `bodyMarkdown`·`translatorNote` 를 받지 않는다 — 타입 수준에서 내부 주석이 들어올 수 없다(CR-021).
 */

/** 번역 결과 1건 = 그룹당 1개. masterIds 는 저장 단계가 결정하므로 여기 없다. */
export interface DrugOtcEnTranslation {
  groupKey: string;
  title: string;
  /** 경로에 맞는 영어 라벨. oral = 'How to take it' (DR-019 파생값 기반) */
  usageLabel: string;
  efficacy: string;
  usage: string;
  caution: string;
  summaryTable: Record<string, string>;
}

const GMP_FOOT =
  'Medicines are managed to GMP standards through sourcing, manufacturing and quality control. ' +
  'Products with the same ingredient, strength and form are managed to the same standard for quality and effect. ' +
  'Check with a pharmacist by ingredient and strength rather than by product name.';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 문장 단위 분리 — `. ` 뒤가 대문자/괄호일 때만 자른다(약어·소수점 오분할 방지). */
const sentences = (text: string): string[] =>
  text
    .split(/(?<=\.)\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter(Boolean);

export interface BuildEnHtmlResult {
  html: string;
  missing: string[];
}

const REQUIRED = ['title', 'efficacy', 'usage', 'caution', 'summaryTable'] as const;

/** 구조화 영문 번역 → sd-* HTML. 필수 항목이 비면 html='' + missing. */
export function buildDrugOtcEnConsumerHtml(t: DrugOtcEnTranslation): BuildEnHtmlResult {
  const missing: string[] = [];
  for (const f of REQUIRED) {
    const v = t[f];
    if (f === 'summaryTable') {
      if (!v || typeof v !== 'object' || Object.keys(v as object).length === 0) missing.push(f);
    } else if (typeof v !== 'string' || v.trim() === '') missing.push(f);
  }
  if (missing.length) return { html: '', missing };

  const st = t.summaryTable;
  const out: string[] = [];
  out.push('<div class="sd-card">');

  out.push('  <div class="sd-hero">');
  const badges: string[] = [];
  if (st['Category']) badges.push(`<span class="sd-badge is-solid">${esc(st['Category'])}</span>`);
  if (st['How it works']) badges.push(`<span class="sd-badge">${esc(st['How it works'])}</span>`);
  if (badges.length) out.push(`    <div class="sd-badges">${badges.join('')}</div>`);
  out.push(
    `    <h1>${esc(t.title)}${st['Why this one'] ? `<small>${esc(st['Why this one'])}</small>` : ''}</h1>`,
  );
  if (st['Ingredient']) out.push(`    <p class="sd-meta">${esc(st['Ingredient'])}</p>`);
  out.push('  </div>');

  out.push('  <div class="sd-body">');
  out.push(`    <p class="sd-intro">${esc(t.efficacy)}</p>`);

  // summaryTable → sd-core (표 미사용 — 디자인 GUIDE §8-E)
  out.push('    <h2>At a glance</h2>');
  out.push('    <div class="sd-core">');
  for (const [k, v] of Object.entries(st)) {
    if (!v) continue;
    out.push('      <div class="sd-item">');
    out.push(`        <span class="sd-tag">${esc(k)}</span>`);
    out.push(`        <p>${esc(v)}</p>`);
    out.push('      </div>');
  }
  out.push('    </div>');

  out.push(`    <h2>${esc(t.usageLabel)}</h2>`);
  out.push(`    <p class="sd-intake">${esc(t.usage)}</p>`);

  out.push(`    <h2>Before you ${t.usageLabel.includes('use') ? 'use' : 'take'} this</h2>`);
  out.push('    <ul class="sd-who">');
  for (const s of sentences(t.caution)) out.push(`      <li>${esc(s)}</li>`);
  out.push('    </ul>');

  out.push(`    <p class="sd-foot">${esc(GMP_FOOT)}</p>`);
  out.push('  </div>');
  out.push('</div>');

  return { html: out.join('\n'), missing: [] };
}
