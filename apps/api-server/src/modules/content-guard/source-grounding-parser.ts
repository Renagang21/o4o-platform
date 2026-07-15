/**
 * 공식 원문 → grounding 구조화 파서 (PURE, DB/AI 무관)
 *
 * WO-O4O-HFF-DESCRIPTION-PROBIOTICS-ADDITIONAL-VALIDATION-BATCH-V1
 *
 * ## 왜 별도 모듈인가
 *
 * 지금까지 `GuardProductInput.grounding` 은 **사람이 손으로** 채웠다. 30건 표본 선정 과정에서
 * 그 손파싱을 자동화하려다 파서 결손 4건이 드러났고, 모두 **수치 오류로 직결**됐다.
 *
 * ## 핵심 원칙 — 파싱 실패 ≠ 원문 부재
 *
 * 이것이 이 모듈의 존재 이유다. 둘을 같은 `null` 로 뭉개면
 * **실패유형 ①(부재를 허용으로)이 파서 자신에게 적용된다**:
 *   원문에 "표시량 100억 CFU/310㎎" 이 **있는데** 전각 ㎎ 때문에 못 읽고 → null →
 *   "원문에 기준량이 없음" 으로 단정 → 작성자는 "근거 없음" 을 전제로 글을 쓴다.
 * 따라서 결과는 4가지로 **구분**한다:
 *
 *   PARSED       정상 파싱 + 타당성 통과       → 작성 가능
 *   ABSENT       원문이 실제로 진술하지 않음   → 파생 수치 생성 금지 (근거 부재)
 *   PARSE_FAILED 표기는 있는데 못 읽음         → **값 없음으로 단정 금지** · 원문 수동 확인
 *   ABNORMAL     원문 형식 자체가 비정상       → REVIEW_REQUIRED / HOLD
 *
 * ## 잠근 실측 결손 4건 (수정 전 상태로 초안 생성 금지)
 *
 *   1. 소수점 억 미지원   `150,000,000(1.5억)` → `5억` 오독 (3.3배)      — 청인 해우
 *   2. `1포(2.5g)` 기준량 미인식 → 근거 있는데 "확정 불가"              — 더트리플 2건
 *   3. 전각 `㎎` 뒤 `\b` 미성립 → 기준량 파싱 실패 15건                 — 장당당 등
 *   4. 원문 오타의 **조용한 오파싱** `10.000,000,000` → `0`            — 100억 프로바이오틱스 플러스+
 */

// ─── 결과 타입 ───────────────────────────────────────────────────────────────

export type ParseOutcome<T> =
  | { kind: 'PARSED'; value: T; evidence: string }
  | { kind: 'ABSENT'; reason: string }
  | { kind: 'PARSE_FAILED'; reason: string; raw: string }
  | { kind: 'ABNORMAL'; reason: string; raw: string };

export interface ParsedBasis {
  /** 표시 기준량 수치 */
  amount: number;
  /** 'mg' | 'g' */
  unit: 'mg' | 'g';
}

export interface ParsedServing {
  unitsPerServing: number | null;
  unitType: string | null;
  /** 1회 섭취 **총 중량** (원문 괄호 표기가 있을 때만) */
  servingTotal: number | null;
  servingTotalUnit: 'mg' | 'g' | null;
  servingsPerDay: number | null;
  servingsPerDayMax: number | null;
}

/** CFU 타당성 범위 — 프로바이오틱스 표시량으로 현실적인 하한/상한 */
const CFU_MIN = 1e6;
const CFU_MAX = 1e13;

// ─── 정규화 ──────────────────────────────────────────────────────────────────

/**
 * 전각 → 반각. 원문에 `／２g`, `（`, `：` 같은 전각 표기가 **실재**한다(락토비긴).
 * 정규화하지 않으면 근거가 있는데도 파싱에 실패한다.
 */
export function normalizeSource(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[／]/g, '/')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[：]/g, ':')
    .replace(/㎎/g, 'mg')
    .replace(/\s+/g, ' ')
    .trim();
}

const num = (s: string): number => parseFloat(s.replace(/,/g, ''));

/** 숫자 표기가 비정상인가 — `10.000,000,000` 처럼 소수점과 천단위가 뒤섞인 원문 오타 */
function isMalformedNumber(raw: string): boolean {
  if (!/[.]/.test(raw) || !/,/.test(raw)) return false;
  // 정상: "1,234.5" (콤마가 점보다 앞) / 비정상: "10.000,000,000" (점 뒤에 콤마 그룹)
  return raw.indexOf('.') < raw.lastIndexOf(',');
}

// ─── CFU ─────────────────────────────────────────────────────────────────────

/**
 * 표시 CFU 파싱.
 * 원문은 같은 값을 **두 가지로 병기**하는 일이 많다: `10,000,000,000(100억)`.
 * 둘 다 읽어 **교차 검증**한다 — 불일치하면 원문 자체가 모순이므로 조용히 하나를 고르지 않는다.
 */
export function parseCfu(baseStandard: string): ParseOutcome<number> {
  const b = normalizeSource(baseStandard);
  if (!/프로바이오틱스|표시량|CFU|cfu/.test(b)) return { kind: 'ABSENT', reason: '원문에 표시량·CFU 표기 없음' };

  // 원문 오타 탐지 우선 — 조용한 오파싱 차단 (결손 #4)
  const malformed = b.match(/[\d][\d.,]*[\d]/g)?.find((t) => isMalformedNumber(t));
  if (malformed) {
    return { kind: 'ABNORMAL', reason: `숫자 표기가 비정상입니다("${malformed}") — 소수점·천단위 구분자 혼용`, raw: b.slice(0, 120) };
  }

  // ⚠️ [\d,]+ 로는 "1.5억" 에서 "5억" 만 잡혀 3.3배 오차 (결손 #1)
  const koM = b.match(/([\d,.]+)\s*억/);
  const rawM = b.match(/([\d][\d,]{6,})\s*(?:\([^)]*\)\s*)?(?:CFU|cfu)/);
  const sciM = b.match(/([\d.]+)\s*[*×xX]\s*10\s*\^?\s*(\d+)/);

  const koVal = koM ? num(koM[1]) * 1e8 : null;
  const rawVal = rawM ? num(rawM[1]) : null;
  const sciVal = sciM ? parseFloat(sciM[1]) * Math.pow(10, parseInt(sciM[2], 10)) : null;

  const candidates = [koVal, rawVal, sciVal].filter((v): v is number => v != null && Number.isFinite(v));
  if (candidates.length === 0) {
    // 한글 수사("백억") 등 — 표기는 있으나 읽지 못함. **부재로 단정하지 않는다**.
    if (/억|CFU|cfu/.test(b)) {
      return { kind: 'PARSE_FAILED', reason: '표시량 표기는 있으나 수치를 읽지 못했습니다(한글 수사 등)', raw: b.slice(0, 120) };
    }
    return { kind: 'ABSENT', reason: '원문에 표시량 수치 없음' };
  }

  // 병기된 두 표기가 어긋나면 원문 모순 → 사람 확인
  const uniq = [...new Set(candidates)];
  if (uniq.length > 1) {
    return {
      kind: 'ABNORMAL',
      reason: `원문에 병기된 표시량이 서로 다릅니다(${uniq.map((v) => v.toExponential()).join(' vs ')})`,
      raw: b.slice(0, 120),
    };
  }

  const value = uniq[0];
  if (value < CFU_MIN || value > CFU_MAX) {
    return { kind: 'ABNORMAL', reason: `표시량이 타당 범위를 벗어납니다(${value.toExponential()})`, raw: b.slice(0, 120) };
  }
  return { kind: 'PARSED', value, evidence: (koM ?? rawM ?? sciM)![0] };
}

// ─── 기준량 ──────────────────────────────────────────────────────────────────

/**
 * 표시 기준량 파싱. 실측 형태:
 *   `/340 mg`  `/310㎎`(전각, 결손 #3)  `/g`(= 1g)  `/1포(2.5g)`(결손 #2)  `/2,000mg`
 */
export function parseBasis(baseStandard: string): ParseOutcome<ParsedBasis> {
  const b = normalizeSource(baseStandard);
  if (!/[/]/.test(b)) {
    return /표시량/.test(b)
      ? { kind: 'ABSENT', reason: '원문에 표시 기준량(분모) 표기 없음' }
      : { kind: 'ABSENT', reason: '원문에 표시량 표기 없음' };
  }

  // 기준량이 "1포(2.5g)" 형태 — 못 읽으면 근거가 **있는데** "확정 불가" 오분류 (결손 #2)
  const viaUnit = b.match(/[/]\s*\d*\s*(?:포|스틱|캡슐|캅셀|정)\s*\(\s*([\d,.]+)\s*(mg|g)\s*\)/i);
  if (viaUnit) return { kind: 'PARSED', value: { amount: num(viaUnit[1]), unit: viaUnit[2].toLowerCase() as 'mg' | 'g' }, evidence: viaUnit[0] };

  // `\b` 는 전각 ㎎ 뒤에서 성립하지 않는다 → normalizeSource 로 mg 화 + 부정선행 (결손 #3)
  const m = b.match(/[/]\s*([\d,.]+)?\s*(mg|g)(?![a-zA-Z가-힣])/i);
  if (!m) return { kind: 'PARSE_FAILED', reason: '기준량 분모를 읽지 못했습니다', raw: b.slice(0, 120) };

  if (m[1] && isMalformedNumber(m[1])) {
    return { kind: 'ABNORMAL', reason: `기준량 숫자 표기가 비정상입니다("${m[1]}")`, raw: b.slice(0, 120) };
  }
  const amount = m[1] ? num(m[1]) : 1; // "cfu/g" → 1g 기준
  if (!(amount > 0)) return { kind: 'ABNORMAL', reason: `기준량이 0 이하입니다(${amount})`, raw: b.slice(0, 120) };
  return { kind: 'PARSED', value: { amount, unit: m[2].toLowerCase() as 'mg' | 'g' }, evidence: m[0] };
}

// ─── 섭취 ────────────────────────────────────────────────────────────────────

export function parseServing(srvUse: string): ParseOutcome<ParsedServing> {
  const s = normalizeSource(srvUse);
  if (!s) return { kind: 'ABSENT', reason: 'SRV_USE 없음' };

  const units = s.match(/1회\s*([\d]+)\s*(캡슐|캅셀|정|포|스틱|병)/);
  // 1회 총 중량은 **원문 괄호/당 표기**가 있을 때만 (추정 금지)
  const uw =
    s.match(/1회\s*[\d]+\s*(?:캡슐|캅셀|정|포|스틱)\s*\(\s*([\d,.]+)\s*(mg|g|그램)\s*\)/) ||
    s.match(/(?:캡슐|캅셀|정|포|스틱)\s*당\s*([\d,.]+)\s*(mg|g|그램)/) ||
    s.match(/1\s*(?:캡슐|캅셀|정|포|스틱)\s*\(\s*([\d,.]+)\s*(mg|g|그램)\s*\)/);
  const pd = s.match(/1일\s*([\d]+)\s*[~-]\s*([\d]+)\s*회/) || s.match(/1일\s*([\d]+)\s*회/);

  const value: ParsedServing = {
    unitsPerServing: units ? parseInt(units[1], 10) : null,
    unitType: units ? units[2] : null,
    servingTotal: uw ? num(uw[1]) : null,
    servingTotalUnit: uw ? ((uw[2] === '그램' ? 'g' : uw[2].toLowerCase()) as 'mg' | 'g') : null,
    servingsPerDay: pd ? parseInt(pd[1], 10) : null,
    servingsPerDayMax: pd && pd[2] ? parseInt(pd[2], 10) : null,
  };
  if (value.unitsPerServing == null && value.servingsPerDay == null) {
    return { kind: 'PARSE_FAILED', reason: '섭취 단위·횟수를 읽지 못했습니다', raw: s.slice(0, 120) };
  }
  return { kind: 'PARSED', value, evidence: s.slice(0, 90) };
}

// ─── 벌크 원료 판정 ──────────────────────────────────────────────────────────

/**
 * 벌크 원료 판정.
 * 문구 블랙리스트만으로는 샌다 — 실측: `17종혼합유산균알파-5000` 의 SRV_USE 는
 * `건강기능식품 제조 시 일일 섭취량에 적합한 양을 사용` 이라 `원료로 사용` 필터를 피했다.
 * 판정은 **소비자용 1일 섭취법의 성립 여부**로 한다.
 */
export function isBulkMaterial(srvUse: string): { bulk: boolean; reason: string } {
  const s = normalizeSource(srvUse);
  const hint = s.match(/제조\s*시|원료로|적합한\s*양|적당량/);
  if (hint) return { bulk: true, reason: `원료용 문구: "${hint[0]}"` };
  if (!/1일\s*\d+\s*[~-]?\s*\d*\s*회|성인\s*:/.test(s)) {
    return { bulk: true, reason: '소비자용 1일 섭취법(1일 N회)이 성립하지 않음' };
  }
  return { bulk: false, reason: '소비자 완제품(1일 섭취법 성립)' };
}

// ─── 교차 검증 ───────────────────────────────────────────────────────────────

/**
 * 손으로 채운 grounding 값이 **원문 파싱 결과와 일치하는가**.
 * 불일치 = 원문 숫자와 다른 값을 쓰고 있다는 뜻 → 호출측에서 BLOCKED 로 처리한다.
 */
export function crossCheckNumber(
  label: string,
  declared: number | null | undefined,
  parsed: ParseOutcome<number>,
): { ok: boolean; status: 'MATCH' | 'MISMATCH' | 'UNVERIFIABLE' | 'NOT_DECLARED'; message: string } {
  // `undefined` = 입력을 **제공하지 않음**(아직 채우지 않은 선택 필드).
  // `null`      = 작성자가 **"원문에 없다"고 단언**함.
  // 둘을 뭉치면 미제공을 위반으로 오판해 가드가 값 채우기를 강요하게 된다(= 작성 도구화).
  if (declared === undefined) {
    return {
      ok: true,
      status: 'NOT_DECLARED',
      message:
        parsed.kind === 'PARSED'
          ? `${label}: 입력 미제공. 원문 파싱값 = ${parsed.value.toExponential()} (${parsed.evidence})`
          : `${label}: 입력 미제공. 원문 판정 = ${parsed.kind}`,
    };
  }
  if (parsed.kind === 'PARSED') {
    if (declared == null) {
      return { ok: false, status: 'MISMATCH', message: `${label}: 원문은 ${parsed.value.toExponential()} 를 진술하는데 "없음"으로 단언했습니다.` };
    }
    if (Math.abs(declared - parsed.value) > Math.max(1, parsed.value * 1e-9)) {
      return { ok: false, status: 'MISMATCH', message: `${label}: 입력 ${declared.toExponential()} ≠ 원문 ${parsed.value.toExponential()}` };
    }
    return { ok: true, status: 'MATCH', message: `${label}: 원문과 일치 (${parsed.evidence})` };
  }
  if (parsed.kind === 'ABSENT') {
    return declared == null
      ? { ok: true, status: 'MATCH', message: `${label}: 원문에 없음 — 입력도 비어 있음(정합)` }
      : { ok: false, status: 'MISMATCH', message: `${label}: 원문에 없는데 입력 ${declared} 가 있습니다(근거 없는 값).` };
  }
  // PARSE_FAILED / ABNORMAL — **값 없음으로 단정하지 않는다**
  return {
    ok: false,
    status: 'UNVERIFIABLE',
    message: `${label}: ${parsed.reason} → 원문 수동 확인 필요(값 없음으로 단정 금지).`,
  };
}
