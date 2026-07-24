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
  /** 'mg' | 'g' | 'mL'(액상 부피 기준량) */
  unit: 'mg' | 'g' | 'mL';
}

/** 기준량 단위 정규화 — 'ml'/'㎖' → 'mL', 'g' 보존, 그 외 'mg'. (질량 mg/g · 부피 mL) */
function normBasisUnit(u: string): 'mg' | 'g' | 'mL' {
  const x = u.toLowerCase().replace(/\s/g, '');
  if (x === 'ml' || u === '㎖') return 'mL';
  return x === 'g' ? 'g' : 'mg';
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

  // 기준량이 슬래시가 아니라 **"N g 당"** 으로 붙는 표기 (실측: 프로바이오텍
  //   "프로바이오틱스 수(2 g 당) : 표시량 이상 ( 표시량 : 215,000,000(2.15억) CFU )").
  // 이 형태를 못 읽고 ABSENT 를 돌려주면 **"다른 표기법"을 "원문에 없음"으로 단정**하게 된다
  // — 이 모듈이 막으려던 실패유형 ①(부재를 허용으로)이 파서 자신에게 재현되는 것이다.
  // ⚠️ mL 은 viaDang("N mL당")에 넣지 않는다 — "세균수 : 1 mL당 100 이하"(미생물 한도)를
  //    원료 기준량으로 오독한다(액상 실측: 아연 8.5mg/40ml 인데 "1 mL당" 을 40 대신 1 로 파싱 → MISMATCH 오BLOCK).
  //    액상 mL 기준량은 반드시 슬래시형(`/40 ml`·`/1병(100mL)`)으로만 인정한다. 질량 "N g 당"은 기존대로 유지.
  const viaDang = b.match(/([\d,.]+)\s*(mg|g)\s*당/i);
  if (viaDang) {
    return { kind: 'PARSED', value: { amount: num(viaDang[1]), unit: normBasisUnit(viaDang[2]) }, evidence: viaDang[0] };
  }

  if (!/[/]/.test(b)) {
    if (!/표시량/.test(b)) return { kind: 'ABSENT', reason: '원문에 표시량 표기 없음' };
    // 표시량은 있는데 분모를 못 찾았다 → **중량·부피 토큰이 있으면 "못 읽은 것"이지 "없는 것"이 아니다**
    return /[\d,.]+\s*(mg|g|mL|ml|㎖)\b/i.test(b)
      ? { kind: 'PARSE_FAILED', reason: '표시량과 중량/부피 표기는 있으나 기준량으로 연결하지 못했습니다', raw: b.slice(0, 120) }
      : { kind: 'ABSENT', reason: '원문에 표시 기준량(분모) 표기 없음' };
  }

  // 기준량이 "1포(2.5g)" · "1병(100mL)" 형태 — 못 읽으면 근거가 **있는데** "확정 불가" 오분류 (결손 #2)
  const viaUnit = b.match(/[/]\s*\d*\s*(?:포|스틱|캡슐|캅셀|정|병|앰플|파우치|팩)\s*\(\s*([\d,.]+)\s*(mg|g|mL|ml|㎖)\s*\)/i);
  if (viaUnit) return { kind: 'PARSED', value: { amount: num(viaUnit[1]), unit: normBasisUnit(viaUnit[2]) }, evidence: viaUnit[0] };

  // 액상 mL 기준량은 **원료 표시량(값+단위) 바로 뒤의 슬래시**로만 인정한다 (`8.5 mg/40 mL`·`4,200mg/100ml`).
  //   미생물 한도 "세균수 : 100 이하/1mL"(슬래시 앞이 '이하'—단위 아님)를 원료 기준량으로 오독하지 않기 위함이다.
  //   ⚠️ 그래서 아래 numbered/bare 에는 mL 을 넣지 않는다(미생물 `/1mL` 오탐 차단). mL 은 오직 이 매처에서만.
  const mlBasis = b.match(/([\d][\d,.]*)\s*(?:mg|g|μg|mcg|㎍|IU)\s*(?:RAE|RE|α-?TE|NE|DFE)?\s*[/]\s*([\d][\d,.]*)\s*(mL|ml|㎖)(?![a-zA-Z가-힣])/i);
  if (mlBasis) {
    if (isMalformedNumber(mlBasis[2])) return { kind: 'ABNORMAL', reason: `기준량 숫자 표기가 비정상입니다("${mlBasis[2]}")`, raw: b.slice(0, 120) };
    const amount = num(mlBasis[2]);
    if (!(amount > 0)) return { kind: 'ABNORMAL', reason: `기준량이 0 이하입니다(${amount})`, raw: b.slice(0, 120) };
    return { kind: 'PARSED', value: { amount, unit: 'mL' }, evidence: mlBasis[0] };
  }

  // `\b` 는 전각 ㎎ 뒤에서 성립하지 않는다 → normalizeSource 로 mg 화 + 부정선행 (결손 #3)
  //
  // ⚠️ 결손 #4 (2026-07-17): 단위 라벨 괄호 "수(CFU/mg)" 오독.
  //   원문 "프로바이오틱스 수(CFU/mg) : 표시량(… CFU/300 mg)" 에서 라벨의 "/mg"(숫자 없음)를
  //   기준량 분모로 먼저 잡아 amount=1mg 로 오파싱 → 실제 300mg 으로 수기 grounding 시
  //   PRE-SRC-BASIS-MISMATCH 로 **정상 제품을 오BLOCK**. (실측: 인생 프로바이오틱스 300mg, 코오롱 락토그린 2g)
  //   해소: **숫자 있는 분모("/300 mg")를 우선** 매치하고, 숫자 없는 "CFU/g"(벌크 per-단위)는 폴백으로만.
  const numbered = b.match(/[/]\s*([\d,.]+)\s*(mg|g)(?![a-zA-Z가-힣])/i);
  if (numbered) {
    if (isMalformedNumber(numbered[1])) {
      return { kind: 'ABNORMAL', reason: `기준량 숫자 표기가 비정상입니다("${numbered[1]}")`, raw: b.slice(0, 120) };
    }
    const amount = num(numbered[1]);
    if (!(amount > 0)) return { kind: 'ABNORMAL', reason: `기준량이 0 이하입니다(${amount})`, raw: b.slice(0, 120) };
    return { kind: 'PARSED', value: { amount, unit: normBasisUnit(numbered[2]) }, evidence: numbered[0] };
  }
  // 숫자 없는 "CFU/g"|"CFU/mg" → 1 단위 기준(벌크 per-단위). viaDang/viaUnit/mlBasis/numbered 가 모두 실패한 경우만 도달.
  const bare = b.match(/[/]\s*(mg|g)(?![a-zA-Z가-힣])/i);
  if (!bare) return { kind: 'PARSE_FAILED', reason: '기준량 분모를 읽지 못했습니다', raw: b.slice(0, 120) };
  return { kind: 'PARSED', value: { amount: 1, unit: normBasisUnit(bare[1]) }, evidence: bare[0] };
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
  // ⚠️ **원문 자체의 문제가 최우선**이다.
  //    ABNORMAL(원문 오타·모순) / PARSE_FAILED(표기는 있는데 못 읽음)는 입력을 제공했든 안 했든
  //    반드시 드러나야 한다. 이 검사를 `declared === undefined` 뒤에 두면 입력을 비워 두는 것만으로
  //    **ABNORMAL 이 조용히 묻힌다**(100건 CP1 실측: "10.000,000,000 CFU/230㎎").
  if (parsed.kind === 'ABNORMAL' || parsed.kind === 'PARSE_FAILED') {
    return {
      ok: false,
      status: 'UNVERIFIABLE',
      message: `${label}: ${parsed.reason} → 원문 수동 확인 필요(값 없음으로 단정 금지).`,
    };
  }
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
  // ABNORMAL / PARSE_FAILED 는 **함수 진입부에서 이미 처리**했다(원문 문제 최우선).
  // 여기 도달하면 타입상 남는 분기가 없다 — 컴파일러가 never 로 좁힌다.
  throw new Error(`crossCheckNumber: 처리되지 않은 파싱 결과 (${label})`);
}
