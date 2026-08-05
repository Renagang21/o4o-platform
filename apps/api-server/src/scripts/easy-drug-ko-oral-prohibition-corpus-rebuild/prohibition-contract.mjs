/**
 * WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1 — 후보 판정 공용 계약 (read-only)
 *
 * 왜 별도 계약인가
 *   선행 WO(`WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1`, `7ecc1e1a8`)는 저작기의
 *   `NONORAL_REWRITE` 마지막 규칙 `[/내복/g,'사용']` 이 안전 문장을 파손하는 것을 실측했다.
 *     원문   이 약은 외용으로만 사용하고 내복하지 마십시오.
 *     파손본 이 약은 외용으로만 사용하고 사용하지 마십시오.   ← 경구 금지 정보 소실
 *   저작기는 고쳤지만 **그 이전에 저작된 기존 코퍼스**에는 파손 문장이 남아 있다.
 *
 * 후보 판정 원칙 (사용자 확정 실행기준 4·5항)
 *   - `외용으로만 사용하고 사용하지` 같은 **단일 문자열 패턴으로 후보를 한정하지 않는다.**
 *   - `내복·복용·먹지·삼키지` 등 **경구 금지 표현 전 계열**을 제품별 e약은요 원문에서 먼저 찾고,
 *     그 문장의 금지 의미가 LIVE 본문에 살아 있는지를 **원문 대조**로 판정한다.
 *   - 경구 제품의 정당한 "복용하지 마십시오" 는 파손이 아니다. 원문에 있고 본문에도 있으면 정상이다.
 *
 * 판정이 어려운 지점 두 가지 — 둘 다 실측으로 확인하고 분리했다.
 *   (1) 파손은 동사 **삭제**가 아니라 **치환**이다(내복→사용). 원문에서 동사를 지우고 비교하면
 *       본문에는 치환어가 남아 있어 정렬이 깨진다 → **양쪽 동사를 같은 기호로 마스킹**해 정렬한다.
 *   (2) 경구 어휘가 들어간 금지 문장이라고 전부 안전 손실은 아니다.
 *       "복용 중에는 음주하지 마십시오" → "사용 중에는 음주하지 마십시오" 는 금지 대상이 음주이므로
 *       비경구 제품에서는 **정당한 경로 재표현**이다. 금지 대상이 경구 행위 자체인 문장만 안전 손실이다.
 *
 * 이 파일은 조회·계산 전용이며 DB write 를 하지 않는다.
 */
import crypto from 'node:crypto';

export const WO = 'WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1';
export const PRIOR_WO = 'WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1';
export const PRIOR_COMMIT = '7ecc1e1a8';

export const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

// ── 경구 표현 계열 ──────────────────────────────────────────────────────────────
/** 경구 투여를 뜻하는 어휘 전 계열. 저작기 재표현 규칙이 건드리는 대상을 모두 포함한다. */
export const ORAL_TERM_RE = /내복|복용|복약|먹|삼키|삼켜|경구/g;
/**
 * 금지·부정 종결. e약은요 원문에서 실제로 쓰이는 형태만 넣는다(추정 확대 금지).
 * `하지 하십시오` 는 오타가 아니라 **원문 자체의 결손형**이다 — itemSeq 200807607 의 공식 원문이
 * "이 약은 외용으로만 사용하고 내복하지 하십시오." 로 `마` 가 빠져 있다. 이 형태를 넣지 않으면
 * 해당 제품이 후보에서 통째로 빠진다(실측으로 확인).
 */
export const PROHIBIT_RE = /마십시오|마세요|마시오|말 것|말아야|않도록|않습니다|않는다|금지|삼가|안 됩니다|안됩니다|하지 하십시오/;

/**
 * 금지 대상이 **경구 경로 자체**인 문장인가 (= 안전 손실 대상).
 *
 * 문장 전체로 판정하면 오탐이 크다. "이 약에 과민증 환자는 이 약을 복용하지 마십시오" 는
 * 비경구 제품에서 "사용하지 마십시오" 로 재표현돼도 **금기 의미가 그대로 보존**된다 — 파손이 아니다.
 * 파손은 "허용 경로 vs 금지된 경구 경로" 를 대조하는 문장에서만 일어난다.
 *
 * 그래서 금지 종결 **직전 절**(tail window)만 본다.
 *   SAFETY = tail 에 경구 어휘가 있고, 그 tail 이 아래 둘 중 하나를 만족
 *     (a) 비경구 경로 어휘를 함께 담고 있다 → 경로 대조 문장
 *         "외용으로만 사용하고 내복하지 마십시오" / "국소적으로 적용하거나 복용하지 마십시오"
 *     (b) 경구 어휘가 경로 특정어(내복·경구·삼키·먹)다 → 그 자체로 경로 금지
 *         "이 약을 삼키지 않도록 주의하십시오" / "내복용으로 사용하지 마십시오"
 *   복용·복약 단독은 (a) 없이는 인정하지 않는다 — 재표현으로 의미가 보존되기 때문이다.
 */
export const TAIL_WINDOW = 45;
/** 경로 특정 경구 어휘 — 단독으로도 경구 경로를 지시한다. */
export const ROUTE_SPECIFIC_ORAL_RE = /내복|경구|삼키|삼켜|먹/;
/**
 * 비경구 경로 어휘. 경로 대조 문장 판정용.
 * 단음절 부위명(눈·귀·코·질)은 **조사까지 묶어서**만 인정한다 — 맨 글자로 두면
 * "**코**데인", "물**질**" 같은 성분명·일반명사에 걸려 오탐이 난다(실측으로 확인).
 */
export const NON_ORAL_ROUTE_RE = /외용|국소|피부|바르|발라|도포|첩부|패치|점안|점이|안약|눈에|눈 및|안구|귀에|귀 및|외이|코에|코 및|콧속|비강|질에|질 내|질내|질용|직장|관장|좌제|주사|흡입|가글|양치|구강\s*점막/;

export function isSafetyOralProhibition(s) {
  const re = new RegExp(PROHIBIT_RE.source, 'g');
  let m;
  while ((m = re.exec(s)) !== null) {
    const tail = s.slice(Math.max(0, m.index - TAIL_WINDOW), m.index);
    ORAL_TERM_RE.lastIndex = 0;
    if (!ORAL_TERM_RE.test(tail)) continue;
    if (ROUTE_SPECIFIC_ORAL_RE.test(tail) || NON_ORAL_ROUTE_RE.test(tail)) return true;
  }
  return false;
}

/**
 * 문장 분할. e약은요 원문은 `…상의하십시오.때때로 …` 처럼 마침표 뒤 공백이 없는 경우가 많아
 * `(?<=[.!?])(?=\s|$)` 로는 거의 분할되지 않는다 → 절 전체가 한 문장으로 잡힌다.
 * 폭 0 분할이라 join('') 시 원본이 그대로 복원된다. (선행 WO 에서 실측된 함정)
 */
export const splitSentences = (t) => String(t).split(/(?<=[.!?])/);

/** 경구 어휘 + 금지 종결이 함께 있는 문장 (후보 문장 — 안전 손실 여부는 별도 판정). */
export const hasOralAndProhibition = (s) => {
  ORAL_TERM_RE.lastIndex = 0;
  return ORAL_TERM_RE.test(s) && PROHIBIT_RE.test(s);
};

// ── 대조용 정규화 ────────────────────────────────────────────────────────────────
/** 표기 차이(공백·괄호·따옴표·중점)만 제거한다. 어휘는 바꾸지 않는다. */
export const squash = (s) => String(s).normalize('NFC')
  .replace(/[〜～∼]/g, '~').replace(/[ㆍ·․‧∙]/g, '·')
  .replace(/[.,;:()[\]{}'"“”‘’]/g, '').replace(/\s+/g, '').toLowerCase();

/**
 * 투여 행위 동사·명사를 한 기호로 마스킹한다. 경구어와 치환어(사용/적용/도포/점안…)를 같은 값으로
 * 만들어야 "내복하지 → 사용하지" 처럼 **치환된 문장을 원문과 정렬**할 수 있다.
 */
export const VERB_MASK_RE = /내복|복용|복약|먹|삼키|삼켜|경구|사용|적용|도포|점안|점적|투여|투약|주입|바르|발라|뿌리/g;
export const maskVerbs = (sq) => sq.replace(VERB_MASK_RE, '§');

/** HTML → 평문. 태그 제거 + 엔티티 복원만 한다. */
export const htmlToText = (html) => String(html)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|li|div|h[1-6]|tr)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** officialConsumerText → 대조용 원문 전문(6섹션 연결). */
export const octFullText = (oct) => {
  if (!oct) return '';
  return ['efficacy', 'usage', 'warning', 'caution', 'interaction', 'sideEffect']
    .map((k) => (typeof oct[k] === 'string' ? oct[k] : ''))
    .filter(Boolean).join('\n');
};

// ── 문장 판정 ────────────────────────────────────────────────────────────────────
/** 문장에 등장하는 경구 어휘 목록. */
export function oralTermsIn(s) {
  const sq = squash(s);
  const out = new Set();
  for (const t of ['내복', '복용', '복약', '삼키', '삼켜', '경구', '먹']) if (sq.includes(t)) out.add(t);
  return [...out];
}

/**
 * 원문 문장 1개가 LIVE 본문에서 어떻게 됐는지 판정한다.
 *   KEPT      원문 문장이 표기 차이만 두고 그대로 있다.
 *   SUBSTITUTED  동사 마스킹 후에는 일치 → 문장은 살아 있고 **투여 동사만 바뀌었다**.
 *   ABSENT    대응 문장을 찾지 못했다(섹션 미수록일 수 있어 파손으로 단정하지 않는다).
 * SUBSTITUTED 중 경구 어휘가 본문 대응 구간에서 사라진 경우만 경구 정보 소실이다.
 */
export function judgeSentence(officialSentence, bodySquashed, bodyMasked) {
  const sq = squash(officialSentence);
  if (sq.length < 10) return { verdict: 'SKIP_TOO_SHORT' };
  if (bodySquashed.includes(sq)) return { verdict: 'KEPT' };

  const masked = maskVerbs(sq);
  const at = bodyMasked.indexOf(masked);
  if (at < 0) return { verdict: 'ABSENT' };

  // 마스킹 정렬이 성립하면 마스킹 전 본문에서도 같은 위치·같은 길이 구간이 대응 구간이다
  // (maskVerbs 는 길이를 바꾸므로 구간을 직접 잘라 쓰지 않고, 경구 어휘 존재 여부만 본다).
  const bodyTerms = new Set();
  for (const t of ['내복', '복용', '복약', '삼키', '삼켜', '경구', '먹']) if (bodySquashed.includes(t)) bodyTerms.add(t);
  const lost = oralTermsIn(officialSentence).filter((t) => !bodyTerms.has(t));
  return { verdict: 'SUBSTITUTED', lostOralTerms: lost, oralLost: lost.length > 0 };
}

// ── 탐지기 2: 본문 내부 자기모순 ─────────────────────────────────────────────────
/**
 * 원문 대조(탐지기 1)만으로는 **원문 자체가 결손인 제품**을 놓친다. 그래서 원문과 무관하게
 * 본문만 보고 파손을 잡는 탐지기를 하나 더 둔다.
 *
 * 서명 (a) 같은 동사가 **연결어미 직후 바로** 반복되는 자기모순.
 *   "외용으로만 **사용하고 사용하지** 마십시오"  ← 원래는 "…사용하고 **내복**하지 마십시오"
 *   두 동사 사이 간격을 3자 이내로 제한한다. 넓히면
 *   "외용으로만 사용하고 **두피 이외의 부위에는** 사용하지 마십시오" 같은 **정상 원문**까지 걸린다
 *   (부위를 대조하는 문장이라 동사가 같은 게 정상이다 — 실측으로 확인).
 *
 * 서명 (b) 치환이 만들어낸 **비단어 흔적**. 한국어에 없는 형태라 오탐이 사실상 없다.
 *   내복용 → **내사용** / 내복약 → **사용약** / 경구복용 → **경구사용**
 *   원문 결손형 "내복하지 하십시오" → "**사용하지 하십시오**"
 *
 * 동사가 서로 다른 치환(국소적으로 적용하거나 → 사용하지)은 탐지기 1이 잡는다.
 */
export const SELF_CONTRADICTION_RE =
  /(사용|적용|도포|점안|바르)(?:하고|하며|하거나)[,\s]{0,3}\1(?:하)?지\s*(?:마|않|하)/;
export const REWRITE_ARTIFACT_RE = /내사용|사용용|사용약|경구사용|사용하지\s*하십시오/;

export function selfContradictions(bodyHtml) {
  return splitSentences(htmlToText(bodyHtml))
    .map((s) => s.trim())
    .filter((s) => s && (SELF_CONTRADICTION_RE.test(s) || REWRITE_ARTIFACT_RE.test(s)));
}

/** 본문 1건 판정. */
export function judgeBody(officialText, bodyHtml) {
  const bodySquashed = squash(htmlToText(bodyHtml));
  const bodyMasked = maskVerbs(bodySquashed);
  const cand = splitSentences(officialText).map((s) => s.trim()).filter((s) => s && hasOralAndProhibition(s));

  const per = cand.map((s) => {
    const j = judgeSentence(s, bodySquashed, bodyMasked);
    return { sentence: s, safety: isSafetyOralProhibition(s), ...j };
  });
  const safetyLost = per.filter((p) => p.safety && p.verdict === 'SUBSTITUTED' && p.oralLost);
  const benignRewrite = per.filter((p) => !p.safety && p.verdict === 'SUBSTITUTED' && p.oralLost);
  const contradictions = selfContradictions(bodyHtml);
  return {
    nCandidate: cand.length,
    nSafety: per.filter((p) => p.safety).length,
    nKept: per.filter((p) => p.verdict === 'KEPT').length,
    nAbsent: per.filter((p) => p.verdict === 'ABSENT').length,
    nSafetyLost: safetyLost.length,
    nBenignRewrite: benignRewrite.length,
    nSelfContradiction: contradictions.length,
    /** 탐지기 1(원문 대조) 또는 탐지기 2(본문 자기모순) 중 하나라도 걸리면 파손이다. */
    damaged: safetyLost.length > 0 || contradictions.length > 0,
    detectedBy: [safetyLost.length ? 'SOURCE_DIFF' : null, contradictions.length ? 'SELF_CONTRADICTION' : null].filter(Boolean),
    lostSentences: safetyLost.map((p) => p.sentence),
    benignSentences: benignRewrite.map((p) => p.sentence),
    contradictionSentences: contradictions,
  };
}
