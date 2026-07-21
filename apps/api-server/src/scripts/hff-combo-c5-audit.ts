/**
 * Agent C — 신규 영양소 전용 5그룹 ELIGIBLE 감사 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-combo-c5-audit.ts --in <select.json> --combo "A,B" --live <live-stmts.json>
 *
 * 목적: strict select 를 통과한 ELIGIBLE 이 **정말로** 해당 조합 전용인지 독립 검증한다.
 * select 는 `parseSpecs` 가 뽑아낸 spec 집합만 보므로, 아래 두 구멍이 남는다.
 *
 *  (H1) 은닉 원료 — BASE_STANDARD 에 기능성 원료가 있으나 **비율(ratio) 누락 등 비표준 포맷**이라
 *       SPEC_RE 에 걸리지 않으면 spec 집합에서 통째로 사라져 "순수 조합"으로 통과한다.
 *       → 라벨 위치·비율 무관하게 CLS 로 BASE_STANDARD 전문을 재스캔해 TARGET 외 원료를 찾는다.
 *
 *  (H2) 기능성 오귀속 — select 는 TARGET 스코프 registry 귀속(`fnBelongsTo`)을 쓴다. 조합 내에
 *       기능성 문장이 겹치는 원료가 함께 있으면(예: 비타민D 의 "칼슘과 인이 흡수되고…" ↔ 칼슘)
 *       잘못된 원료에 붙어도 unattributed 가 0 이라 통과한다.
 *       → 감사 파서(`parseFnAttribution`, 명시 구조 우선)와 대조해 DISAGREE 를 표면화한다.
 *
 * 판정은 하지 않고 **표면화만** 한다(생산 파서 수정 없음).
 */
import '../env-loader.js';
import fs from 'node:fs';
import { CLS, NONFUNC, normalizeSpecText, parseFnAttribution } from './hff-source-parse.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const IN = arg('in'); const COMBO = arg('combo'); const LIVE = arg('live');
if (!IN || !COMBO) throw new Error('--in <select.json> --combo "A,B" 필요');
const TARGET = COMBO.split(/[,+]/).map((x) => x.trim());
const liveSet: Set<string> = LIVE && fs.existsSync(LIVE) ? new Set(JSON.parse(fs.readFileSync(LIVE, 'utf8')) as string[]) : new Set();

interface Ing { key: string; functionsKo: string[] }
interface Item { statementNo: string; productName: string; ingredients: Ing[]; source: { mainFunction: string; baseStandard: string } }
const items: Item[] = JSON.parse(fs.readFileSync(IN, 'utf8'));

const hiddenRows: Array<{ stmt: string; name: string; extras: string[]; evidence: string }> = [];
const disagreeRows: Array<{ stmt: string; name: string; mode: string; detail: string }> = [];
const dupRows: Array<{ stmt: string; name: string }> = [];
const unclassRows: Array<{ stmt: string; name: string; labels: string[] }> = [];

for (const it of items) {
  if (liveSet.has(it.statementNo)) dupRows.push({ stmt: it.statementNo, name: it.productName });

  // (H1) BASE_STANDARD 전문 재스캔 — 비율 유무와 무관하게 원료 라벨 등장 자체를 본다.
  const b = normalizeSpecText(it.source.baseStandard ?? '');
  // 라벨:값 형태의 규격 항목만 대상(문장 속 우연 언급 배제). 비율 요구 없음 = select 보다 느슨.
  const labelHits = [...b.matchAll(/([가-힣A-Za-z0-9()\-·]{1,20}(?:\s[가-힣A-Za-z0-9()\-·]{1,12})?)\s*[:：]/g)];
  const found = new Set<string>();
  const ev: string[] = [];
  for (const m of labelHits) {
    const label = m[1].trim();
    if (NONFUNC.test(label)) continue;
    for (const c of CLS) {
      if (!c.re.test(label)) continue;
      if (TARGET.includes(c.k)) break;
      if (!found.has(c.k)) { found.add(c.k); ev.push(b.slice(m.index ?? 0, (m.index ?? 0) + 60).trim()); }
      break;
    }
  }
  if (found.size) hiddenRows.push({ stmt: it.statementNo, name: it.productName, extras: [...found], evidence: ev.slice(0, 2).join(' ⋯ ') });

  // (H3) **미분류 기능성 규격 라벨** — `라벨 : 값단위/기준단위` 형태인데 CLS 로 분류되지 않는 항목.
  //  select 의 `unknown` 카운터는 SPEC_RE 가 **매칭에 성공했을 때만** 채워진다. 비율 표기가
  //  `9.9mg/850mg(표시량의 80~120%)` 처럼 기준량 뒤 괄호 안에 오면 SPEC_RE 자체가 불발 →
  //  라벨이 unknownLabels 에도 안 잡히고 통째로 사라져 "순수 조합"으로 통과한다(은닉 원료).
  const unkRows: string[] = [];
  for (const m of b.matchAll(/([가-힣A-Za-z0-9()\-·]{1,20}(?:\s(?:함량|표시량|[가-힣A-Za-z0-9()\-·]{1,12}))?)\s*[:：]\s*(?:표시량\s*)?\(?\s*[\d][\d,.]*\s*(?:mg|g|μg|mcg|IU)[^\n○]{0,40}\/\s*[\d][\d,.]*\s*(?:mg|g)/g)) {
    const label = m[1].trim().replace(/\s*(?:함량|표시량)$/, '');
    if (NONFUNC.test(label)) continue;
    if (CLS.some((c) => c.re.test(label))) continue;
    unkRows.push(`${label} :: ${m[0].slice(0, 55).trim()}`);
  }
  if (unkRows.length) unclassRows.push({ stmt: it.statementNo, name: it.productName, labels: [...new Set(unkRows)] });

  // (H2) 감사 파서 귀속과 대조
  const fp = parseFnAttribution(it.source.mainFunction ?? '');
  const prodMap = new Map(it.ingredients.map((g) => [g.key, new Set(g.functionsKo.map((f) => f.replace(/\s+/g, '')))]));
  const diffs: string[] = [];
  for (const [k, fns] of fp.byKey) {
    if (!TARGET.includes(k)) { diffs.push(`감사=TARGET외 원료 '${k}' 에 기능성 귀속(${fns.length})`); continue; }
    const p = prodMap.get(k);
    for (const f of fns) if (p && !p.has(f.replace(/\s+/g, ''))) diffs.push(`'${k}' 감사에만: ${f.slice(0, 30)}`);
  }
  for (const [k, p] of prodMap) {
    const a = fp.byKey.get(k);
    for (const f of p) if (!a || ![...a].some((x) => x.replace(/\s+/g, '') === f)) diffs.push(`'${k}' 생산에만: ${f.slice(0, 30)}`);
  }
  if (diffs.length) disagreeRows.push({ stmt: it.statementNo, name: it.productName, mode: fp.mode, detail: diffs.slice(0, 3).join(' / ') });
}

const modeCount: Record<string, number> = {};
for (const it of items) { const m = parseFnAttribution(it.source.mainFunction ?? '').mode; modeCount[m] = (modeCount[m] ?? 0) + 1; }

console.log(`═══ ${COMBO} — ELIGIBLE ${items.length} 감사 ═══`);
console.log(`기존 LIVE/기생산 중복: ${dupRows.length}`);
console.log(`H1 은닉 기능성 원료(비표준 포맷): ${hiddenRows.length}`);
console.log(`H2 귀속 DISAGREE(생산 vs 감사): ${disagreeRows.length}  · 감사 mode ${JSON.stringify(modeCount)}`);
console.log(`H3 미분류 기능성 규격 라벨(은닉 원료): ${unclassRows.length}`);
for (const r of unclassRows.slice(0, 8)) console.log(`  [H3] ${r.stmt} ${r.name.slice(0, 26)} → ${r.labels.slice(0, 2).join(' | ').slice(0, 95)}`);
for (const r of hiddenRows.slice(0, 5)) console.log(`  [H1] ${r.stmt} ${r.name.slice(0, 28)} → ${r.extras.join(',')} | ${r.evidence.slice(0, 70)}`);
for (const r of disagreeRows.slice(0, 5)) console.log(`  [H2] ${r.stmt} ${r.name.slice(0, 24)} (${r.mode}) ${r.detail.slice(0, 100)}`);
const OUT = arg('out');
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ combo: COMBO, eligible: items.length, dup: dupRows, hidden: hiddenRows, unclassified: unclassRows, disagree: disagreeRows, modeCount }, null, 1));
