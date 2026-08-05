/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 6 독립검증 (전량)
 *
 * **생산기(`pilot-contract.mjs`)와 생산 스크립트를 import 하지 않는다.** 같은 분할기·같은 정규식으로
 * 검증하면 같은 버그를 함께 통과시킨다. 여기서는 연속 부분문자열 포함·문자 다중집합·독립 토큰
 * 정규식·HTML 역구성 chrome 을 쓴다. 파일럿에서 음성 대조 8종으로 검증력을 증명한 검증기다.
 *
 * 전량 축(WO §6): 16축 + itemSeq 귀속 / source hash 일치 / 문장 절단 / 의료 내용 추가 /
 * 원문 항목 누락 / HOLD 문서 생산 / 전문의약품 생산.
 *
 * 실패 master 는 apply 대상에서 제외하고 문제 큐에 적재한다. 개별 실패는 전체를 멈추지 않는다.
 *
 * 산출 (results/):
 *   independent-verification.json  집계 (추적)
 *   verify-failures.jsonl          실패 master 와 축 (추적)
 *   apply-eligible.jsonl           검증 통과 masterId (미추적 — 재생성 가능)
 *
 * 사용: node verify-independent.mjs [--inject <type>]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

const squash = (s) => String(s ?? '').replace(/\s+/g, '');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const stripTags = (h) => unesc(h.replace(/<[^>]+>/g, '\n'));

const ALLOWED_CHROME = [
  '일반의약품', '제품 개요', '효능·효과', '사용 방법', '사용하면 안 되는 경우',
  '사용 전 상담이 필요한 경우', '사용 중 주의사항', '이상반응', '상호작용', '보관 방법',
  '제품명', '제조·수입사', '제형', '품목기준코드',
].map(squash);
const FOOT = squash('이 설명서는 매장 상담을 돕기 위한 자료입니다. 사용 전 매장 약사에게 문의하세요. 증상이 나아지지 않거나 이상이 느껴지면 사용을 멈추고 의사·약사와 상의하세요.');

/**
 * 생산기와 다른 규칙: 개행(원문 자체의 구조적 경계)으로 먼저 자르고, 마침표 뒤에서 자르되
 * 소수점(뒤 글자가 숫자)만 피한다. 개행을 무시하면 "(1회용에 한함)" 같은 괄호 단독 줄이
 * 다음 문장과 한 항목으로 붙어 실제로는 보존된 내용이 손실로 보인다(검증기 자체의 오탐).
 */
const altSplit = (s) => String(s ?? '').split(/\n+/)
  .flatMap((line) => line.split(/(?<=\.)(?!\d)/))
  .map((x) => x.trim()).filter(Boolean);

/** 소수점 보호 규칙이 "…마십시오.2주일" 처럼 **숫자로 시작하는 다음 문장**에서 분할을 막는다. */
const altSplitAllPeriods = (s) => String(s ?? '').split(/\n+/)
  .flatMap((line) => line.split(/(?<=\.)/))
  .map((x) => x.trim()).filter(Boolean);

const tok = {
  digits: (s) => String(s ?? '').match(/\d+(?:[.,]\d+)?/g) ?? [],
  age: (s) => String(s ?? '').match(/\d+\s*(?:세|개월|살)|소아|영아|유아|어린이|청소년|고령자|노인|임부|수유부/g) ?? [],
  freq: (s) => String(s ?? '').match(/\d+\s*(?:회|번)/g) ?? [],
  interval: (s) => String(s ?? '').match(/\d+\s*시간/g) ?? [],
  negation: (s) => String(s ?? '').match(/마십시오|마시오|마세요|말\s*것|안\s*됩니다|않습니다|않도록|금기|금지|금합니다|삼가|피하십시오|피하시오/g) ?? [],
  strength: (s) => String(s ?? '').match(/절대|반드시|즉시|중대한|치명적|응급|위험/g) ?? [],
  route: (s) => String(s ?? '').match(/복용|내복|경구|삼키|삼켜|먹|바르|바릅|발라|도포|붙이|붙입|부착|점안|점적|삽입|주입|씹어|가글|함수|뿌리|분무/g) ?? [],
};
const bag = (a) => a.reduce((m, t) => { const k = squash(t); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const shortfall = (src, out) => {
  const A = bag(src); const B = bag(out); const bad = [];
  for (const k of Object.keys(A)) if ((B[k] ?? 0) < A[k]) bad.push(`${k}(${A[k]}>${B[k] ?? 0})`);
  return bad;
};

function safetySectionText(html) {
  const out = [];
  for (const label of ['사용하면 안 되는 경우', '사용 전 상담이 필요한 경우', '사용 중 주의사항']) {
    const re = new RegExp(`<h2>${label}</h2>\\s*<ul class="sd-warn">([\\s\\S]*?)</ul>`);
    const m = html.match(re);
    if (m) for (const li of m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)) out.push(unesc(li[1]));
  }
  return out.join('\n');
}

function charDiff(a, b) {
  const A = {}; const B = {};
  for (const c of a) A[c] = (A[c] ?? 0) + 1;
  for (const c of b) B[c] = (B[c] ?? 0) + 1;
  const missing = []; const extra = [];
  for (const c of Object.keys(A)) if ((B[c] ?? 0) < A[c]) missing.push(c);
  for (const c of Object.keys(B)) if ((A[c] ?? 0) < B[c]) extra.push(c);
  return { missing, extra };
}

const FIELDS = ['efcyQesitm', 'useMethodQesitm', 'atpnWarnQesitm', 'atpnQesitm', 'seQesitm', 'intrcQesitm', 'depositMethodQesitm'];
const CONTIGUOUS = ['efcyQesitm', 'useMethodQesitm', 'seQesitm', 'intrcQesitm', 'depositMethodQesitm'];

const INJECT = {
  drop_sentence: [/<li>/, (h) => h.replace(/ *<li>[\s\S]*?<\/li>\n/, '')],
  truncate: [/sd-intake/, (h) => h.replace(/(<p class="sd-intake">)([\s\S]{0,30})[\s\S]*?(<\/p>)/, '$1$2$3')],
  change_number: [/1일 \d/, (h) => h.replace(/1일 (\d)/, (m, d) => `1일 ${Number(d) + 1}`)],
  drop_negation: [/하지 마십시오/, (h) => h.replace('하지 마십시오', '하십시오')],
  route_swap: [/복용/, (h) => h.replace(/복용/g, '사용')],
  add_medical: [/<h2>이상반응<\/h2>/, (h) => h.replace('<h2>이상반응</h2>', '<h2>이상반응</h2>\n    <ul class="sd-warn"><li>이 약은 감기 예방에도 효과가 있습니다.</li></ul>')],
  foreign_product: [/sd-intro/, (h) => h.replace(/<p class="sd-intro">[\s\S]*?<\/p>/, '<p class="sd-intro">이 약은 무좀, 백선의 치료에 사용합니다.</p>')],
  wrong_itemseq: [/<p>\d{9}<\/p>/, (h) => h.replace(/<p>\d{9}<\/p>/, '<p>999999999</p>')],
};

/**
 * master 1건 검증. 반환값은 축별 결함 배열이다(빈 객체 = 통과).
 * LIVE 적용 후 DB 본문 재검증(단계 12)도 **같은 검증기**를 쓴다 — 파일이 아니라 DB 바이트를 넣는다.
 */
export function verifyOne(p, leaf, src, ledEntry, skipHash) {
  const bad = {};
  const add = (k, v) => { (bad[k] ??= []).push(v); };
  const html = leaf.html;
  const plain = stripTags(html);
  const flat = squash(plain);

  if (!html.includes(`<p>${p.itemSeq}</p>`)) add('attributionWrong', p.itemSeq);
  if (!skipHash && ledEntry && ledEntry.generatedContentHash !== sha256(html)) add('contentHashMismatch', '');
  if (leaf.officialSourceHash !== src.sourceHash) add('sourceHashMismatch', '');
  if (leaf.officialSourceHash !== p.officialSourceHash) add('sourceHashMismatch', 'population');

  for (const need of ['<h2>효능·효과</h2>', '<h2>사용 방법</h2>']) {
    if (!html.includes(need)) add('requiredSectionMissing', need);
  }

  for (const f of CONTIGUOUS) {
    const s = squash(src[f]);
    if (s && !flat.includes(s)) add('truncated', f);
  }
  const safetySrcChars = squash(`${src.atpnWarnQesitm ?? ''}${src.atpnQesitm ?? ''}`);
  const safetyOutChars = squash(safetySectionText(html));
  const cd = charDiff(safetySrcChars, safetyOutChars);
  if (cd.missing.length || cd.extra.length) add('truncated', `safety:-${cd.missing.slice(0, 6).join('')}+${cd.extra.slice(0, 6).join('')}`);
  for (const f of ['atpnWarnQesitm', 'atpnQesitm']) {
    for (const item of altSplit(src[f])) {
      const head = squash(item).slice(0, 12);
      if (head.length < 6 || safetyOutChars.includes(head)) continue;
      // 항목 머리가 통째로 안 보이면, **그 항목을 더 잘게 쪼개** 각 조각의 머리를 다시 본다.
      // 문장 경계 판정 차이로 두 문장이 한 항목으로 붙은 경우를 손실로 오인하지 않기 위한 것이고,
      // 조각 중 하나라도 없으면 그대로 손실로 잡는다(검출력은 낮추지 않는다).
      const pieces = altSplitAllPeriods(item);
      const missing = pieces.map((x) => squash(x).slice(0, 12))
        .filter((h) => h.length >= 6 && !safetyOutChars.includes(h));
      if (pieces.length < 2 || missing.length) add('truncated', `${f}:${missing[0] ?? head}`);
    }
  }

  const selfAll = squash(FIELDS.map((f) => src[f] ?? '').join(''));
  const chromeBlob = [...ALLOWED_CHROME, FOOT, squash(p.productName), squash(src.itemName),
    squash(src.entpName), squash(p.dosageForm ?? ''), squash(p.itemSeq)].filter(Boolean).join('|');
  for (const raw of plain.split('\n')) {
    const s = squash(raw);
    if (!s || chromeBlob.includes(s)) continue;
    if (!selfAll.includes(s)) add('medicalAddition', s.slice(0, 32));
  }
  for (const m of html.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
    const s = squash(unesc(m[1]));
    if (ALLOWED_CHROME.includes(s)) add('labelInvasion', s.slice(0, 24));
  }

  const wholeSrc = FIELDS.map((f) => src[f] ?? '').join('\n');
  const push = (arr, key) => { if (arr.length) add(key, arr.slice(0, 4).join(',')); };
  push(shortfall(tok.digits(wholeSrc), tok.digits(plain)), 'numericChanged');
  push(shortfall(tok.age(wholeSrc), tok.age(plain)), 'numericChanged');
  push(shortfall(tok.freq(wholeSrc), tok.freq(plain)), 'numericChanged');
  push(shortfall(tok.interval(wholeSrc), tok.interval(plain)), 'numericChanged');
  push(shortfall(tok.negation(wholeSrc), tok.negation(plain)), 'negationLost');
  push(shortfall(tok.strength(wholeSrc), tok.strength(plain)), 'strengthWeakened');
  push(shortfall(tok.route(wholeSrc), tok.route(plain)), 'routeChanged');
  return bad;
}

function main() {
  const injectType = (() => { const i = process.argv.indexOf('--inject'); return i >= 0 ? process.argv[i + 1] : null; })();
  const population = readJsonl(path.join(RESULTS, 'population.jsonl'));
  const ledger = new Map(readJsonl(path.join(RESULTS, 'production-ledger.jsonl')).map((r) => [r.masterId, r]));
  const leaflets = readJsonl(path.join(RESULTS, 'leaflets.jsonl'));
  const frozen = new Map(readJsonl(path.join(RESULTS, 'frozen-source.jsonl')).map((r) => [r.itemSeq, r]));
  const byMaster = new Map(leaflets.map((l) => [l.masterId, l]));
  const pop = new Map(population.map((p) => [p.masterId, p]));

  let injectedMaster = null;
  if (injectType) {
    const spec = INJECT[injectType];
    if (!spec) throw new Error(`STOP: 알 수 없는 주입 유형 ${injectType}`);
    const [match, fn] = spec;
    // 패턴이 없는 본문에 주입하면 "무변경"이 되어 통과한 것처럼 보인다 — 반드시 대상을 고른다.
    const victim = leaflets.find((l) => match.test(l.html));
    if (!victim) throw new Error(`STOP: ${injectType} 주입 대상 없음`);
    injectedMaster = victim.masterId;
    byMaster.set(victim.masterId, { ...victim, html: fn(victim.html) });
  }

  const axisCount = {}; const failures = []; const eligible = [];
  const global = { holdProduced: [], professionalProduced: [], orphanLeaflet: [], readyWithoutLeaflet: [] };

  // 전역 축: HOLD·전문의약품이 생산되었는가 / 모집단 밖 본문이 있는가
  for (const l of leaflets) {
    const p = pop.get(l.masterId);
    if (!p) { global.orphanLeaflet.push(l.masterId); continue; }
    if (p.state !== 'PRODUCTION_READY') global.holdProduced.push(l.masterId);
    if ((p.classKinds ?? []).some((k) => k.includes('전문'))) global.professionalProduced.push(l.masterId);
  }
  const readySet = population.filter((p) => p.state === 'PRODUCTION_READY');
  for (const p of readySet) if (!byMaster.has(p.masterId)) global.readyWithoutLeaflet.push(p.masterId);

  for (const l of leaflets) {
    const p = pop.get(l.masterId);
    if (!p) continue;
    const src = frozen.get(p.itemSeq);
    const leaf = byMaster.get(l.masterId);
    if (!src) { failures.push({ masterId: l.masterId, itemSeq: p.itemSeq, axes: { frozenSourceMissing: [''] } }); continue; }
    const bad = verifyOne(p, leaf, src, ledger.get(l.masterId), !!injectType);
    if (Object.keys(bad).length) {
      failures.push({
        masterId: l.masterId, itemSeq: p.itemSeq,
        axes: Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, v.slice(0, 5)])),
      });
      for (const k of Object.keys(bad)) axisCount[k] = (axisCount[k] ?? 0) + 1;
    } else {
      eligible.push(l.masterId);
    }
  }

  const globalFail = Object.values(global).some((v) => v.length > 0);
  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: '6-independent-verification',
    importsProducer: false,
    productionReady: readySet.length,
    verified: leaflets.length,
    passed: eligible.length,
    failed: failures.length,
    axisFailMasters: axisCount,
    globalChecks: Object.fromEntries(Object.entries(global).map(([k, v]) => [k, v.length])),
    samples: failures.slice(0, 5),
    inject: injectType,
    injectedMaster,
    dbWrites: 0,
    result: failures.length === 0 && !globalFail ? 'PASS' : 'FAIL',
  };
  if (injectType) { process.stdout.write(`${injectType} → ${out.result} failed=${out.failed} ${JSON.stringify(out.axisFailMasters)}\n`); return; }

  fs.writeFileSync(path.join(RESULTS, 'verify-failures.jsonl'), failures.map((r) => JSON.stringify(r)).join('\n') + (failures.length ? '\n' : ''), 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'apply-eligible.jsonl'), eligible.map((id) => JSON.stringify({ masterId: id })).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'independent-verification.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

// 직접 실행할 때만 전량 검증을 돌린다. 단계 12 가 verifyOne 만 import 해도 재실행되지 않는다.
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (invokedDirectly) main();
