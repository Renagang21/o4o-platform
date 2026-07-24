/**
 * 원문 파서 회귀 테스트 — 30건 배치 작성 **전**에 결손을 잠근다.
 * 모든 fixture 는 프로덕션 `product_candidates.raw_payload->source` 의 **실제 원문**이다.
 */
import {
  parseCfu, parseBasis, parseServing, isBulkMaterial, crossCheckNumber, normalizeSource,
} from '../source-grounding-parser.js';

// 실측 원문 (MFDS HtfsInfoService03)
const SRC = {
  // 결손 #1 — 소수점 억
  cheonginHaewoo: '① 성상 : 고유의 향미가 있고 이미·이취가 없는 황갈색의 환 ② 프로바이오틱스 수 : 표시량 150,000,000(1.5억)CFU/15g 이상 ③ 대장균군 : 음성',
  // 결손 #2 — 기준량이 "1포(2.5g)"
  theTriple: '1. 성상 : 이미, 이취가 없는 흰노란색 또는 황갈색의 분말 2. 프로바이오틱스 수 : 표시량[1,000,000,000 cfu/1포(2.5g)] 이상 3. 대장균군 : 음성',
  // 결손 #3 — 전각 ㎎
  jangdangdang: '프로바이오틱스 수 : 표시량(10,000,000,000(100억) CFU/310㎎) 이상 3.대장균군 : 음성',
  // 결손 #4 — 원문 오타의 조용한 오파싱
  typo: '프로바이오틱스 수 : 표시량(10.000,000,000 CFU/230㎎) 이상 3. 대장균군: 음성',
  // 전각 숫자
  lactobegin: '프로바이오틱스수 : 표시량 [100,000,000 CFU/２g]의이상 3. 대장균군：음성',
  // 과학적 표기
  sci: '프로바이오틱스 수 :표시량(1*10^8 CFU/2,000mg)이상',
  // 기준량 분모가 단위만 (= 1g)
  perGram: '(2) 프로바이오틱스 수 : 표시량(100000000 cfu/g) 이상 (3) 대장균군 : 음성',
  // 한글 수사 + 숫자 병기 — 숫자가 읽히므로 정상 파싱된다(백억 = 1e10 과 정합)
  hangeulWithDigits: '프로바이오틱스 수: 표시량(10,000,000,000(백억)CFU/g) 이상',
  // 한글 수사만 — 표기는 있으나 수치를 읽을 수 없다
  hangeulOnly: '프로바이오틱스 수: 표시량(백억 CFU/g) 이상',
  // 기준량이 슬래시가 아니라 "N g 당" 으로 붙는 표기 (CP2 실측: 프로바이오텍)
  viaDang: '1) 성상 : 고유의 향미가 있고 이미·이취가 없는 연한 분홍색의 분말 2) 프로바이오틱스 수(2 g 당) : 표시량 이상 ( 표시량 : 215,000,000(2.15억) CFU ) 3) 대장균군 : 음성',
  // 표시량만 있고 수치 없음 = 진짜 부재
  noNumber: '프로바이오틱스 수 : 표시량 이상 (3) 대장균군 : 음성',
  normal: '프로바이오틱스 수 : 표시량 (100억 CFU/340 mg) 이상',
};
const SRV = {
  antibio: '성인 : 1일 3회, 1회 2포 (2그램), 소아 : 1일 2회, 1회 1포 (1그램)',
  simple: '1일 1회, 1회 1캡슐(350mg)을 물과 함께 섭취하십시오.',
  noWeight: '1일 1회, 1회 1캡슐을 물과 함께 섭취하십시오.',
  bulkExplicit: '건강기능식품 또는 일반식품의 원료로 적당량 사용한다.',
  bulkSneaky: '① 건강기능식품 제조 시 일일 섭취량에 적합한 양을 사용',
};

describe('정규화', () => {
  it('전각 숫자·기호·㎎ 를 반각화', () => {
    expect(normalizeSource('／２g（100㎎）：')).toBe('/2g(100mg):');
  });
});

// ═══ 잠근 결손 4건 ═════════════════════════════════════════════════════════

describe('결손 #1 — 소수점 억 오독 (1.5억 → 5억, 3.3배)', () => {
  it('1.5억을 1.5e8 로 읽는다', () => {
    const r = parseCfu(SRC.cheonginHaewoo);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toBe(1.5e8);
    expect(r.value).not.toBe(5e8); // 과거 오독값
  });
});

describe('결손 #2 — 기준량 "1포(2.5g)" 미인식', () => {
  it('근거가 있으므로 ABSENT 가 아니라 PARSED', () => {
    const r = parseBasis(SRC.theTriple);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 2.5, unit: 'g' });
  });
});

describe('결손 #3 — 전각 ㎎ 뒤 경계 실패', () => {
  it('310㎎ 를 기준량으로 읽는다', () => {
    const r = parseBasis(SRC.jangdangdang);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 310, unit: 'mg' });
  });
  it('전각 숫자 ２g 도 읽는다', () => {
    const r = parseBasis(SRC.lactobegin);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 2, unit: 'g' });
  });
});

// CP2 실측 — "다른 표기법"을 "원문에 없음"으로 단정하면 실패유형 ①이 파서에서 재현된다.
describe('결손 #6 — 기준량이 "N g 당" 형태일 때 ABSENT 오판', () => {
  it('"프로바이오틱스 수(2 g 당)" 의 기준량을 읽는다 — ABSENT 아님', () => {
    const r = parseBasis(SRC.viaDang);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 2, unit: 'g' });
  });

  it('같은 원문의 소수점 억(2.15억)도 정확히 읽는다', () => {
    const r = parseCfu(SRC.viaDang);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toBe(2.15e8);
  });

  it('표시량은 있는데 중량 표기도 있고 연결만 실패하면 PARSE_FAILED (ABSENT 아님)', () => {
    const r = parseBasis('프로바이오틱스 수 : 표시량 이상, 내용량 500 mg 포장');
    expect(r.kind).toBe('PARSE_FAILED');
  });

  it('표시량만 있고 중량 토큰이 아예 없으면 ABSENT (진짜 부재)', () => {
    expect(parseBasis(SRC.noNumber).kind).toBe('ABSENT');
  });
});

// 결손 #7 (2026-07-17) — 단위 라벨 괄호 "수(CFU/mg)" 오독 → 정상 제품 false-block
describe('결손 #7 — 단위 라벨 "(CFU/mg)" 를 기준량으로 오독', () => {
  it('검출: "수(CFU/mg) : 표시량(… CFU/300 mg)" 은 라벨이 아니라 실제 300mg 을 읽는다', () => {
    const r = parseBasis('프로바이오틱스 수(CFU/mg) : 표시량(500,000,000 CFU/300 mg) 이상');
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 300, unit: 'mg' }); // 라벨 오독이면 1mg 이 나온다
  });
  it('검출: "수(CFU/g) : 표시량(… CFU/2 g)" 도 라벨 아닌 2g', () => {
    const r = parseBasis('프로바이오틱스 수(CFU/g) : 표시량(1,000,000,000 (10억) CFU/2 g) 이상');
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 2, unit: 'g' });
  });
  it('보존: 무괄호 벌크 "CFU/g" 는 여전히 1g 기준(per-gram)', () => {
    const r = parseBasis('프로바이오틱스 : 5,000,000,000 CFU/g');
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 1, unit: 'g' });
  });
  it('보존: 정상 "표시량(100억 CFU / 350mg)" 은 350mg 그대로', () => {
    const r = parseBasis('프로바이오틱스 수 : 표시량(100억 CFU / 350mg) 이상');
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 350, unit: 'mg' });
  });
});

describe('결손 #4 — 원문 오타의 조용한 오파싱', () => {
  it('"10.000,000,000" 을 0 으로 읽지 않고 ABNORMAL 로 올린다', () => {
    const r = parseCfu(SRC.typo);
    expect(r.kind).toBe('ABNORMAL');
    if (r.kind !== 'ABNORMAL') return;
    expect(r.reason).toMatch(/비정상/);
  });
});

// ═══ 파싱 실패 ≠ 원문 부재 ═════════════════════════════════════════════════

describe('파싱 실패를 부재로 단정하지 않는다 (핵심 원칙)', () => {
  it('한글 수사만 있고 숫자가 없으면 PARSE_FAILED — ABSENT 아님', () => {
    const r = parseCfu(SRC.hangeulOnly);
    expect(r.kind).toBe('PARSE_FAILED');
  });
  it('숫자 + 한글 수사 병기는 정상 파싱 (백억 = 1e10)', () => {
    const r = parseCfu(SRC.hangeulWithDigits);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toBe(1e10);
  });
  it('표시량 표기 자체가 없으면 ABSENT', () => {
    const r = parseCfu(SRC.noNumber);
    expect(r.kind).toBe('ABSENT');
  });
  it('crossCheck: PARSE_FAILED 는 UNVERIFIABLE (값 없음으로 단정 금지)', () => {
    const c = crossCheckNumber('표시량', null, parseCfu(SRC.hangeulOnly));
    expect(c.status).toBe('UNVERIFIABLE');
    expect(c.ok).toBe(false);
    expect(c.message).toMatch(/단정 금지/);
  });
  it('crossCheck: 진짜 ABSENT + 입력 없음 = 정합', () => {
    expect(crossCheckNumber('표시량', null, parseCfu(SRC.noNumber)).status).toBe('MATCH');
  });

  // 100건 CP1 실측 — "100억 프로바이오틱스 플러스+" (10.000,000,000 CFU/230㎎)
  // 입력을 **비워 두는 것만으로** ABNORMAL 이 조용히 묻히면 안 된다.
  it('ABNORMAL 은 입력 미제공(undefined)이어도 조용히 통과하지 않는다', () => {
    const r = crossCheckNumber('표시량', undefined, parseCfu(SRC.typo));
    expect(r.status).toBe('UNVERIFIABLE');
    expect(r.ok).toBe(false);
  });

  it('PARSE_FAILED 도 입력 미제공이어도 조용히 통과하지 않는다', () => {
    const r = crossCheckNumber('표시량', undefined, parseCfu(SRC.hangeulOnly));
    expect(r.status).toBe('UNVERIFIABLE');
  });

  it('정상 원문 + 입력 미제공은 NOT_DECLARED (위반 아님)', () => {
    const r = crossCheckNumber('표시량', undefined, parseCfu(SRC.normal));
    expect(r.status).toBe('NOT_DECLARED');
    expect(r.ok).toBe(true);
  });
});

// ═══ 교차 검증 ═════════════════════════════════════════════════════════════

describe('원문 병기 교차 검증', () => {
  it('"10,000,000,000(100억)" 처럼 일치하면 PARSED', () => {
    const r = parseCfu(SRC.jangdangdang);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toBe(1e10);
  });
  it('병기된 값이 서로 다르면 ABNORMAL (조용히 하나 고르지 않음)', () => {
    const r = parseCfu('프로바이오틱스 수 : 표시량(1,000,000,000(100억) CFU/340 mg) 이상');
    expect(r.kind).toBe('ABNORMAL');
    if (r.kind !== 'ABNORMAL') return;
    expect(r.reason).toMatch(/서로 다릅니다/);
  });
  it('입력이 원문과 다르면 MISMATCH → 호출측 BLOCKED', () => {
    const c = crossCheckNumber('표시량', 5e8, parseCfu(SRC.cheonginHaewoo)); // 1.5억인데 5억 선언
    expect(c.status).toBe('MISMATCH');
    expect(c.ok).toBe(false);
  });
  it('원문에 없는데 값을 선언하면 MISMATCH', () => {
    const c = crossCheckNumber('표시량', 1e10, parseCfu(SRC.noNumber));
    expect(c.status).toBe('MISMATCH');
    expect(c.message).toMatch(/근거 없는 값/);
  });
});

// ═══ 기타 형식 ═════════════════════════════════════════════════════════════

describe('원문 형식 변형', () => {
  it('과학적 표기 1*10^8', () => {
    const r = parseCfu(SRC.sci);
    expect(r.kind === 'PARSED' && r.value).toBe(1e8);
  });
  it('분모가 단위만이면 1 단위 (cfu/g → 1g)', () => {
    const r = parseBasis(SRC.perGram);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value).toEqual({ amount: 1, unit: 'g' });
  });
  it('일반 형식 100억 CFU/340 mg', () => {
    expect(parseCfu(SRC.normal).kind === 'PARSED' && (parseCfu(SRC.normal) as any).value).toBe(1e10);
    const b = parseBasis(SRC.normal);
    expect(b.kind === 'PARSED' && b.value).toEqual({ amount: 340, unit: 'mg' });
  });
});

describe('섭취 파싱', () => {
  it('성인/소아 별도 용법 — 첫 용법을 읽고 원문을 근거로 남긴다', () => {
    const r = parseServing(SRV.antibio);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value.unitsPerServing).toBe(2);
    expect(r.value.servingTotal).toBe(2);
    expect(r.value.servingTotalUnit).toBe('g');
    expect(r.value.servingsPerDay).toBe(3);
  });
  it('단위중량이 원문에 없으면 servingTotal 은 null (추정 금지)', () => {
    const r = parseServing(SRV.noWeight);
    expect(r.kind).toBe('PARSED');
    if (r.kind !== 'PARSED') return;
    expect(r.value.servingTotal).toBeNull();
    expect(r.value.unitsPerServing).toBe(1);
  });
});

describe('벌크 원료 판정', () => {
  it('명시적 원료 문구', () => {
    expect(isBulkMaterial(SRV.bulkExplicit).bulk).toBe(true);
  });
  it('블랙리스트를 피한 "제조 시 … 적합한 양" 도 잡는다', () => {
    const r = isBulkMaterial(SRV.bulkSneaky);
    expect(r.bulk).toBe(true);
  });
  it('소비자 완제품은 통과', () => {
    expect(isBulkMaterial(SRV.simple).bulk).toBe(false);
    expect(isBulkMaterial(SRV.antibio).bulk).toBe(false);
  });
});

// ── WO-O4O-HFF-LIQUID: 액상 mL 기준량 지원 (parseBasis) ──────────────────────
describe('액상 mL 기준량 (parseBasis mL 확장)', () => {
  it('/100ml (공백 없음) 을 mL 기준량으로 읽는다', () => {
    const r = parseBasis('식이섬유: 4200mg/100ml (표시량의 80% 이상)');
    expect(r.kind).toBe('PARSED');
    if (r.kind === 'PARSED') expect(r.value).toEqual({ amount: 100, unit: 'mL' });
  });
  it('/250 mL (공백) 대문자 L 을 읽는다', () => {
    const r = parseBasis('비타민C : 100 mg / 250 mL (표시량의 80~150%)');
    expect(r.kind).toBe('PARSED');
    if (r.kind === 'PARSED') expect(r.value).toEqual({ amount: 250, unit: 'mL' });
  });
  it('전각 ㎖ 기준량을 읽는다', () => {
    const r = parseBasis('마그네슘 : 표시량(60 mg/50 ㎖)의 90~120%');
    expect(r.kind).toBe('PARSED');
    if (r.kind === 'PARSED') expect(r.value).toEqual({ amount: 50, unit: 'mL' });
  });
  it('"1병(100mL)" 용기 기준량을 읽는다', () => {
    const r = parseBasis('식이섬유 : 표시량 / 1병(100mL)');
    expect(r.kind).toBe('PARSED');
    if (r.kind === 'PARSED') expect(r.value).toEqual({ amount: 100, unit: 'mL' });
  });
  it('mg/g 기준량은 회귀 불변 (mL 추가가 질량 파싱을 바꾸지 않음)', () => {
    const a = parseBasis('아연 : 표시량(8.5 mg/4,000 mg)의 80~150%');
    const b = parseBasis('칼슘 : 표시량(230 mg/30 g)의 80~150%');
    expect(a.kind === 'PARSED' && a.value).toEqual({ amount: 4000, unit: 'mg' });
    expect(b.kind === 'PARSED' && b.value).toEqual({ amount: 30, unit: 'g' });
  });
});
