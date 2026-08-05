/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1 — 단계 8 독립검증
 *
 * **생산기(`pilot-contract.mjs`)를 import 하지 않는다.** 같은 분할기·같은 정규식으로 검증하면
 * 같은 버그를 함께 통과시킨다(선행 트랙에서 실제로 그렇게 새어 나갔다). 여기서는
 *   · 항목 분할을 쓰지 않고 **연속 부분문자열 포함**으로 손실을 본다
 *   · 라벨·푸터 목록을 생산기에서 가져오지 않고 **HTML 에서 실측한 뒤 화이트리스트와 대조**한다
 *   · 토큰 정규식을 독립적으로 다시 쓴다
 *
 * 산출: results/independent-verification.json
 * 사용: node verify-independent.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

const squash = (s) => String(s ?? '').replace(/\s+/g, '');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const stripTags = (h) => unesc(h.replace(/<[^>]+>/g, '\n'));

/** 우리가 붙인 것으로 **허용**되는 문자열. 이 밖의 문자열은 전부 원문에서 와야 한다. */
const ALLOWED_CHROME = [
  '일반의약품', '제품 개요', '효능·효과', '사용 방법', '사용하면 안 되는 경우',
  '사용 전 상담이 필요한 경우', '사용 중 주의사항', '이상반응', '상호작용', '보관 방법',
  '제품명', '제조·수입사', '제형', '품목기준코드',
].map(squash);
const FOOT = squash('이 설명서는 매장 상담을 돕기 위한 자료입니다. 사용 전 매장 약사에게 문의하세요. 증상이 나아지지 않거나 이상이 느껴지면 사용을 멈추고 의사·약사와 상의하세요.');

/** 생산기와 다른 규칙: 마침표 뒤에서 자르되 소수점(뒤 글자가 숫자)만 피한다. */
const altSplit = (s) => String(s ?? '').split(/(?<=\.)(?!\d)/).map((x) => x.trim()).filter(Boolean);

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

/** 안전 3영역(`사용하면 안 되는 경우`·`사용 전 상담`·`사용 중 주의사항`) 의 li 텍스트만 모은다. */
function safetySectionText(html) {
  const out = [];
  for (const label of ['사용하면 안 되는 경우', '사용 전 상담이 필요한 경우', '사용 중 주의사항']) {
    const re = new RegExp(`<h2>${label}</h2>\\s*<ul class="sd-warn">([\\s\\S]*?)</ul>`);
    const m = html.match(re);
    if (m) for (const li of m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)) out.push(unesc(li[1]));
  }
  return out.join('\n');
}

/** 문자 다중집합 차이. 순서 변경은 허용하고 삭제·추가만 잡는다. */
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
/** 이 필드들은 재배치 대상이 아니므로 **원문 전체가 연속으로** 남아 있어야 한다. */
const CONTIGUOUS = ['efcyQesitm', 'useMethodQesitm', 'seQesitm', 'intrcQesitm', 'depositMethodQesitm'];

/**
 * 음성 대조군. 검증기가 실제로 결함을 잡는지 증명하려고 **일부러 망가뜨린 본문**을 넣는다.
 * `--inject <type>` 로 첫 건에만 적용한다. 산출물은 건드리지 않는다(메모리 안에서만).
 */
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

function main() {
  const injectType = (() => { const i = process.argv.indexOf('--inject'); return i >= 0 ? process.argv[i + 1] : null; })();
  const pilot = readJsonl(path.join(RESULTS, 'pilot-selection.jsonl'));
  const ledger = readJsonl(path.join(RESULTS, 'leaflet-ledger.jsonl'));
  const leaflets = readJsonl(path.join(RESULTS, 'leaflets.jsonl'));
  const api = new Map(readJsonl(path.join(RESULTS, 'source-snapshot.jsonl')).map((r) => [r.itemSeq, r]));
  const byMaster = new Map(leaflets.map((l) => [l.masterId, l]));
  if (injectType) {
    const spec = INJECT[injectType];
    if (!spec) throw new Error(`STOP: 알 수 없는 주입 유형 ${injectType}`);
    const [match, fn] = spec;
    // 패턴이 없는 본문에 주입하면 "무변경"이 되어 검증기가 통과한 것처럼 보인다 — 반드시 대상을 고른다.
    const victim = leaflets.find((l) => match.test(l.html));
    if (!victim) throw new Error(`STOP: ${injectType} 주입 대상 없음`);
    byMaster.set(victim.masterId, { ...victim, html: fn(victim.html) });
  }

  const fail = {
    populationMismatch: [], attributionWrong: [], foreignSource: [], requiredSectionMissing: [],
    medicalAddition: [], numericChanged: [], negationLost: [], strengthWeakened: [],
    routeChanged: [], truncated: [], labelInvasion: [], md5Mismatch: [], missingHtmlNotHold: [],
  };

  // V1 — 모집단 일치
  const pilotIds = new Set(pilot.map((p) => p.masterId));
  const ledgerIds = new Set(ledger.map((l) => l.masterId));
  if (pilotIds.size !== 500) fail.populationMismatch.push(`pilot=${pilotIds.size}`);
  if (ledgerIds.size !== pilotIds.size) fail.populationMismatch.push(`ledger=${ledgerIds.size}`);
  for (const id of pilotIds) if (!ledgerIds.has(id)) fail.populationMismatch.push(`missing:${id}`);

  for (const p of pilot) {
    const led = ledger.find((l) => l.masterId === p.masterId);
    const leaf = byMaster.get(p.masterId);
    if (!leaf) {
      // 본문이 없는 건은 반드시 비-PASS 판정이어야 한다.
      if (led?.verdict === 'PILOT_PASS') fail.missingHtmlNotHold.push(p.masterId);
      continue;
    }
    const src = api.get(p.itemSeq);
    if (!src) { fail.foreignSource.push(p.masterId); continue; }

    const html = leaf.html;
    const plain = stripTags(html);
    const flat = squash(plain);

    // V2 — itemSeq 귀속
    if (!html.includes(`<p>${p.itemSeq}</p>`)) fail.attributionWrong.push(`${p.masterId}:${p.itemSeq}`);
    // 주입 모드에서는 md5 불일치가 당연하므로 끈다 — 내용 축이 잡는지가 시험 대상이다.
    if (!injectType && led && led.newMd5 !== crypto.createHash('md5').update(html, 'utf8').digest('hex')) fail.md5Mismatch.push(p.masterId);

    // V3 — 필수 섹션
    for (const need of ['<h2>효능·효과</h2>', '<h2>사용 방법</h2>']) {
      if (!html.includes(need)) fail.requiredSectionMissing.push(`${p.masterId}:${need}`);
    }

    // V4 — 문장 절단 / 손실: 재배치 없는 필드는 원문 전체가 연속으로 남아야 한다
    for (const f of CONTIGUOUS) {
      const s = squash(src[f]);
      if (s && !flat.includes(s)) fail.truncated.push(`${p.masterId}:${f}`);
    }
    // 재배치 대상(atpn 계열)은 연속성을 요구할 수 없다 — 항목이 3버킷으로 흩어지는 것이 계약이다.
    // 대신 **문자 다중집합 동일성**으로 본다. 분할 규칙에 의존하지 않으므로 생산기와 독립이고,
    // 삭제·절단·중복·추가를 전부 잡는다(허용되는 것은 순서 변경뿐이다).
    const safetySrcChars = squash(`${src.atpnWarnQesitm ?? ''}${src.atpnQesitm ?? ''}`);
    const safetyOutChars = squash(safetySectionText(html));
    const cd = charDiff(safetySrcChars, safetyOutChars);
    if (cd.missing.length || cd.extra.length) {
      fail.truncated.push(`${p.masterId}:safety:-${cd.missing.slice(0, 6).join('')}+${cd.extra.slice(0, 6).join('')}`);
    }
    // 안전 항목 하나가 통째로 사라지는 경우까지 잡으려면 다중집합만으로는 약하다(문자 재배열).
    // 그래서 **생산기와 다른 분할기**로 나눈 항목이 세 버킷 텍스트 어딘가에 있는지도 본다.
    // 단, 버킷 경계에서 끊긴 항목은 손실이 아니므로 **앞 12자 존재**만 요구한다.
    for (const f of ['atpnWarnQesitm', 'atpnQesitm']) {
      for (const item of altSplit(src[f])) {
        const head = squash(item).slice(0, 12);
        if (head.length >= 6 && !safetyOutChars.includes(head)) {
          fail.truncated.push(`${p.masterId}:${f}:${head}`);
        }
      }
    }

    // V5 — 원문에 없는 의료 내용 추가 / 다른 제품 혼입
    const selfAll = squash(FIELDS.map((f) => src[f] ?? '').join(''));
    // 제품명·업체명은 원문에 줄바꿈이 들어 있어 조각으로 나뉠 수 있다 → 한 덩어리로 이어 붙여 포함 검사한다.
    const chromeBlob = [...ALLOWED_CHROME, FOOT, squash(p.productName), squash(src.itemName),
      squash(src.entpName), squash(p.dosageForm ?? ''), squash(p.itemSeq)].filter(Boolean).join('|');
    for (const raw of plain.split('\n')) {
      const s = squash(raw);
      if (!s || chromeBlob.includes(s)) continue;
      if (!selfAll.includes(s)) fail.medicalAddition.push(`${p.masterId}:${s.slice(0, 32)}`);
    }
    // V6 — 라벨 침범: 우리 라벨이 **항목 그 자체로** 새어 들어갔는지.
    // 원문 문장이 "이상반응…" 으로 시작하는 것은 정상이므로 prefix 가 아니라 완전일치로 본다.
    for (const m of html.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
      const s = squash(unesc(m[1]));
      if (ALLOWED_CHROME.includes(s)) fail.labelInvasion.push(`${p.masterId}:${s.slice(0, 24)}`);
    }

    // V7 — 토큰 보존 (원문 전체 ⊆ 출력 전체)
    const wholeSrc = FIELDS.map((f) => src[f] ?? '').join('\n');
    const push = (arr, key) => { if (arr.length) fail[key].push(`${p.masterId}:${arr.slice(0, 4).join(',')}`); };
    // 토큰은 **공백을 지우기 전 텍스트**에서 뽑는다. squash 후에 뽑으면 "5, 6" 이 "5,6" 한 토큰으로 붙어
    // 실제로는 보존된 숫자가 손실로 보인다(검증기 자체의 오탐).
    push(shortfall(tok.digits(wholeSrc), tok.digits(plain)), 'numericChanged');
    push(shortfall(tok.age(wholeSrc), tok.age(plain)), 'numericChanged');
    push(shortfall(tok.freq(wholeSrc), tok.freq(plain)), 'numericChanged');
    push(shortfall(tok.interval(wholeSrc), tok.interval(plain)), 'numericChanged');
    push(shortfall(tok.negation(wholeSrc), tok.negation(plain)), 'negationLost');
    push(shortfall(tok.strength(wholeSrc), tok.strength(plain)), 'strengthWeakened');
    push(shortfall(tok.route(wholeSrc), tok.route(plain)), 'routeChanged');
  }

  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1',
    step: '8-independent-verification',
    importsProducer: false,
    pilot: pilot.length, withHtml: leaflets.length,
    checks: Object.fromEntries(Object.entries(fail).map(([k, v]) => [k, v.length])),
    samples: Object.fromEntries(Object.entries(fail).filter(([, v]) => v.length).map(([k, v]) => [k, v.slice(0, 5)])),
    inject: injectType,
    dbWrites: 0,
    result: Object.values(fail).every((v) => v.length === 0) ? 'PASS' : 'FAIL',
  };
  if (injectType) { process.stdout.write(`${injectType} → ${out.result} ${JSON.stringify(out.checks)}\n`); return; }
  fs.writeFileSync(path.join(RESULTS, 'independent-verification.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main();
