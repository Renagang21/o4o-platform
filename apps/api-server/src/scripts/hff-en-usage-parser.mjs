/**
 * WO-...-TOP1000 / 섭취방법(USAGE) 조합 파서.
 *
 * 섭취방법 문장은 자유형이지만 구성요소는 유한하다.
 *   [대상] 1일 N회, 1회 M단위(용량)를 [방법] 섭취[종결]
 * 토큰을 모두 인식했을 때만 영어를 조립하고, 하나라도 모르면 null 을 돌려 HOLD 한다.
 * 수치·단위·횟수는 원문 값을 그대로 옮긴다.
 */

const UNIT_EN = {
  정: ['tablet', 'tablets'], 캡슐: ['capsule', 'capsules'], 캅셀: ['capsule', 'capsules'],
  포: ['stick pack', 'stick packs'], 스틱: ['stick', 'sticks'], 병: ['bottle', 'bottles'],
  앰플: ['ampoule', 'ampoules'], 매: ['sheet', 'sheets'], 환: ['pill', 'pills'],
  알: ['piece', 'pieces'], 개: ['piece', 'pieces'], 스푼: ['spoonful', 'spoonfuls'],
  수저: ['spoonful', 'spoonfuls'], 티스푼: ['teaspoonful', 'teaspoonfuls'],
};
const MEASURE = /^(?:g|kg|mg|㎎|ml|mL|㎖|L|㎕|cc)$/;

const num = (s) => s.replace(/\s/g, '');
const times = (n) => (n === '1' ? 'once' : n === '2' ? 'twice' : `${n} times`);
const plural = (q, u) => {
  const one = /^1(?:\.0+)?$/.test(q);
  return UNIT_EN[u] ? UNIT_EN[u][one ? 0 : 1] : u;
};

// 섭취 방법 토큰
const HOW = [
  [/충분한\s*물과\s*함께/, 'with plenty of water'],
  [/충분히\s*물과\s*함께/, 'with plenty of water'],
  [/충분한\s*물로/, 'with plenty of water'],
  [/물과\s*함께/, 'with water'],
  [/물\s*없이/, 'without water'],
  [/물이나\s*음용수와\s*함께/, 'with water or drinking water'],
  [/물,?\s*음료\s*등과\s*같이/, 'with water or a beverage'],
  [/물이나\s*음료에\s*(?:타서|혼합하여)/, 'mixed into water or a beverage'],
  [/우유나\s*두유,?\s*물,?\s*쥬스에\s*혼합하여/, 'mixed into milk, soy milk, water or juice'],
  [/우유나\s*두유,?\s*물에\s*혼합하여/, 'mixed into milk, soy milk or water'],
  [/온수\s*(?:또는|나)\s*냉수에\s*(?:넣어\s*잘\s*녹인\s*후|타서|용해하여|넣고\s*저은\s*후)/, 'dissolved in warm or cold water'],
  [/냉\.?\s*온수에\s*타서/, 'dissolved in cold or warm water'],
  [/냉수\s*또는\s*온수에\s*(?:용해하여|타서)/, 'dissolved in cold or warm water'],
  [/온,?\s*냉수에\s*타서/, 'dissolved in warm or cold water'],
  [/물에\s*녹여/, 'dissolved in water'],
  [/물에\s*타서/, 'mixed into water'],
  [/물에\s*희석하여/, 'diluted in water'],
  [/씹거나\s*삼키지\s*말고\s*입안에서\s*천천히\s*녹여/, 'by letting it dissolve slowly in the mouth without chewing or swallowing'],
  [/입안에서\s*(?:천천히\s*)?녹여/, 'by letting it dissolve in the mouth'],
  [/충분히\s*씹어서/, 'by chewing thoroughly'],
  [/씹거나\s*녹여서/, 'by chewing or letting it dissolve'],
  [/씹어서/, 'by chewing'],
  [/씹어/, 'by chewing'],
  [/그대로\s*(?:또는|혹은)\s*물과\s*함께/, 'as is or with water'],
  [/그대로\s*섭취하거나\s*물과\s*함께/, 'as is or with water'],
  [/직접\s*(?:또는|혹은)\s*물과\s*함께/, 'directly or with water'],
  [/직접\s*섭취하거나\s*물,?\s*음료\s*등과\s*같이/, 'directly or with water or a beverage'],
  [/그대로\s*\(직접\)/, 'as is'],
  [/그대로/, 'as is'],
  [/직접/, 'directly'],
  [/흔들어/, 'after shaking'],
];
const WHEN = [
  [/식후에?/, 'after a meal'], [/식전에?/, 'before a meal'],
  [/식전·?식후\s*어느때나/, 'either before or after a meal'],
  [/공복에/, 'on an empty stomach'],
];
const WHO = [
  [/^성인\s*/, 'Adults'], [/^15세\s*이하의?\s*어린이는?\s*/, 'Children aged 15 or under'],
];

export function parseUsage(koRaw) {
  let s = (koRaw ?? '').replace(/\s+/g, ' ').trim().replace(/[.。]\s*$/, '');
  if (!s || /[A-Za-z]{5,}/.test(s)) return null;
  let who = null;
  for (const [re, en] of WHO) { const m = s.match(re); if (m) { who = en; s = s.replace(re, ''); break; } }

  // 빈도 · 1회량
  const freq = s.match(/1일\s*(\d+)\s*회/) ?? s.match(/하루\s*(\d+)\s*회/);
  const dose = s.match(/1회\s*(?:당|에)?\s*([\d.]+)\s*(정|캡슐|캅셀|포|스틱|병|앰플|매|환|알|개|스푼|수저|티스푼)/)
    ?? s.match(/1회\s*(?:당|에)?\s*([\d.]+)\s*(g|kg|mg|㎎|ml|mL|㎖|L|cc)/)
    ?? s.match(/^1일\s*([\d.]+)\s*(정|캡슐|캅셀|포|g|ml|mL)/);
  const paren = s.match(/\(\s*([\d.,~\-]+\s*(?:g|kg|mg|㎎|ml|mL|㎖|L|cc))\s*\)/);
  if (!freq && !dose) return null;

  let how = null;
  for (const [re, en] of HOW) { if (re.test(s)) { how = en; break; } }
  let when = null;
  for (const [re, en] of WHEN) { if (re.test(s)) { when = en; break; } }

  // 알 수 없는 잔여 지시가 있으면 번역하지 않는다
  const residue = s
    .replace(/1일\s*\d+\s*회/g, '').replace(/하루\s*\d+\s*회/g, '')
    .replace(/1회\s*(?:당\s*)?[\d.]+\s*[가-힣a-zA-Z㎎㎖]*/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/섭취(?:하십시오|하시기\s*바랍니다|하세요|한다|합니다|해도\s*됩니다|하시오|할\s*것|하십시요)?/g, '')
    .replace(/드십시오|드세요|음용(?:하십시오|한다|함|하세요)?|먹는\s*물에|사용하여|이용하여|동봉된?|저은\s*후|잘\s*저어서|기호에\s*따라|적당량의?/g, '')
    .replace(/[,·、\s\-~()\[\]]+/g, '')
    .replace(/씩|을|를|이|가|은|는|와|과|에|의|로|으로|또는|혹은|및|한|정도|당/g, '');
  for (const [re] of HOW) residue.replace(re, '');
  let r = residue;
  for (const [re] of [...HOW, ...WHEN]) r = r.replace(new RegExp(re.source.replace(/\\s\*/g, ''), 'g'), '');
  r = r.replace(/[가-힣]/g, (ch) => ch);
  if (/[가-힣]{2,}/.test(r)) return null;

  const q = dose ? num(dose[1]) : null;
  const u = dose ? dose[2] : null;
  let doseEn = null;
  if (q && u) doseEn = MEASURE.test(u) ? `${q}${u}` : `${q} ${plural(q, u)}${paren ? ` (${paren[1].replace(/\s/g, '')})` : ''}`;

  if (!doseEn) return null;   // 1회 섭취량이 확정되지 않으면 번역하지 않는다
  const parts = [];
  parts.push(who ? `${who}: take` : 'Take');
  if (doseEn) parts.push(doseEn);
  if (freq) parts.push(`${times(freq[1])} a day`);
  if (when) parts.push(when);
  if (how) parts.push(how);
  const out = parts.join(' ').replace(/\s+/g, ' ').trim();
  return /^(Take|Adults: take|Children[^:]*: take)\s+\S/.test(out) ? `${out}.` : null;
}
