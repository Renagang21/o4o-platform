/**
 * WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1 — 공통 파서
 *
 * `Labelled standard` 섹션 슬롯의 순수 파서. DB 접근 없음 — survey/glossary/translate/apply 가
 * **같은 분해 규칙**을 쓰도록 한 곳에 둔다. 분해는 원문 복원이 가능해야 한다
 * (`lead + head + sep + body === inner`, bold 인 경우 태그 포함).
 */
export const HANGUL = /[가-힣]/;
export const SEC = /<h2[^>]*>\s*Labelled standard\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/;
export const SLOT_G = () => /<div class="sd-item"[^>]*>([\s\S]*?)<\/div>/g;
export const SPEC = /<div class="sd-spec"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|$)/;

export const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** 슬롯을 `번호 / 머리 / 구분자 / 몸통` 으로 나눈다. */
export function splitSlot(inner) {
  /* 번호 표기는 종류가 많고 겹쳐 붙는다(`(가) `, `⑴ `, `1-1) `, `2, `, `* `).
     `\d+,` 는 `1,000` 을 번호로 오인할 수 있으므로 **뒤에 공백이 있을 때만** 번호로 본다. */
  const num = /^(?:\s*(?:[①-⑳㉑-㉟⓵-⓾ⅰ-ⅹ⑴-⒇ⓛⓐ-ⓩ]|[ㆍ・]|\(\s*[\d가나다라마바사아자차]\s*\)|\d+\s*[-‐]\s*\d+\)|\d+\)|\d+\.(?!\d)|\d+,(?=\s)|[-·•*])\s*)+/.exec(inner);
  const lead = num ? num[0] : '';
  const rest = inner.slice(lead.length);
  const b = /^<b>([\s\S]*?)<\/b>(\s*)([\s\S]*)$/.exec(rest);
  if (b) return { lead, bold: true, head: b[1], sep: b[2], body: b[3] };
  const k = /^([^:：]{1,40}?)(\s*[:：]\s*)([\s\S]*)$/.exec(rest);
  if (k) return { lead, bold: false, head: k[1], sep: k[2], body: k[3] };
  return { lead, bold: false, head: '', sep: '', body: rest };
}

/** 분해한 조각으로 슬롯을 다시 만든다. 번역 결과를 끼워 넣을 때 쓴다. */
export function joinSlot(p, head = p.head, body = p.body) {
  return p.lead + (p.bold ? `<b>${head}</b>` : head) + p.sep + body;
}

/** 몸통의 문법 형태. 숫자는 형태 판정에 쓰지 않는다. */
export function bodyShape(body) {
  const t = norm(body);
  if (!HANGUL.test(t)) return 'NO_RESIDUE';
  if (/표시량\s*[(（]/.test(t) && /%/.test(t)) return 'SPEC_RANGE_PAREN';
  if (/표시량의/.test(t) && /%/.test(t)) return 'SPEC_RANGE_TRAIL';
  if (/^[\d.,\s]*(이하|이상|미만|초과)\.?$/.test(t)) return 'LIMIT';
  if (/^음성\.?$/.test(t)) return 'NEGATIVE';
  if (/개월|년|유통기한|제조일/.test(t) && t.length < 40) return 'SHELF';
  if (/보관|직사광선|서늘한|습기|밀봉|냉장|냉동|실온/.test(t)) return 'STORAGE';
  if (/이미|이취|색|정제|캡슐|분말|과립|액상|환|젤리|필름|고유의/.test(t)) return 'APPEARANCE';
  return 'OTHER';
}

/**
 * `sd-spec` 안의 슬롯 문자열 목록. KO↔EN 정렬 수확에 쓴다.
 *
 * 정규식으로 `sd-spec` 블록을 떼어내면 **중첩 div 때문에 마지막 슬롯이 잘린다**
 * (비탐욕 `</div>` 가 안쪽 슬롯의 닫는 태그에 걸린다). 여는/닫는 태그를 세어
 * 블록의 끝을 정확히 찾는다.
 */
export function specSlots(html) {
  const s = String(html ?? '');
  const open = /<div class="sd-spec"[^>]*>/.exec(s);
  if (!open) return [];
  let i = open.index + open[0].length, depth = 1;
  const TAG = /<div\b[^>]*>|<\/div>/g;
  TAG.lastIndex = i;
  let mm, end = s.length;
  while ((mm = TAG.exec(s))) {
    depth += mm[0] === '</div>' ? -1 : 1;
    if (depth === 0) { end = mm.index; break; }
  }
  return [...s.slice(i, end).matchAll(SLOT_G())].map((x) => x[1]);
}

/* ── 수치 보존 판정 (apply·verify 공용) ───────────────────────────
 * 규칙상 수치가 **문자로 바뀌는** 경우만 예외로 허용하고 그 밖의 손실은 결함으로 본다.
 * 두 곳이 서로 다른 기준을 쓰면 apply 가 통과시킨 것을 verify 가 결함으로 세게 되므로
 * 판정은 반드시 한 함수에서만 정의한다.
 *   - `억` 환산: `2,000억` → `200 billion` (엔진이 본문 수치와 대조해 통과시킨 것만 존재)
 *   - 큰 수를 영어 단어로 푼 경우: `100,000,000` → `100 million`
 *   - 지수 표기: `1.0 x 10^9` → `1 billion`
 *   - `1mL당` → `per mL`, `제1액/제2액` → `first/second fluid`
 */
export const numsOf = (s) => (String(s).match(/\d[\d.,]*/g) ?? []).map((x) => x.replace(/[.,]+$/, '').replace(/,/g, ''));

const spelledForms = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return [];
  const out = [];
  for (const [d, w] of [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']]) {
    if (n >= d) out.push(`${+(n / d).toPrecision(12)} ${w}`);
    if (n * 1e8 >= d) out.push(`${+(n * 1e8 / d).toPrecision(12)} ${w}`);  // 억 단위 표기
  }
  return out;
};

export function numericLoss(ko, en) {
  const have = new Set(numsOf(en));
  const missing = [...new Set(numsOf(ko))].filter((x) => !have.has(x));
  if (!missing.length) return null;
  const allow = new Set();
  if (/1\s*(mL|ml|㎖|g|㎏|kg|L)\s*당|\/\s*1\s*(mL|ml|㎖|g)/.test(ko)) allow.add('1');
  if (/제?\s*1\s*액/.test(ko)) { allow.add('1'); allow.add('2'); }
  /* 지수 표기의 밑·지수(`1.0 x 10^9` 의 10, 9)는 단어로 풀리면 사라진다 */
  /* 곱셈 기호는 원문마다 다르다 — `x` `X` `×` `*` 를 모두 받는다. */
  const expo = /[\d.]+\s*[xX×*]\s*10\s*\^?\s*\d+/.test(ko);
  const rest = missing.filter((x) => {
    if (allow.has(x)) return false;
    if (spelledForms(x).some((w) => en.includes(w))) return false;
    if (expo && (x === '10' || Number(x) < 100)) return false;
    return true;
  });
  return rest.length ? rest : null;
}
