/**
 * 원내 Local Query 의도 판정 — 서버 hospital-drug-surface 의 도메인 어휘를 브라우저에서 최소 재현.
 *
 * WO-O4O-HOSPITAL-DRUG-BROWSER-LOCAL-DATA-CONNECT-V1
 *
 * 서버는 여전히 자체적으로 modality/surface plan 을 판정한다(§10 도메인 어휘는 surface 모듈만 소유).
 * 이 모듈은 **클라이언트에서 원내 데이터셋이 연결돼 있을 때** "이 질문이 원내 Local 을 필요로 하는가"
 * 와 "무엇을 원내에서 찾을 것인가(질의어)"만 판정한다. research(효능 조사) 자체는 서버로 보낸다.
 *
 * 한글은 정규식 리터럴에 넣지 않는다(빌드/이스케이프 안정성) — compact() 로 공백·대소문자를 지운 뒤
 * 문자열 includes 로 토큰을 대조한다. 서버 predicate 규칙과 같은 축을 쓴다.
 */

function compact(s: string): string {
  return (s ?? '').replace(/\s+/g, '').toLowerCase();
}

const HOSPITAL_TOKENS = ['원내'];
const SAME_INGREDIENT_TOKENS = ['동일성분', '같은성분', '성분같은', '동일한성분'];

/** '원내' 언급 — 원내 보유/데이터 Context 질문 신호. */
export function mentionsHospital(message: string): boolean {
  const c = compact(message);
  return HOSPITAL_TOKENS.some((t) => c.includes(t));
}

/** '동일성분/같은성분' 언급 — research(성분 조사) + 원내 결합 신호. */
export function mentionsSameIngredient(message: string): boolean {
  const c = compact(message);
  return SAME_INGREDIENT_TOKENS.some((t) => c.includes(t));
}

/** 원내 데이터셋으로 브라우저에서 답할 수 있는(또는 결합할) 질문인가. */
export function isHospitalLocalQuery(message: string): boolean {
  return mentionsHospital(message) || mentionsSameIngredient(message);
}

/**
 * 원내 조회 성격 — local_only(원내 보유 여부만) vs research_and_local(동일성분 조사+원내 결합).
 * 서버 surface plan 과 같은 우선순위: 동일성분이면 결합, 그 밖의 원내 언급이면 보유 조회.
 */
export function classifyLocalQuery(message: string): 'research_and_local' | 'local_only' | 'none' {
  if (mentionsSameIngredient(message)) return 'research_and_local';
  if (mentionsHospital(message)) return 'local_only';
  return 'none';
}

/** 함량 추출 — 서버 extractStrength 와 같은 규칙(숫자+단위). 한글 무관 → 정규식 허용. */
export function extractStrength(message: string): string | null {
  const m = /(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|iu|%)/i.exec(message);
  if (!m) return null;
  const unit = m[2].toLowerCase() === 'iu' ? 'IU' : m[2].toLowerCase();
  return `${m[1]}${unit}`;
}

/** 질의어에서 걷어낼 조사(뒤에 붙는 것만·긴 것 우선). */
const JOSA = ['으로', '에서', '에게', '이랑', '한테', '까지', '부터', '과', '와', '은', '는', '이', '가', '을', '를', '의', '에', '도', '만', '로', '랑'];

/** 질의어가 아닌 흔한 단어(원내 조회 지시·성분/보유 등 공통 어휘). */
const STOPWORDS = new Set<string>([
  '원내', '원내약', '원내에', '보유', '여부', '확인', '확인해줘', '확인해', '있어', '있나', '있나요', '있는지', '있을까',
  '알려줘', '알려', '조사', '조사해줘', '조사해', '같은', '동일', '동일한', '성분', '성분의', '동일성분', '같은성분',
  '약', '약품', '우리', '저희', '병원', '현황', '재고', '가격', '어때', '주세요', '해주세요', '부탁해', '부탁', '좀', '해줘',
]);

function stripJosa(token: string): string {
  for (const j of JOSA) {
    if (token.length - j.length >= 2 && token.endsWith(j)) {
      return token.slice(0, token.length - j.length);
    }
  }
  return token;
}

/**
 * 원내에서 찾을 후보 질의어. 따옴표 구절 우선, 그 뒤 토큰 단위로 조사·불용어 제거.
 * 예: "우리 원내에 아세트아미노펜 있어?" → ['아세트아미노펜'];
 *     "타이레놀정과 같은 성분의 원내약 있어?" → ['타이레놀정'].
 */
export function extractQueryTerms(message: string): string[] {
  const terms: string[] = [];

  const quoted = /["'“”‘’]([^"'“”‘’]{1,80})["'“”‘’]/.exec(message);
  if (quoted && quoted[1].trim()) terms.push(quoted[1].trim());

  const cleaned = message.replace(/["'“”‘’]/g, ' ').replace(/[?!.,·]/g, ' ');
  for (const raw of cleaned.split(/\s+/)) {
    const token = raw.trim();
    if (!token) continue;
    if (STOPWORDS.has(token)) continue;
    const stripped = stripJosa(token);
    if (!stripped || stripped.length < 2) continue;
    if (STOPWORDS.has(stripped)) continue;
    terms.push(stripped);
  }

  return [...new Set(terms)];
}
